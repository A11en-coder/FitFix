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
import { AuthorizationError, assertManager, type ActiveMembership } from "../auth/role-policy";
import type { FaultSubmissionInput } from "./submission-schema";
import type { FaultListQueryInput, FaultReviewInput } from "./review-schema";

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

const faultDetailsInclude = {
  equipment: {
    select: { publicId: true, assetId: true, name: true, location: true, currentStatus: true },
  },
  reporterMember: { select: { user: { select: { displayName: true } } } },
  mediaAssets: {
    where: { state: MediaState.ATTACHED },
    orderBy: { createdAt: "asc" as const },
    select: { id: true, secureUrl: true, mimeType: true, bytes: true, width: true, height: true },
  },
  updates: {
    orderBy: { createdAt: "asc" as const },
    include: { authorMember: { select: { user: { select: { displayName: true } } } } },
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

export class FaultNotFoundError extends Error {
  constructor() {
    super("Fault report not found.");
    this.name = "FaultNotFoundError";
  }
}

export class FaultReviewConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FaultReviewConflictError";
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
    triageState:
      fault.status === FaultStatus.REPORTED
        ? "NEEDS_TRIAGE"
        : fault.status === FaultStatus.UNDER_REVIEW
          ? "REVIEWED"
          : "IN_PROGRESS",
    version: fault.version,
    equipment: fault.equipment,
    mediaAssets: fault.mediaAssets,
  };
}

function toFaultListItem(
  fault: Prisma.FaultReportGetPayload<{
    include: {
      equipment: { select: { publicId: true; assetId: true; name: true; location: true } };
    };
  }>,
) {
  return {
    reference: fault.publicReference,
    title: fault.title,
    severity: fault.severity,
    status: fault.status,
    reportedEquipmentStatus: fault.reportedEquipmentStatus,
    discoveredAt: fault.discoveredAt,
    createdAt: fault.createdAt,
    version: fault.version,
    equipment: fault.equipment,
  };
}

function toFaultDetails(
  fault: Prisma.FaultReportGetPayload<{ include: typeof faultDetailsInclude }>,
  canReview: boolean,
) {
  return {
    reference: fault.publicReference,
    title: fault.title,
    description: fault.description,
    severity: fault.severity,
    status: fault.status,
    triageState:
      fault.status === FaultStatus.REPORTED
        ? "NEEDS_TRIAGE"
        : fault.status === FaultStatus.UNDER_REVIEW
          ? "REVIEWED"
          : "IN_PROGRESS",
    reportedEquipmentStatus: fault.reportedEquipmentStatus,
    immediateAction: fault.immediateAction,
    discoveredAt: fault.discoveredAt,
    version: fault.version,
    createdAt: fault.createdAt,
    updatedAt: fault.updatedAt,
    reporterName: fault.reporterMember.user.displayName,
    equipment: fault.equipment,
    mediaAssets: fault.mediaAssets,
    updates: fault.updates.map((update) => ({
      id: update.id,
      type: update.type,
      body: update.body,
      metadata: update.metadata,
      createdAt: update.createdAt,
      authorName: update.authorMember?.user.displayName ?? "FitFix",
    })),
    permittedActions: canReview && fault.status === FaultStatus.REPORTED ? ["REVIEW"] : [],
  };
}

export async function listFaults(
  membership: ActiveMembership,
  input: FaultListQueryInput,
  database: DbClient = db,
) {
  const equipment = input.equipmentPublicId
    ? await database.equipment.findFirst({
        where: { publicId: input.equipmentPublicId, gymId: membership.gymId },
        select: { id: true },
      })
    : null;
  if (input.equipmentPublicId && !equipment) throw new FaultNotFoundError();

  const faults = await database.faultReport.findMany({
    where: {
      gymId: membership.gymId,
      ...(input.status ? { status: input.status as FaultStatus } : {}),
      ...(input.severity ? { severity: input.severity as FaultSeverity } : {}),
      ...(equipment ? { equipmentId: equipment.id } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: input.limit + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    include: {
      equipment: { select: { publicId: true, assetId: true, name: true, location: true } },
    },
  });
  const hasMore = faults.length > input.limit;
  const page = hasMore ? faults.slice(0, input.limit) : faults;
  return {
    items: page.map(toFaultListItem),
    nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
  };
}

export async function getFault(
  reference: string,
  membership: ActiveMembership,
  database: DbClient = db,
) {
  const fault = await database.faultReport.findFirst({
    where: { publicReference: reference, gymId: membership.gymId },
    include: faultDetailsInclude,
  });
  if (!fault) throw new FaultNotFoundError();
  return toFaultDetails(fault, membership.role === "MANAGER");
}

export async function reviewFault(
  reference: string,
  input: FaultReviewInput,
  membership: ActiveMembership,
  requestId: string,
  database: DbClient = db,
) {
  assertManager(membership);
  const current = await database.faultReport.findFirst({
    where: { publicReference: reference, gymId: membership.gymId },
    include: { equipment: true },
  });
  if (!current) throw new FaultNotFoundError();
  if (current.status !== FaultStatus.REPORTED)
    throw new FaultReviewConflictError("Only reported faults can be reviewed.");
  if (current.version !== input.version)
    throw new FaultReviewConflictError("This fault changed elsewhere. Refresh and try again.");
  if (current.equipment.archivedAt)
    throw new FaultReviewConflictError("Archived equipment cannot be reviewed.");

  return database.$transaction(async (tx) => {
    const reviewed = await tx.faultReport.update({
      where: { id: current.id },
      data: {
        severity: input.severity as FaultSeverity,
        status: FaultStatus.UNDER_REVIEW,
        version: { increment: 1 },
      },
    });
    if (input.equipmentStatus !== current.equipment.currentStatus) {
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
    await tx.faultUpdate.create({
      data: {
        faultId: current.id,
        gymId: membership.gymId,
        authorMemberId: membership.id,
        type: FaultUpdateType.STATUS,
        body: "Fault reviewed.",
        metadata: {
          fromSeverity: current.severity,
          toSeverity: input.severity,
          fromEquipmentStatus: current.equipment.currentStatus,
          toEquipmentStatus: input.equipmentStatus,
        },
      },
    });
    await tx.auditEvent.create({
      data: {
        gymId: membership.gymId,
        actorMemberId: membership.id,
        entityType: "FaultReport",
        entityId: current.id,
        action: "FAULT_REVIEWED",
        metadata: {
          reference: current.publicReference,
          fromSeverity: current.severity,
          toSeverity: input.severity,
          fromEquipmentStatus: current.equipment.currentStatus,
          toEquipmentStatus: input.equipmentStatus,
        },
        requestId,
      },
    });
    const result = await tx.faultReport.findUniqueOrThrow({
      where: { id: reviewed.id },
      include: faultDetailsInclude,
    });
    return toFaultDetails(result, true);
  });
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
  return faultErrorCode(error);
}

export function faultErrorCode(error: unknown): string {
  if (error instanceof AuthorizationError) return "FORBIDDEN";
  if (error instanceof FaultSubmissionNotFoundError) return "NOT_FOUND";
  if (error instanceof FaultSubmissionConflictError) return "FAULT_SUBMISSION_CONFLICT";
  if (error instanceof FaultNotFoundError) return "NOT_FOUND";
  if (error instanceof FaultReviewConflictError) return "FAULT_REVIEW_CONFLICT";
  return "FAULT_OPERATION_FAILED";
}
