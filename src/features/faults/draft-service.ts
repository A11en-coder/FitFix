// this file contains the service functions for managing fault drafts
import { FaultSeverity, EquipmentStatus, MediaState, MemberRole, Prisma } from "@prisma/client";
import { db } from "../../server/db";
import { AuthorizationError, type ActiveMembership } from "../auth/role-policy";
import type {
  FaultDraftCreateInput,
  FaultDraftUpdateInput,
  MediaRegistrationInput,
} from "./draft-schema";
import { MAX_MEDIA_BYTES, MEDIA_MIME_TYPES } from "./cloudinary-service";

type DbClient = typeof db;

export class FaultDraftNotFoundError extends Error {
  constructor() {
    super("Fault draft not found.");
    this.name = "FaultDraftNotFoundError";
  }
}

export class FaultDraftConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FaultDraftConflictError";
  }
}

// this function checks if the membership has the MANAGER role
function canManage(membership: ActiveMembership) {
  return membership.role === MemberRole.MANAGER;
}

// this function returns a Prisma where input for querying fault drafts by ID and membership
function draftWhere(id: string, membership: ActiveMembership): Prisma.FaultDraftWhereInput {
  return {
    id,
    gymId: membership.gymId,
    ...(canManage(membership) ? {} : { authorMemberId: membership.id }),
  };
}

// this function resolves the equipment ID from the public ID and membership, or returns null if not found.
async function resolveEquipmentId(
  publicId: string | null | undefined,
  membership: ActiveMembership,
  database: DbClient,
) {
  if (publicId === undefined || publicId === null) return publicId;
  const equipment = await database.equipment.findFirst({
    where: { publicId, gymId: membership.gymId, archivedAt: null },
    select: { id: true },
  });
  if (!equipment) throw new FaultDraftNotFoundError();
  return equipment.id;
}

// this function creates a new fault draft with the given input and membership, and returns it
export async function createFaultDraft(
  input: FaultDraftCreateInput,
  membership: ActiveMembership,
  requestId: string,
  database: DbClient = db,
) {
  const equipmentId = await resolveEquipmentId(input.equipmentPublicId, membership, database);
  return database.$transaction(async (tx) => {
    const draft = await tx.faultDraft.create({
      data: {
        gymId: membership.gymId,
        authorMemberId: membership.id,
        equipmentId,
        title: input.title ?? null,
        description: input.description ?? null,
        severity: input.severity as FaultSeverity | null | undefined,
        equipmentStatus: input.equipmentStatus as EquipmentStatus | null | undefined,
        immediateAction: input.immediateAction ?? null,
        discoveredAt: input.discoveredAt ?? null,
      },
      include: {
        mediaAssets: { where: { state: MediaState.DRAFT }, orderBy: { createdAt: "asc" } },
      },
    });
    await tx.auditEvent.create({
      data: {
        gymId: membership.gymId,
        actorMemberId: membership.id,
        entityType: "FaultDraft",
        entityId: draft.id,
        action: "FAULT_DRAFT_CREATED",
        metadata: {},
        requestId,
      },
    });
    return draft;
  });
}

// this function retrieves a fault draft by its ID and membership, or throws an error if not found
export async function getFaultDraft(
  id: string,
  membership: ActiveMembership,
  database: DbClient = db,
) {
  const draft = await database.faultDraft.findFirst({
    where: draftWhere(id, membership),
    include: {
      mediaAssets: {
        where: { state: { in: [MediaState.DRAFT, MediaState.ATTACHED] } },
        orderBy: { createdAt: "asc" },
      },
      equipment: {
        select: { publicId: true, assetId: true, name: true, location: true, currentStatus: true },
      },
    },
  });
  if (!draft) throw new FaultDraftNotFoundError();
  return draft;
}

// this function updates a fault draft with the given input and membership, and returns it
export async function updateFaultDraft(
  id: string,
  input: FaultDraftUpdateInput,
  membership: ActiveMembership,
  requestId: string,
  database: DbClient = db,
) {
  const current = await database.faultDraft.findFirst({ where: draftWhere(id, membership) });
  if (!current) throw new FaultDraftNotFoundError();
  if (current.version !== input.version)
    throw new FaultDraftConflictError("This draft was changed elsewhere. Refresh and try again.");
  const equipmentId = await resolveEquipmentId(input.equipmentPublicId, membership, database);
  const data: Prisma.FaultDraftUpdateInput = {
    version: { increment: 1 },
    ...(input.equipmentPublicId !== undefined
      ? { equipment: equipmentId ? { connect: { id: equipmentId } } : { disconnect: true } }
      : {}),
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.severity !== undefined ? { severity: input.severity as FaultSeverity | null } : {}),
    ...(input.equipmentStatus !== undefined
      ? { equipmentStatus: input.equipmentStatus as EquipmentStatus | null }
      : {}),
    ...(input.immediateAction !== undefined ? { immediateAction: input.immediateAction } : {}),
    ...(input.discoveredAt !== undefined ? { discoveredAt: input.discoveredAt } : {}),
  };
  return database.$transaction(async (tx) => {
    const draft = await tx.faultDraft.update({
      where: { id: current.id },
      data,
      include: {
        mediaAssets: { where: { state: MediaState.DRAFT }, orderBy: { createdAt: "asc" } },
      },
    });
    await tx.auditEvent.create({
      data: {
        gymId: membership.gymId,
        actorMemberId: membership.id,
        entityType: "FaultDraft",
        entityId: draft.id,
        action: "FAULT_DRAFT_SAVED",
        metadata: { version: draft.version },
        requestId,
      },
    });
    return draft;
  });
}

// this function deletes a fault draft by its ID and membership, and returns nothing
export async function deleteFaultDraft(
  id: string,
  membership: ActiveMembership,
  requestId: string,
  database: DbClient = db,
) {
  const current = await database.faultDraft.findFirst({ where: draftWhere(id, membership) });
  if (!current) throw new FaultDraftNotFoundError();
  await database.$transaction(async (tx) => {
    await tx.mediaAsset.updateMany({
      where: { draftId: current.id, state: MediaState.DRAFT },
      data: { draftId: null, state: MediaState.DELETE_PENDING },
    });
    await tx.faultDraft.delete({ where: { id: current.id } });
    await tx.auditEvent.create({
      data: {
        gymId: membership.gymId,
        actorMemberId: membership.id,
        entityType: "FaultDraft",
        entityId: current.id,
        action: "FAULT_DRAFT_DISCARDED",
        metadata: {},
        requestId,
      },
    });
  });
}

// this function registers a new media asset for a fault draft with the given input and membership, and returns it
export async function registerDraftMedia(
  draftId: string,
  input: MediaRegistrationInput,
  membership: ActiveMembership,
  database: DbClient = db,
) {
  const draft = await database.faultDraft.findFirst({ where: draftWhere(draftId, membership) });
  if (!draft) throw new FaultDraftNotFoundError();
  if (!MEDIA_MIME_TYPES.includes(input.mimeType as (typeof MEDIA_MIME_TYPES)[number]))
    throw new FaultDraftConflictError("This image format is not supported.");
  if (input.bytes > MAX_MEDIA_BYTES)
    throw new FaultDraftConflictError("Images must be 10 MB or smaller.");
  let secureUrlHost: string;
  try {
    secureUrlHost = new URL(input.secureUrl).hostname;
  } catch {
    throw new FaultDraftConflictError("The uploaded image URL is invalid.");
  }
  if (secureUrlHost !== "res.cloudinary.com")
    throw new FaultDraftConflictError("The uploaded image URL is not from Cloudinary.");
  const expectedFolder = `fitfix/${membership.gymId}/drafts/${draft.id}/`;
  if (!input.cloudinaryPublicId.startsWith(expectedFolder))
    throw new AuthorizationError("This upload does not belong to the draft.");
  const mediaCount = await database.mediaAsset.count({
    where: { draftId: draft.id, state: MediaState.DRAFT },
  });
  if (mediaCount >= 5)
    throw new FaultDraftConflictError("A draft can contain at most five photos.");
  try {
    return await database.mediaAsset.create({
      data: {
        gymId: membership.gymId,
        uploadedByMemberId: membership.id,
        draftId: draft.id,
        cloudinaryPublicId: input.cloudinaryPublicId,
        secureUrl: input.secureUrl,
        mimeType: input.mimeType,
        bytes: input.bytes,
        width: input.width,
        height: input.height,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      throw new FaultDraftConflictError("This photo has already been registered.");
    throw error;
  }
}

export async function assertDraftMediaCapacity(
  draftId: string,
  membership: ActiveMembership,
  database: DbClient = db,
) {
  const draft = await database.faultDraft.findFirst({ where: draftWhere(draftId, membership) });
  if (!draft) throw new FaultDraftNotFoundError();
  const mediaCount = await database.mediaAsset.count({
    where: { draftId: draft.id, state: MediaState.DRAFT },
  });
  if (mediaCount >= 5)
    throw new FaultDraftConflictError("A draft can contain at most five photos.");
}

export async function expireFaultDrafts(now = new Date(), database: DbClient = db) {
  const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const drafts = await database.faultDraft.findMany({
    where: { updatedAt: { lt: cutoff } },
    select: { id: true },
  });
  const pendingMedia: Array<{ id: string; cloudinaryPublicId: string }> = [];
  for (const draft of drafts) {
    await database.$transaction(async (tx) => {
      const media = await tx.mediaAsset.findMany({
        where: { draftId: draft.id, state: MediaState.DRAFT },
        select: { id: true, cloudinaryPublicId: true },
      });
      pendingMedia.push(...media);
      await tx.mediaAsset.updateMany({
        where: { draftId: draft.id, state: MediaState.DRAFT },
        data: { draftId: null, state: MediaState.DELETE_PENDING },
      });
      await tx.faultDraft.delete({ where: { id: draft.id } });
    });
  }
  return { expiredDrafts: drafts.length, pendingMedia };
}

export function draftErrorCode(error: unknown): string {
  if (error instanceof AuthorizationError) return "FORBIDDEN";
  if (error instanceof FaultDraftNotFoundError) return "NOT_FOUND";
  if (error instanceof FaultDraftConflictError) return "DRAFT_CONFLICT";
  return "DRAFT_OPERATION_FAILED";
}
