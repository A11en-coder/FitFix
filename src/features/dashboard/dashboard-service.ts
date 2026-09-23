import { EquipmentStatus, FaultSeverity, FaultStatus, Prisma } from "@prisma/client";
import { db } from "../../server/db";
import type { ActiveMembership } from "../auth/role-policy";
import type { DashboardQueryInput } from "./dashboard-schema";

type DbClient = typeof db;

const DEFAULT_RANGE_DAYS = 30;
const MAX_RANGE_DAYS = 90;

export class DashboardRangeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DashboardRangeError";
  }
}

function startOfUtcDay(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function addUtcDays(value: Date, days: number) {
  const result = new Date(value);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function dateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function parseDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function resolveRange(input: DashboardQueryInput) {
  const today = startOfUtcDay(new Date());
  const to = input.to ? parseDate(input.to) : today;
  const from = input.from ? parseDate(input.from) : addUtcDays(to, -(DEFAULT_RANGE_DAYS - 1));
  const toExclusive = addUtcDays(to, 1);
  const rangeDays = Math.floor((toExclusive.getTime() - from.getTime()) / 86_400_000);
  if (from > to)
    throw new DashboardRangeError("The dashboard start date must be before the end date.");
  if (rangeDays > MAX_RANGE_DAYS)
    throw new DashboardRangeError(`Dashboard ranges cannot exceed ${MAX_RANGE_DAYS} days.`);
  return { from, to, toExclusive, fromDate: dateKey(from), toDate: dateKey(to) };
}

function trendForRange(
  range: ReturnType<typeof resolveRange>,
  faults: Array<{ createdAt: Date; resolvedAt: Date | null }>,
) {
  const points = new Map<string, { date: string; opened: number; resolved: number }>();
  for (let date = new Date(range.from); date < range.toExclusive; date = addUtcDays(date, 1)) {
    const key = dateKey(date);
    points.set(key, { date: key, opened: 0, resolved: 0 });
  }
  for (const fault of faults) {
    const opened = points.get(dateKey(fault.createdAt));
    if (opened) opened.opened += 1;
    if (fault.resolvedAt) {
      const resolved = points.get(dateKey(fault.resolvedAt));
      if (resolved) resolved.resolved += 1;
    }
  }
  return [...points.values()];
}

function averageResolutionHours(
  range: ReturnType<typeof resolveRange>,
  faults: Array<{ createdAt: Date; resolvedAt: Date | null }>,
) {
  const samples = faults
    .filter(
      (fault) =>
        fault.resolvedAt && fault.resolvedAt >= range.from && fault.resolvedAt < range.toExclusive,
    )
    .map((fault) => (fault.resolvedAt!.getTime() - fault.createdAt.getTime()) / 3_600_000)
    .filter((hours) => hours >= 0);
  if (!samples.length) return null;
  return Number((samples.reduce((sum, hours) => sum + hours, 0) / samples.length).toFixed(1));
}

function statusBreakdown(
  rows: Array<{ currentStatus: EquipmentStatus; _count: { _all: number } }>,
) {
  const counts = new Map(rows.map((row) => [row.currentStatus, row._count._all]));
  return [EquipmentStatus.AVAILABLE, EquipmentStatus.LIMITED, EquipmentStatus.OUT_OF_SERVICE].map(
    (status) => ({ status, count: counts.get(status) ?? 0 }),
  );
}

async function managerDashboard(
  membership: ActiveMembership,
  range: ReturnType<typeof resolveRange>,
  database: DbClient,
) {
  const activeFaultWhere: Prisma.FaultReportWhereInput = {
    gymId: membership.gymId,
    status: { not: FaultStatus.CLOSED },
  };
  const currentEquipmentWhere: Prisma.EquipmentWhereInput = {
    gymId: membership.gymId,
    archivedAt: null,
  };
  const [
    activeFaultCount,
    highSeverityFaultCount,
    overdueRepairCount,
    outOfServiceEquipmentCount,
    equipmentStatusRows,
    trendFaults,
    attentionRows,
    recentActivityRows,
  ] = await Promise.all([
    database.faultReport.count({ where: activeFaultWhere }),
    database.faultReport.count({
      where: {
        ...activeFaultWhere,
        severity: { in: [FaultSeverity.HIGH, FaultSeverity.CRITICAL] },
      },
    }),
    database.faultReport.count({
      where: {
        ...activeFaultWhere,
        targetDate: { not: null, lt: startOfUtcDay(new Date()) },
      },
    }),
    database.equipment.count({
      where: { ...currentEquipmentWhere, currentStatus: EquipmentStatus.OUT_OF_SERVICE },
    }),
    database.equipment.groupBy({
      by: ["currentStatus"],
      where: currentEquipmentWhere,
      _count: { _all: true },
    }),
    database.faultReport.findMany({
      where: {
        gymId: membership.gymId,
        OR: [
          { createdAt: { gte: range.from, lt: range.toExclusive } },
          { resolvedAt: { gte: range.from, lt: range.toExclusive } },
        ],
      },
      select: {
        publicReference: true,
        title: true,
        createdAt: true,
        resolvedAt: true,
        equipment: { select: { publicId: true, assetId: true, name: true } },
      },
    }),
    database.faultReport.findMany({
      where: activeFaultWhere,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 50,
      select: {
        publicReference: true,
        title: true,
        severity: true,
        status: true,
        targetDate: true,
        equipment: {
          select: { publicId: true, assetId: true, name: true, currentStatus: true },
        },
        assigneeMember: { select: { user: { select: { displayName: true } } } },
        externalTechnician: { select: { name: true } },
      },
    }),
    database.faultUpdate.findMany({
      where: { gymId: membership.gymId, createdAt: { gte: range.from, lt: range.toExclusive } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 10,
      select: {
        id: true,
        type: true,
        body: true,
        createdAt: true,
        authorMember: { select: { user: { select: { displayName: true } } } },
        fault: { select: { publicReference: true, title: true } },
      },
    }),
  ]);

  const attentionItems = attentionRows
    .map((fault) => ({
      reference: fault.publicReference,
      title: fault.title,
      severity: fault.severity,
      status: fault.status,
      targetDate: fault.targetDate,
      assignee:
        fault.assigneeMember?.user.displayName ?? fault.externalTechnician?.name ?? "Unassigned",
      equipment: fault.equipment,
    }))
    .sort((left, right) => {
      const priority = (fault: {
        severity: FaultSeverity;
        status: FaultStatus;
        targetDate: Date | null;
        equipment: { currentStatus: EquipmentStatus };
      }) =>
        (fault.severity === FaultSeverity.CRITICAL
          ? 4
          : fault.severity === FaultSeverity.HIGH
            ? 3
            : 0) +
        (fault.status === FaultStatus.REPORTED ? 2 : 0) +
        (fault.equipment.currentStatus === EquipmentStatus.OUT_OF_SERVICE ? 2 : 0) +
        (fault.targetDate && fault.targetDate < startOfUtcDay(new Date()) ? 2 : 0);
      return priority(right) - priority(left);
    })
    .slice(0, 10);

  const recurring = new Map<
    string,
    { publicId: string; assetId: string; name: string; count: number }
  >();
  for (const fault of trendFaults) {
    const current = recurring.get(fault.equipment.publicId);
    if (current) current.count += 1;
    else recurring.set(fault.equipment.publicId, { ...fault.equipment, count: 1 });
  }

  return {
    role: "MANAGER" as const,
    range: { from: range.fromDate, to: range.toDate },
    metrics: {
      activeFaults: activeFaultCount,
      highSeverityFaults: highSeverityFaultCount,
      overdueRepairs: overdueRepairCount,
      outOfServiceEquipment: outOfServiceEquipmentCount,
    },
    attentionItems,
    equipmentStatusBreakdown: statusBreakdown(equipmentStatusRows),
    averageResolutionHours: averageResolutionHours(range, trendFaults),
    trend: trendForRange(range, trendFaults),
    recurringEquipment: [...recurring.values()]
      .filter((equipment) => equipment.count > 1)
      .sort((left, right) => right.count - left.count)
      .slice(0, 5),
    recentActivity: recentActivityRows.map((activity) => ({
      id: activity.id,
      type: activity.type,
      body: activity.body,
      createdAt: activity.createdAt,
      authorName: activity.authorMember?.user.displayName ?? "FitFix",
      fault: activity.fault,
    })),
  };
}

async function staffDashboard(
  membership: ActiveMembership,
  range: ReturnType<typeof resolveRange>,
  database: DbClient,
) {
  const activeFaultWhere: Prisma.FaultReportWhereInput = {
    gymId: membership.gymId,
    status: { not: FaultStatus.CLOSED },
  };
  const [assignedTaskCount, reportCount, outageCount, assignedTasks, reports, outages] =
    await Promise.all([
      database.faultReport.count({
        where: { ...activeFaultWhere, assigneeMemberId: membership.id },
      }),
      database.faultReport.count({
        where: {
          gymId: membership.gymId,
          reporterMemberId: membership.id,
          createdAt: { gte: range.from, lt: range.toExclusive },
        },
      }),
      database.equipment.count({
        where: {
          gymId: membership.gymId,
          archivedAt: null,
          currentStatus: EquipmentStatus.OUT_OF_SERVICE,
        },
      }),
      database.faultReport.findMany({
        where: { ...activeFaultWhere, assigneeMemberId: membership.id },
        orderBy: [{ targetDate: "asc" }, { createdAt: "desc" }],
        take: 10,
        select: {
          publicReference: true,
          title: true,
          severity: true,
          status: true,
          targetDate: true,
          equipment: { select: { publicId: true, assetId: true, name: true } },
        },
      }),
      database.faultReport.findMany({
        where: {
          gymId: membership.gymId,
          reporterMemberId: membership.id,
          createdAt: { gte: range.from, lt: range.toExclusive },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 10,
        select: {
          publicReference: true,
          title: true,
          status: true,
          createdAt: true,
          equipment: { select: { publicId: true, assetId: true, name: true } },
        },
      }),
      database.equipment.findMany({
        where: {
          gymId: membership.gymId,
          archivedAt: null,
          currentStatus: EquipmentStatus.OUT_OF_SERVICE,
        },
        orderBy: { updatedAt: "desc" },
        take: 10,
        select: { publicId: true, assetId: true, name: true, location: true },
      }),
    ]);

  return {
    role: "STAFF" as const,
    range: { from: range.fromDate, to: range.toDate },
    metrics: {
      assignedTasks: assignedTaskCount,
      myReports: reportCount,
      currentOutages: outageCount,
    },
    assignedTasks,
    myReports: reports,
    currentOutages: outages,
  };
}

export async function getDashboard(
  membership: ActiveMembership,
  input: DashboardQueryInput,
  database: DbClient = db,
) {
  const range = resolveRange(input);
  return membership.role === "MANAGER"
    ? managerDashboard(membership, range, database)
    : staffDashboard(membership, range, database);
}
