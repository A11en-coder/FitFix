import { EquipmentStatus, MemberStatus, Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { db } from "../../server/db";
import { AuthorizationError, assertManager, type ActiveMembership } from "../auth/role-policy";
import type {
  EquipmentArchiveInput,
  EquipmentCreateInput,
  EquipmentSearchInput,
  EquipmentUpdateInput,
} from "./equipment-schema";

type DbClient = typeof db;

export class EquipmentNotFoundError extends Error {
  constructor() {
    super("Equipment not found.");
    this.name = "EquipmentNotFoundError";
  }
}

export class EquipmentConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EquipmentConflictError";
  }
}

export async function listEquipment(
  membership: ActiveMembership,
  input: EquipmentSearchInput,
  database: DbClient = db,
) {
  const where: Prisma.EquipmentWhereInput = {
    gymId: membership.gymId,
    ...(input.q
      ? {
          OR: [
            { name: { contains: input.q, mode: "insensitive" } },
            { assetId: { contains: input.q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(input.category ? { category: { equals: input.category, mode: "insensitive" } } : {}),
    ...(input.location ? { location: { equals: input.location, mode: "insensitive" } } : {}),
    ...(input.status ? { currentStatus: input.status as EquipmentStatus } : {}),
    ...(!input.includeArchived && !input.status ? { archivedAt: null } : {}),
  };
  const items = await database.equipment.findMany({
    where,
    orderBy: { publicId: "asc" },
    take: input.limit + 1,
    ...(input.cursor ? { cursor: { publicId: input.cursor }, skip: 1 } : {}),
  });
  const hasMore = items.length > input.limit;
  const page = hasMore ? items.slice(0, input.limit) : items;
  return {
    items: page,
    nextCursor: hasMore ? (page[page.length - 1]?.publicId ?? null) : null,
    canManage: membership.role === "MANAGER",
  };
}

export async function getEquipment(
  publicId: string,
  membership: ActiveMembership,
  database: DbClient = db,
) {
  const equipment = await database.equipment.findFirst({
    where: { publicId, gymId: membership.gymId },
    include: { statusIntervals: { orderBy: { startedAt: "desc" }, take: 20 } },
  });
  if (!equipment) throw new EquipmentNotFoundError();
  return { equipment, canManage: membership.role === "MANAGER" };
}

// this function creates a new equipment record in the database, along with an initial status interval and an audit event
export async function createEquipment(
  input: EquipmentCreateInput,
  membership: ActiveMembership,
  requestId: string,
  database: DbClient = db,
) {
  // ensure that the user has the "MANAGER" role 
  assertManager(membership);
  const publicId = randomUUID().replaceAll("-", "").slice(0, 26).toUpperCase();
  try {
    return await database.$transaction(async (tx) => {
      const equipment = await tx.equipment.create({
        data: { ...input, publicId, gymId: membership.gymId },
      });
      await tx.equipmentStatusInterval.create({
        data: {
          equipmentId: equipment.id,
          status: equipment.currentStatus,
          changedByMemberId: membership.id,
        },
      });
      await tx.auditEvent.create({
        data: {
          gymId: membership.gymId,
          actorMemberId: membership.id,
          entityType: "Equipment",
          entityId: equipment.id,
          action: "EQUIPMENT_CREATED",
          metadata: { publicId: equipment.publicId, assetId: equipment.assetId },
          requestId,
        },
      });
      return equipment;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      throw new EquipmentConflictError(
        "An equipment asset with this ID already exists in the gym.",
      );
    throw error;
  }
}

export async function updateEquipment(
  publicId: string,
  input: EquipmentUpdateInput,
  membership: ActiveMembership,
  requestId: string,
  database: DbClient = db,
) {
  assertManager(membership);
  const current = await database.equipment.findFirst({
    where: { publicId, gymId: membership.gymId },
  });
  if (!current) throw new EquipmentNotFoundError();
  if (current.archivedAt) throw new EquipmentConflictError("Archived equipment cannot be edited.");
  if (current.version !== input.version)
    throw new EquipmentConflictError(
      "Equipment was changed by another manager. Refresh and try again.",
    );
  const { version, currentStatus, ...data } = input;
  return database.$transaction(async (tx) => {
    const updated = await tx.equipment.update({
      where: { id: current.id },
      data: { ...data, ...(currentStatus ? { currentStatus } : {}), version: { increment: 1 } },
    });
    if (currentStatus && currentStatus !== current.currentStatus)
      await changeStatusInterval(tx, current.id, currentStatus, membership.id);
    await tx.auditEvent.create({
      data: {
        gymId: membership.gymId,
        actorMemberId: membership.id,
        entityType: "Equipment",
        entityId: current.id,
        action: "EQUIPMENT_UPDATED",
        metadata: { version: updated.version },
        requestId,
      },
    });
    return updated;
  });
}

export async function archiveEquipment(
  publicId: string,
  input: EquipmentArchiveInput,
  membership: ActiveMembership,
  requestId: string,
  database: DbClient = db,
) {
  assertManager(membership);
  const current = await database.equipment.findFirst({
    where: { publicId, gymId: membership.gymId },
  });
  if (!current) throw new EquipmentNotFoundError();
  if (current.archivedAt) return current;
  if (current.version !== input.version)
    throw new EquipmentConflictError(
      "Equipment was changed by another manager. Refresh and try again.",
    );
  return database.$transaction(async (tx) => {
    const updated = await tx.equipment.update({
      where: { id: current.id },
      data: {
        currentStatus: EquipmentStatus.ARCHIVED,
        archivedAt: new Date(),
        version: { increment: 1 },
      },
    });
    await changeStatusInterval(tx, current.id, EquipmentStatus.ARCHIVED, membership.id);
    await tx.auditEvent.create({
      data: {
        gymId: membership.gymId,
        actorMemberId: membership.id,
        entityType: "Equipment",
        entityId: current.id,
        action: "EQUIPMENT_ARCHIVED",
        metadata: {},
        requestId,
      },
    });
    return updated;
  });
}

async function changeStatusInterval(
  tx: Prisma.TransactionClient,
  equipmentId: string,
  status: EquipmentStatus,
  changedByMemberId: string,
) {
  const now = new Date();
  await tx.equipmentStatusInterval.updateMany({
    where: { equipmentId, endedAt: null },
    data: { endedAt: now },
  });
  await tx.equipmentStatusInterval.create({
    data: { equipmentId, status, changedByMemberId, startedAt: now },
  });
}

export function equipmentErrorCode(error: unknown): string {
  if (error instanceof AuthorizationError) return "FORBIDDEN";
  if (error instanceof EquipmentNotFoundError) return "NOT_FOUND";
  if (error instanceof EquipmentConflictError) return "EQUIPMENT_CONFLICT";
  return "EQUIPMENT_OPERATION_FAILED";
}
