import { MemberRole, MemberStatus, Prisma, StaffInvitationStatus } from "@prisma/client";
import { db } from "../../server/db";
import {
  AuthorizationError,
  assertManager,
  clerkRoleForMemberRole,
  type ActiveMembership,
} from "./role-policy";
import type { StaffInvitationInput, StaffRoleInput } from "./staff-schema";

type DbClient = typeof db;

type StaffClerkClient = {
  createOrganizationInvitation(input: {
    organizationId: string;
    emailAddress: string;
    role: "org:admin" | "org:member";
    inviterUserId: string;
    redirectUrl?: string;
  }): Promise<{ id: string; expiresAt: number }>;
  updateOrganizationMembership(input: {
    organizationId: string;
    userId: string;
    role: "org:admin" | "org:member";
  }): Promise<unknown>;
  deleteOrganizationMembership(input: { organizationId: string; userId: string }): Promise<unknown>;
};

export class StaffConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StaffConflictError";
  }
}

// This function finds the active membership of a user in the gym. It returns the membership details if found, or null if not found.
export async function findActiveMembership(userId: string, database: DbClient = db) {
  return database.gymMember.findFirst({
    where: { user: { clerkUserId: userId }, status: MemberStatus.ACTIVE },
    include: { gym: true, user: true },
  }) as Promise<ActiveMembership | null>;
}

export async function listStaff(membership: ActiveMembership, database: DbClient = db) {
  assertManager(membership);
  const [members, invitations] = await Promise.all([
    database.gymMember.findMany({
      where: { gymId: membership.gymId },
      include: { user: true },
    }),
    database.staffInvitation.findMany({
      where: { gymId: membership.gymId, status: StaffInvitationStatus.PENDING },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return { members, invitations };
}

export async function inviteStaff(
  input: StaffInvitationInput,
  idempotencyKey: string,
  membership: ActiveMembership,
  clerk: StaffClerkClient,
  requestId: string,
  database: DbClient = db,
) {
  // Ensure that the user has manager privileges before proceeding with the invitation
  assertManager(membership);

  // Check if an invitation with the same idempotency key already exists for this gym. This prevents duplicate invitations.
  const existingKey = await database.staffInvitation.findUnique({
    where: { gymId_idempotencyKey: { gymId: membership.gymId, idempotencyKey } },
  });

  // If an invitation with the same idempotency key already exists, check if the details match. If they do, return the existing invitation; otherwise, throw a conflict error.
  if (existingKey) {
    if (existingKey.email !== input.email || existingKey.role !== input.role)
      throw new StaffConflictError(
        "The idempotency key was already used for different invitation details.",
      );
    return existingKey;
  }
  const existingMember = await database.gymMember.findFirst({
    where: {
      gymId: membership.gymId,
      user: { email: input.email },
      status: { in: [MemberStatus.ACTIVE, MemberStatus.INVITED] },
    },
  });
  if (existingMember) throw new StaffConflictError("This email already belongs to the gym.");
  const existingInvitation = await database.staffInvitation.findFirst({
    where: { gymId: membership.gymId, email: input.email, status: StaffInvitationStatus.PENDING },
  });
  if (existingInvitation)
    throw new StaffConflictError("This email already has a pending invitation.");

  const invitation = await clerk.createOrganizationInvitation({
    organizationId: membership.gym.clerkOrganizationId,
    emailAddress: input.email,
    role: clerkRoleForMemberRole(input.role === "MANAGER" ? MemberRole.MANAGER : MemberRole.STAFF),
    inviterUserId: membership.user.clerkUserId,
    redirectUrl: new URL(
      "/accept-invitation",
      process.env.APP_URL ?? "http://localhost:3000",
    ).toString(),
  });
  return database.$transaction(async (tx) => {
    const saved = await tx.staffInvitation.create({
      data: {
        gymId: membership.gymId,
        invitedByMemberId: membership.id,
        clerkInvitationId: invitation.id,
        idempotencyKey,
        email: input.email,
        role: input.role,
        status: StaffInvitationStatus.PENDING,
        expiresAt: new Date(invitation.expiresAt),
      },
    });
    await tx.auditEvent.create({
      data: {
        gymId: membership.gymId,
        actorMemberId: membership.id,
        entityType: "StaffInvitation",
        entityId: saved.id,
        action: "STAFF_INVITED",
        metadata: { role: input.role },
        requestId,
      },
    });
    return saved;
  });
}

// this function changes the role of a staff member in the gym. It checks if the user has manager privileges, verifies the target member's existence and status, updates the role in Clerk, and records the change in the database with an audit event.
export async function changeStaffRole(
  memberId: string,
  input: StaffRoleInput,
  membership: ActiveMembership,
  clerk: StaffClerkClient,
  requestId: string,
  database: DbClient = db,
) {
  assertManager(membership);
  const target = await database.gymMember.findFirst({
    where: { id: memberId, gymId: membership.gymId },
    include: { user: true },
  });
  if (!target || target.status === MemberStatus.DEACTIVATED)
    throw new StaffConflictError("Staff member not found.");
  const nextRole = input.role === "MANAGER" ? MemberRole.MANAGER : MemberRole.STAFF;
  if (target.role === nextRole) return target;
  if (target.role === MemberRole.MANAGER && nextRole === MemberRole.STAFF)
    await ensureAnotherManager(membership.gymId, target.id, database);
  await clerk.updateOrganizationMembership({
    organizationId: membership.gym.clerkOrganizationId,
    userId: target.user.clerkUserId,
    role: clerkRoleForMemberRole(nextRole),
  });
  return database.$transaction(async (tx) => {
    const updated = await tx.gymMember.update({
      where: { id: target.id },
      data: { role: nextRole },
    });
    await tx.auditEvent.create({
      data: {
        gymId: membership.gymId,
        actorMemberId: membership.id,
        entityType: "GymMember",
        entityId: target.id,
        action: "MEMBERSHIP_ROLE_CHANGED",
        metadata: { fromRole: target.role, toRole: nextRole },
        requestId,
      },
    });
    return updated;
  });
}

export async function deactivateStaff(
  memberId: string,
  membership: ActiveMembership,
  clerk: StaffClerkClient,
  requestId: string,
  database: DbClient = db,
) {
  assertManager(membership);
  const target = await database.gymMember.findFirst({
    where: { id: memberId, gymId: membership.gymId },
    include: { user: true },
  });
  if (!target || target.status === MemberStatus.DEACTIVATED)
    throw new StaffConflictError("Staff member not found.");
  if (target.id === membership.id)
    throw new StaffConflictError("You cannot deactivate your own membership.");
  if (target.role === MemberRole.MANAGER)
    await ensureAnotherManager(membership.gymId, target.id, database);
  await clerk.deleteOrganizationMembership({
    organizationId: membership.gym.clerkOrganizationId,
    userId: target.user.clerkUserId,
  });
  return database.$transaction(async (tx) => {
    const updated = await tx.gymMember.update({
      where: { id: target.id },
      data: { status: MemberStatus.DEACTIVATED, deactivatedAt: new Date() },
    });
    await tx.auditEvent.create({
      data: {
        gymId: membership.gymId,
        actorMemberId: membership.id,
        entityType: "GymMember",
        entityId: target.id,
        action: "MEMBERSHIP_DEACTIVATED",
        metadata: {},
        requestId,
      },
    });
    return updated;
  });
}

async function ensureAnotherManager(gymId: string, targetId: string, database: DbClient) {
  const count = await database.gymMember.count({
    where: { gymId, role: MemberRole.MANAGER, status: MemberStatus.ACTIVE, NOT: { id: targetId } },
  });
  if (count === 0) throw new StaffConflictError("The gym must retain at least one active manager.");
}

export function staffErrorCode(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) return `PRISMA_${error.code}`;
  if (error instanceof AuthorizationError) return "FORBIDDEN";
  return "STAFF_OPERATION_FAILED";
}
