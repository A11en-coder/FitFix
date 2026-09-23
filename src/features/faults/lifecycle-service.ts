import {
  EquipmentStatus,
  FaultStatus,
  FaultUpdateType,
  MemberRole,
  MemberStatus,
  Prisma,
} from "@prisma/client";
import { db } from "../../server/db";
import { AuthorizationError, type ActiveMembership } from "../auth/role-policy";
import { persistNotification } from "../notifications/notification-service";
import type {
  FaultCloseInput,
  FaultReopenInput,
  FaultResolveInput,
  FaultStartInput,
  FaultUpdateInput,
} from "./lifecycle-schema";

type DbClient = typeof db;

export class FaultLifecycleNotFoundError extends Error {
  constructor(message = "Fault report not found.") {
    super(message);
    this.name = "FaultLifecycleNotFoundError";
  }
}

export class FaultLifecycleConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FaultLifecycleConflictError";
  }
}

const faultWithContext = {
  equipment: true,
  reporterMember: true,
} satisfies Prisma.FaultReportInclude;

async function findFault(reference: string, membership: ActiveMembership, database: DbClient) {
  const fault = await database.faultReport.findFirst({
    where: { publicReference: reference, gymId: membership.gymId },
    include: faultWithContext,
  });
  if (!fault) throw new FaultLifecycleNotFoundError();
  return fault;
}

function assertVersion(currentVersion: number, requestedVersion: number) {
  if (currentVersion !== requestedVersion)
    throw new FaultLifecycleConflictError("This fault changed elsewhere. Refresh and try again.");
}

function assertManager(membership: ActiveMembership) {
  if (membership.role !== MemberRole.MANAGER)
    throw new AuthorizationError("Only managers can perform this action.");
}

function assertAssignedActor(membership: ActiveMembership, assigneeMemberId: string | null) {
  if (membership.role !== MemberRole.MANAGER && assigneeMemberId !== membership.id)
    throw new AuthorizationError(
      "Only the assigned staff member or a manager can perform this action.",
    );
}

async function addNotification(
  tx: Prisma.TransactionClient,
  input: {
    gymId: string;
    recipientMemberId: string;
    faultId: string;
    reference: string;
    title: string;
    body: string;
    action: string;
    type: "FAULT_RESOLVED" | "FAULT_CLOSED" | "FAULT_REOPENED";
    version: number;
  },
) {
  await persistNotification(tx, {
    gymId: input.gymId,
    recipientMemberId: input.recipientMemberId,
    faultId: input.faultId,
    reference: input.reference,
    type: input.type,
    title: input.title,
    body: input.body,
    dedupeKey: `fault-${input.action}:${input.faultId}:${input.recipientMemberId}:${input.version}`,
  });
}

async function notifyManagers(
  tx: Prisma.TransactionClient,
  fault: { id: string; gymId: string; publicReference: string; title: string },
  actorMemberId: string,
  title: string,
  body: string,
  action: string,
  version: number,
) {
  const managers = await tx.gymMember.findMany({
    where: { gymId: fault.gymId, role: MemberRole.MANAGER, status: MemberStatus.ACTIVE },
    select: { id: true },
  });
  for (const manager of managers) {
    if (manager.id === actorMemberId) continue;
    await addNotification(tx, {
      gymId: fault.gymId,
      recipientMemberId: manager.id,
      faultId: fault.id,
      reference: fault.publicReference,
      title,
      body,
      action,
      type: "FAULT_RESOLVED",
      version,
    });
  }
}

async function notifyResponsibleMembers(
  tx: Prisma.TransactionClient,
  fault: {
    id: string;
    gymId: string;
    publicReference: string;
    title: string;
    reporterMemberId: string;
    assigneeMemberId: string | null;
  },
  actorMemberId: string,
  title: string,
  body: string,
  action: string,
  version: number,
) {
  const ids = [
    ...new Set(
      [fault.reporterMemberId, fault.assigneeMemberId].filter((id): id is string => Boolean(id)),
    ),
  ];
  for (const recipientMemberId of ids) {
    if (recipientMemberId === actorMemberId) continue;
    const recipient = await tx.gymMember.findFirst({
      where: { id: recipientMemberId, gymId: fault.gymId, status: MemberStatus.ACTIVE },
      select: { id: true },
    });
    if (!recipient) continue;
    await addNotification(tx, {
      gymId: fault.gymId,
      recipientMemberId: recipient.id,
      faultId: fault.id,
      reference: fault.publicReference,
      title,
      body,
      action,
      type: action === "closed" ? "FAULT_CLOSED" : "FAULT_REOPENED",
      version,
    });
  }
}

async function recordStatusChange(
  tx: Prisma.TransactionClient,
  fault: { id: string; gymId: string },
  membership: ActiveMembership,
  type: FaultUpdateType,
  body: string,
  metadata: Prisma.JsonObject,
) {
  await tx.faultUpdate.create({
    data: {
      faultId: fault.id,
      gymId: fault.gymId,
      authorMemberId: membership.id,
      type,
      body,
      metadata,
    },
  });
}

async function recordAudit(
  tx: Prisma.TransactionClient,
  fault: { id: string; gymId: string; publicReference: string },
  membership: ActiveMembership,
  action: string,
  metadata: Prisma.JsonObject,
  requestId: string,
) {
  await tx.auditEvent.create({
    data: {
      gymId: fault.gymId,
      actorMemberId: membership.id,
      entityType: "FaultReport",
      entityId: fault.id,
      action,
      metadata: { reference: fault.publicReference, ...metadata },
      requestId,
    },
  });
}

export async function startFault(
  reference: string,
  input: FaultStartInput,
  membership: ActiveMembership,
  requestId: string,
  database: DbClient = db,
) {
  const current = await findFault(reference, membership, database);
  assertAssignedActor(membership, current.assigneeMemberId);
  assertVersion(current.version, input.version);
  if (current.status !== FaultStatus.ASSIGNED)
    throw new FaultLifecycleConflictError("Only assigned faults can be started.");
  return transitionFault(
    current,
    FaultStatus.IN_PROGRESS,
    membership,
    requestId,
    database,
    async (tx, updated) => {
      await recordStatusChange(tx, updated, membership, FaultUpdateType.STATUS, "Repair started.", {
        fromStatus: FaultStatus.ASSIGNED,
        toStatus: FaultStatus.IN_PROGRESS,
      });
      await recordAudit(
        tx,
        updated,
        membership,
        "FAULT_STARTED",
        { toStatus: FaultStatus.IN_PROGRESS },
        requestId,
      );
    },
  );
}

export async function addFaultUpdate(
  reference: string,
  input: FaultUpdateInput,
  membership: ActiveMembership,
  requestId: string,
  database: DbClient = db,
) {
  const current = await findFault(reference, membership, database);
  assertAssignedActor(membership, current.assigneeMemberId);
  assertVersion(current.version, input.version);
  if (current.status !== FaultStatus.ASSIGNED && current.status !== FaultStatus.IN_PROGRESS)
    throw new FaultLifecycleConflictError(
      "Updates can only be added to assigned or in-progress faults.",
    );
  return database.$transaction(async (tx) => {
    const updated = await tx.faultReport.update({
      where: { id: current.id },
      data: { version: { increment: 1 } },
    });
    await recordStatusChange(tx, updated, membership, FaultUpdateType.COMMENT, input.body, {});
    await recordAudit(
      tx,
      updated,
      membership,
      "FAULT_UPDATED",
      { updateType: "COMMENT" },
      requestId,
    );
    return updated;
  });
}

export async function resolveFault(
  reference: string,
  input: FaultResolveInput,
  membership: ActiveMembership,
  requestId: string,
  database: DbClient = db,
) {
  const current = await findFault(reference, membership, database);
  assertAssignedActor(membership, current.assigneeMemberId);
  assertVersion(current.version, input.version);
  if (current.status !== FaultStatus.IN_PROGRESS)
    throw new FaultLifecycleConflictError("Only in-progress faults can be resolved.");
  return database.$transaction(async (tx) => {
    const updated = await tx.faultReport.update({
      where: { id: current.id },
      data: {
        status: FaultStatus.RESOLVED,
        resolutionSummary: input.resolutionSummary,
        resolvedAt: new Date(),
        version: { increment: 1 },
      },
    });
    await recordStatusChange(
      tx,
      updated,
      membership,
      FaultUpdateType.RESOLUTION,
      input.resolutionSummary,
      {
        fromStatus: FaultStatus.IN_PROGRESS,
        toStatus: FaultStatus.RESOLVED,
      },
    );
    await recordAudit(
      tx,
      updated,
      membership,
      "FAULT_RESOLVED",
      { toStatus: FaultStatus.RESOLVED },
      requestId,
    );
    await notifyManagers(
      tx,
      current,
      membership.id,
      "Resolution ready for verification",
      `${current.publicReference} is ready for verification.`,
      "resolved",
      updated.version,
    );
    return updated;
  });
}

export async function closeFault(
  reference: string,
  input: FaultCloseInput,
  membership: ActiveMembership,
  requestId: string,
  database: DbClient = db,
) {
  assertManager(membership);
  const current = await findFault(reference, membership, database);
  assertVersion(current.version, input.version);
  if (current.status !== FaultStatus.RESOLVED)
    throw new FaultLifecycleConflictError("Only resolved faults can be closed.");
  return database.$transaction(async (tx) => {
    const updated = await tx.faultReport.update({
      where: { id: current.id },
      data: {
        status: FaultStatus.CLOSED,
        repairCost: input.repairCost,
        closedAt: new Date(),
        version: { increment: 1 },
      },
    });
    if (input.equipmentStatus && input.equipmentStatus !== current.equipment.currentStatus) {
      const now = new Date();
      await tx.equipment.update({
        where: { id: current.equipment.id },
        data: {
          currentStatus: input.equipmentStatus as EquipmentStatus,
          version: { increment: 1 },
        },
      });
      await tx.equipmentStatusInterval.updateMany({
        where: { equipmentId: current.equipment.id, endedAt: null },
        data: { endedAt: now },
      });
      await tx.equipmentStatusInterval.create({
        data: {
          equipmentId: current.equipment.id,
          status: input.equipmentStatus as EquipmentStatus,
          sourceFaultId: current.id,
          changedByMemberId: membership.id,
          startedAt: now,
        },
      });
    }
    await recordStatusChange(tx, updated, membership, FaultUpdateType.STATUS, "Fault closed.", {
      fromStatus: FaultStatus.RESOLVED,
      toStatus: FaultStatus.CLOSED,
      repairCost: input.repairCost ?? null,
    });
    await recordAudit(
      tx,
      updated,
      membership,
      "FAULT_CLOSED",
      { toStatus: FaultStatus.CLOSED },
      requestId,
    );
    await notifyResponsibleMembers(
      tx,
      current,
      membership.id,
      "Fault closed",
      `${current.publicReference} has been closed.`,
      "closed",
      updated.version,
    );
    return updated;
  });
}

export async function reopenFault(
  reference: string,
  input: FaultReopenInput,
  membership: ActiveMembership,
  requestId: string,
  database: DbClient = db,
) {
  assertManager(membership);
  const current = await findFault(reference, membership, database);
  assertVersion(current.version, input.version);
  if (current.status !== FaultStatus.RESOLVED && current.status !== FaultStatus.CLOSED)
    throw new FaultLifecycleConflictError("Only resolved or closed faults can be reopened.");
  const nextStatus =
    current.status === FaultStatus.CLOSED ? FaultStatus.UNDER_REVIEW : FaultStatus.IN_PROGRESS;
  return database.$transaction(async (tx) => {
    const updated = await tx.faultReport.update({
      where: { id: current.id },
      data: {
        status: nextStatus,
        resolvedAt: null,
        closedAt: null,
        version: { increment: 1 },
      },
    });
    await recordStatusChange(tx, updated, membership, FaultUpdateType.REOPEN, input.reason, {
      fromStatus: current.status,
      toStatus: nextStatus,
    });
    await recordAudit(
      tx,
      updated,
      membership,
      "FAULT_REOPENED",
      { fromStatus: current.status, toStatus: nextStatus },
      requestId,
    );
    await notifyResponsibleMembers(
      tx,
      current,
      membership.id,
      "Fault reopened",
      `${current.publicReference} has been reopened.`,
      "reopened",
      updated.version,
    );
    return updated;
  });
}

async function transitionFault(
  current: {
    id: string;
    gymId: string;
    publicReference: string;
    status: FaultStatus;
    version: number;
  },
  status: FaultStatus,
  membership: ActiveMembership,
  requestId: string,
  database: DbClient,
  record: (
    tx: Prisma.TransactionClient,
    updated: { id: string; gymId: string; publicReference: string },
  ) => Promise<void>,
) {
  return database.$transaction(async (tx) => {
    const updated = await tx.faultReport.update({
      where: { id: current.id },
      data: { status, version: { increment: 1 } },
    });
    await record(tx, updated);
    await recordAudit(tx, updated, membership, "FAULT_STARTED", { toStatus: status }, requestId);
    return updated;
  });
}

export function faultLifecycleErrorCode(error: unknown): string {
  if (error instanceof AuthorizationError) return "FORBIDDEN";
  if (error instanceof FaultLifecycleNotFoundError) return "NOT_FOUND";
  if (error instanceof FaultLifecycleConflictError) return "LIFECYCLE_CONFLICT";
  return "FAULT_LIFECYCLE_FAILED";
}
