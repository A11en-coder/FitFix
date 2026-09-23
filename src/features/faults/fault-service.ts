import { createHash, randomUUID } from "node:crypto";
import {
  EquipmentStatus,
  FaultSeverity,
  FaultStatus,
  FaultUpdateType,
  MediaState,
  Prisma,
} from "@prisma/client";
import { db } from "../../server/db";
import { AuthorizationError, type ActiveMembership } from "../auth/role-policy";
import type { FaultSubmissionInput } from "./submission-schema";

type DbClient = typeof db;

// This defines the related data returned with a fault
const faultInclude = {
  equipment: { select: { publicId: true, assetId: true, name: true, location: true } },
  mediaAssets: {
    where: { state: MediaState.ATTACHED },
    orderBy: { createdAt: "asc" as const },
    select: { id: true, secureUrl: true, mimeType: true, bytes: true, width: true, height: true },
  },
} satisfies Prisma.FaultReportInclude;

export class FaultSubmissionNotFoundError extends Error {
  constructor(message = "The equipment or draft could not be found.") {
    super(message);
    this.name = "FaultSubmissionNotFoundError";
  }
}

export class FaultSubmissionConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FaultSubmissionConflictError";
  }
}

// builds the Prisma filter used to find a draft safely
function draftWhere(id: string, membership: ActiveMembership): Prisma.FaultDraftWhereInput {
  return {
    id,
    gymId: membership.gymId,
    ...(membership.role === "MANAGER" ? {} : { authorMemberId: membership.id }),
  };
}

// generates a SHA-256 fingerprint of the fault submission input
// this is used to detect if a submission with the same idempotency key has different details
function fingerprint(input: FaultSubmissionInput) {
  const canonical = JSON.stringify({ ...input, mediaAssetIds: [...input.mediaAssetIds].sort() });
  return createHash("sha256").update(canonical).digest("hex");
}

// generates a public reference for a new fault report, which is safer and easier for users to read or communicate.
function publicReference() {
  const year = new Date().getUTCFullYear();
  return `FF-${year}-${randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
}

// returns a numeric rank for equipment status, where higher numbers indicate more restrictive statuses
function statusRank(status: EquipmentStatus) {
  if (status === EquipmentStatus.OUT_OF_SERVICE) return 2;
  if (status === EquipmentStatus.LIMITED) return 1;
  return 0;
}

// converts the Prisma result into the public response returned by the API
function toFaultResult(fault: Prisma.FaultReportGetPayload<{ include: typeof faultInclude }>) {
  return {
    reference: fault.publicReference,
    status: fault.status,
    triageState: fault.status === FaultStatus.REPORTED ? "NEEDS_TRIAGE" : "IN_PROGRESS",
    version: fault.version,
    equipment: fault.equipment,
    mediaAssets: fault.mediaAssets,
  };
}

// Validate the submission context, create one permanent fault report, attach valid evidence, apply any permitted equipment restriction, record history, and safely handle retries.
export async function submitFault(
  input: FaultSubmissionInput,
  idempotencyKey: string,
  membership: ActiveMembership,
  requestId: string,
  database: DbClient = db,
) {
  if (!idempotencyKey.trim() || idempotencyKey.length > 160)
    throw new FaultSubmissionConflictError("A valid Idempotency-Key header is required.");

  const requestFingerprint = fingerprint(input);
  const existing = await database.faultReport.findUnique({
    where: { gymId_idempotencyKey: { gymId: membership.gymId, idempotencyKey } },
    include: faultInclude,
  });
  if (existing) {
    if (existing.idempotencyFingerprint !== requestFingerprint)
      throw new FaultSubmissionConflictError(
        "This Idempotency-Key was already used for different fault details.",
      );
    return toFaultResult(existing);
  }

  try {
    const result = await database.$transaction(async (tx) => {
      const equipment = await tx.equipment.findFirst({
        where: { publicId: input.equipmentPublicId, gymId: membership.gymId, archivedAt: null },
      });
      if (!equipment) throw new FaultSubmissionNotFoundError("Equipment not found.");

      let draft: { id: string; equipmentId: string | null; version: number } | null = null;
      if (input.draftId) {
        draft = await tx.faultDraft.findFirst({
          where: draftWhere(input.draftId, membership),
          select: { id: true, equipmentId: true, version: true },
        });
        if (!draft) throw new FaultSubmissionNotFoundError("Fault draft not found.");
        if (input.version !== undefined && draft.version !== input.version)
          throw new FaultSubmissionConflictError(
            "This draft was changed elsewhere. Refresh and try again.",
          );
        if (draft.equipmentId && draft.equipmentId !== equipment.id)
          throw new FaultSubmissionConflictError("The draft equipment does not match the report.");
      }

      if (input.mediaAssetIds.length && !draft)
        throw new FaultSubmissionConflictError("Submitted photos must belong to a draft.");

      const media = input.mediaAssetIds.length
        ? await tx.mediaAsset.findMany({
            where: {
              id: { in: input.mediaAssetIds },
              gymId: membership.gymId,
              draftId: draft?.id,
              state: MediaState.DRAFT,
            },
          })
        : [];
      if (media.length !== input.mediaAssetIds.length)
        throw new FaultSubmissionNotFoundError("One or more submitted photos could not be found.");

      if (statusRank(input.equipmentStatus) < statusRank(equipment.currentStatus))
        throw new FaultSubmissionConflictError(
          "A fault reporter cannot restore equipment to a less restrictive status.",
        );

      const fault = await tx.faultReport.create({
        data: {
          gymId: membership.gymId,
          publicReference: publicReference(),
          idempotencyKey,
          idempotencyFingerprint: requestFingerprint,
          equipmentId: equipment.id,
          reporterMemberId: membership.id,
          title: input.title,
          description: input.description,
          severity: input.severity as FaultSeverity,
          reportedEquipmentStatus: input.equipmentStatus as EquipmentStatus,
          immediateAction: input.immediateAction ?? null,
          discoveredAt: input.discoveredAt,
        },
        include: faultInclude,
      });

      if (statusRank(input.equipmentStatus) > statusRank(equipment.currentStatus)) {
        const now = new Date();
        await tx.equipment.update({
          where: { id: equipment.id },
          data: {
            currentStatus: input.equipmentStatus as EquipmentStatus,
            version: { increment: 1 },
          },
        });
        await tx.equipmentStatusInterval.updateMany({
          where: { equipmentId: equipment.id, endedAt: null },
          data: { endedAt: now },
        });
        await tx.equipmentStatusInterval.create({
          data: {
            equipmentId: equipment.id,
            status: input.equipmentStatus as EquipmentStatus,
            sourceFaultId: fault.id,
            changedByMemberId: membership.id,
            startedAt: now,
          },
        });
      }

      if (media.length)
        await tx.mediaAsset.updateMany({
          where: { id: { in: media.map(({ id }) => id) } },
          data: { draftId: null, faultId: fault.id, state: MediaState.ATTACHED },
        });

      if (draft) {
        await tx.mediaAsset.updateMany({
          where: { draftId: draft.id, state: MediaState.DRAFT },
          data: { draftId: null, state: MediaState.DELETE_PENDING },
        });
        await tx.faultDraft.delete({ where: { id: draft.id } });
      }

      await tx.faultUpdate.create({
        data: {
          faultId: fault.id,
          gymId: membership.gymId,
          authorMemberId: membership.id,
          type: FaultUpdateType.STATUS,
          body: "Fault reported.",
          metadata: { status: FaultStatus.REPORTED },
        },
      });
      await tx.auditEvent.create({
        data: {
          gymId: membership.gymId,
          actorMemberId: membership.id,
          entityType: "FaultReport",
          entityId: fault.id,
          action: "FAULT_REPORTED",
          metadata: { reference: fault.publicReference, severity: input.severity },
          requestId,
        },
      });

      return tx.faultReport.findUniqueOrThrow({ where: { id: fault.id }, include: faultInclude });
    });
    return toFaultResult(result);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const duplicate = await database.faultReport.findUnique({
        where: { gymId_idempotencyKey: { gymId: membership.gymId, idempotencyKey } },
        include: faultInclude,
      });
      if (duplicate && duplicate.idempotencyFingerprint === requestFingerprint)
        return toFaultResult(duplicate);
      throw new FaultSubmissionConflictError(
        "The fault submission conflicts with an existing record.",
      );
    }
    throw error;
  }
}

export function faultSubmissionErrorCode(error: unknown): string {
  if (error instanceof AuthorizationError) return "FORBIDDEN";
  if (error instanceof FaultSubmissionNotFoundError) return "NOT_FOUND";
  if (error instanceof FaultSubmissionConflictError) return "FAULT_SUBMISSION_CONFLICT";
  return "FAULT_SUBMISSION_FAILED";
}
