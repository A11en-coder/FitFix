import { FaultStatus, FaultUpdateType, MemberStatus, Prisma } from "@prisma/client";
import { db } from "../../server/db";
import { assertManager, type ActiveMembership } from "../auth/role-policy";
import { persistNotification } from "../notifications/notification-service";
import type { FaultAssignmentInput } from "./assignment-schema";

type DbClient = typeof db;

export class FaultAssignmentNotFoundError extends Error {
  constructor(message = "The fault or assignee could not be found.") {
    super(message);
    this.name = "FaultAssignmentNotFoundError";
  }
}

export class FaultAssignmentConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FaultAssignmentConflictError";
  }
}

function assignmentDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value)
    throw new FaultAssignmentConflictError("Target date must be a valid calendar date.");
  if (date.getTime() < Date.now() - 86_400_000)
    throw new FaultAssignmentConflictError("Target date cannot be in the past.");
  return date;
}

export async function assignFault(
  reference: string,
  input: FaultAssignmentInput,
  membership: ActiveMembership,
  requestId: string,
  database: DbClient = db,
) {
  assertManager(membership);
  const targetDate = assignmentDate(input.targetDate);
  const current = await database.faultReport.findFirst({
    where: { publicReference: reference, gymId: membership.gymId },
    include: { equipment: true },
  });
  if (!current) throw new FaultAssignmentNotFoundError("Fault report not found.");
  if (current.status !== FaultStatus.UNDER_REVIEW)
    throw new FaultAssignmentConflictError("Only reviewed faults can be assigned.");
  if (current.version !== input.version)
    throw new FaultAssignmentConflictError("This fault changed elsewhere. Refresh and try again.");
  if (current.equipment.archivedAt)
    throw new FaultAssignmentConflictError("Archived equipment cannot receive a new assignment.");

  return database.$transaction(async (tx) => {
    let assigneeMemberId: string | null = null;
    let externalTechnicianId: string | null = null;
    let assigneeLabel = "External technician";
    if (input.assigneeType === "INTERNAL") {
      const assignee = await tx.gymMember.findFirst({
        where: { id: input.assigneeMemberId, gymId: membership.gymId, status: MemberStatus.ACTIVE },
        include: { user: true },
      });
      if (!assignee) throw new FaultAssignmentNotFoundError("Active internal assignee not found.");
      assigneeMemberId = assignee.id;
      assigneeLabel = assignee.user.displayName;
    } else if (input.externalTechnicianId) {
      const technician = await tx.externalTechnician.findFirst({
        where: { id: input.externalTechnicianId, gymId: membership.gymId, archivedAt: null },
      });
      if (!technician) throw new FaultAssignmentNotFoundError("External technician not found.");
      externalTechnicianId = technician.id;
      assigneeLabel = technician.name;
    } else if (input.externalTechnician) {
      const technician = await tx.externalTechnician.create({
        data: { gymId: membership.gymId, ...input.externalTechnician },
      });
      externalTechnicianId = technician.id;
      assigneeLabel = technician.name;
    }

    const assigned = await tx.faultReport.update({
      where: { id: current.id },
      data: {
        status: FaultStatus.ASSIGNED,
        assigneeMemberId,
        externalTechnicianId,
        targetDate,
        version: { increment: 1 },
      },
    });
    await tx.faultUpdate.create({
      data: {
        faultId: current.id,
        gymId: membership.gymId,
        authorMemberId: membership.id,
        type: FaultUpdateType.ASSIGNMENT,
        body: `Repair assigned to ${assigneeLabel}.`,
        metadata: { assigneeType: input.assigneeType, targetDate: input.targetDate },
      },
    });
    await tx.auditEvent.create({
      data: {
        gymId: membership.gymId,
        actorMemberId: membership.id,
        entityType: "FaultReport",
        entityId: current.id,
        action: "FAULT_ASSIGNED",
        metadata: {
          reference: current.publicReference,
          assigneeType: input.assigneeType,
          assigneeMemberId,
          externalTechnicianId,
          targetDate: input.targetDate,
        },
        requestId,
      },
    });
    if (assigneeMemberId) {
      await persistNotification(tx, {
        gymId: membership.gymId,
        recipientMemberId: assigneeMemberId,
        faultId: assigned.id,
        reference: current.publicReference,
        type: "FAULT_ASSIGNED",
        title: "Repair assigned",
        body: `You have been assigned ${current.publicReference}: ${current.title}.`,
        dedupeKey: `fault-assigned:${current.id}:${assigneeMemberId}:${input.version}`,
      });
    }
    return assigned;
  });
}

export function faultAssignmentErrorCode(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
    return "ASSIGNMENT_CONFLICT";
  if (error instanceof FaultAssignmentNotFoundError) return "NOT_FOUND";
  if (error instanceof FaultAssignmentConflictError) return "ASSIGNMENT_CONFLICT";
  return "FAULT_ASSIGNMENT_FAILED";
}
