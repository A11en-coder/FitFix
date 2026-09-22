import { MemberRole, MemberStatus, Prisma } from "@prisma/client";
import type { Organization } from "@clerk/backend";
import { db } from "../../server/db";
import {
  displayNameFromClerkData,
  emailFromClerkData,
  mapClerkMembershipStatus,
  mapClerkRole,
  asRecord,
  stringValue,
} from "./identity-reconciliation";
import type { GymOnboardingInput } from "./onboarding-schema";

type OrganizationClient = {
  createOrganization(input: {
    name: string;
    slug: string;
    createdBy: string;
  }): Promise<Organization>;
  getOrganization(input: { slug: string } | { organizationId: string }): Promise<Organization>;
};

type DbClient = typeof db;

export class GymAlreadyExistsError extends Error {
  constructor() {
    super("The signed-in user already belongs to a gym.");
    this.name = "GymAlreadyExistsError";
  }
}

export async function createGymForUser(
  input: GymOnboardingInput,
  user: { clerkUserId: string; displayName: string; email: string },
  clerk: OrganizationClient,
  database: DbClient = db,
) {
  const existing = await database.gymMember.findFirst({
    where: {
      user: { clerkUserId: user.clerkUserId },
      status: { in: [MemberStatus.ACTIVE, MemberStatus.INVITED] },
    },
    include: { gym: true },
  });
  if (existing) throw new GymAlreadyExistsError();

  // Find or create the organization in Clerk
  const organization = await findOrCreateOrganization(input, user.clerkUserId, clerk);

  // Create or update the gym and user profile in the database within a transaction
  return database.$transaction(async (tx) => {
    const profile = await tx.userProfile.upsert({
      where: { clerkUserId: user.clerkUserId },
      create: { clerkUserId: user.clerkUserId, displayName: user.displayName, email: user.email },
      update: { displayName: user.displayName, email: user.email, deletedAt: null },
    });
    const existingGym = await tx.gym.findFirst({
      where: { OR: [{ clerkOrganizationId: organization.id }, { slug: input.slug }] },
    });
    const savedGym = existingGym
      ? await tx.gym.update({
          where: { id: existingGym.id },
          data: {
            clerkOrganizationId: organization.id,
            name: input.name,
            slug: input.slug,
            timeZone: input.timeZone,
            currencyCode: input.currencyCode,
          },
        })
      : await tx.gym.create({
          data: {
            clerkOrganizationId: organization.id,
            name: input.name,
            slug: input.slug,
            timeZone: input.timeZone,
            currencyCode: input.currencyCode,
          },
        });

    // Add the user as a manager of the gym
    await tx.gymMember.upsert({
      where: { gymId_userId: { gymId: savedGym.id, userId: profile.id } },
      create: {
        gymId: savedGym.id,
        userId: profile.id,
        role: MemberRole.MANAGER,
        status: MemberStatus.ACTIVE,
        joinedAt: new Date(),
      },
      update: {
        role: MemberRole.MANAGER,
        status: MemberStatus.ACTIVE,
        joinedAt: new Date(),
        deactivatedAt: null,
      },
    });
    return savedGym;
  });
}

async function findOrCreateOrganization(
  input: GymOnboardingInput,
  userId: string,
  clerk: OrganizationClient,
) {
  try {
    const existing = await clerk.getOrganization({ slug: input.slug });
    if (existing.createdBy !== userId) throw new Error("The gym slug is already in use.");
    return existing;
  } catch (error) {
    if (error instanceof Error && error.message === "The gym slug is already in use.") throw error;
    try {
      return await clerk.createOrganization({
        name: input.name,
        slug: input.slug,
        createdBy: userId,
      });
    } catch (createError) {
      const existing = await clerk.getOrganization({ slug: input.slug });
      if (existing.createdBy !== userId) throw createError;
      return existing;
    }
  }
}

export async function reconcileClerkWebhook(
  eventType: string,
  data: Record<string, unknown>,
  database: DbClient = db,
) {
  if (eventType.startsWith("organizationInvitation.")) {
    const invitationId = stringValue(data.id);
    if (!invitationId) return;
    const status = eventType.endsWith("revoked")
      ? "REVOKED"
      : eventType.endsWith("accepted")
        ? "ACCEPTED"
        : undefined;
    if (status)
      await database.staffInvitation.updateMany({
        where: { clerkInvitationId: invitationId },
        data: { status },
      });
    return;
  }
  if (eventType === "organization.created") {
    const organizationId = stringValue(data.id);
    if (!organizationId) return;
    await database.gym.upsert({
      where: { clerkOrganizationId: organizationId },
      create: {
        clerkOrganizationId: organizationId,
        name: stringValue(data.name) ?? "New gym",
        slug: stringValue(data.slug) ?? organizationId.toLowerCase(),
        timeZone: "Etc/UTC",
        currencyCode: "AUD",
      },
      update: {
        name: stringValue(data.name) ?? undefined,
        slug: stringValue(data.slug) ?? undefined,
      },
    });
    return;
  }
  if (!eventType.startsWith("organizationMembership.")) return;

  const organization = asRecord(data.organization);
  const organizationId = stringValue(organization.id) ?? stringValue(data.organization_id);
  const clerkUserId =
    stringValue(asRecord(data.public_user_data).user_id) ?? stringValue(data.public_user_id);
  if (!organizationId || !clerkUserId) return;
  const gym = await database.gym.findUnique({ where: { clerkOrganizationId: organizationId } });
  if (!gym) return;

  const profile = await database.userProfile.upsert({
    where: { clerkUserId },
    create: {
      clerkUserId,
      displayName: displayNameFromClerkData(data),
      email: emailFromClerkData(data),
    },
    update: {
      displayName: displayNameFromClerkData(data),
      email: emailFromClerkData(data),
      deletedAt: null,
    },
  });
  const status = mapClerkMembershipStatus(eventType, data.status);
  await database.gymMember.upsert({
    where: { gymId_userId: { gymId: gym.id, userId: profile.id } },
    create: {
      gymId: gym.id,
      userId: profile.id,
      role: mapClerkRole(data.role),
      status,
      joinedAt: status === "ACTIVE" ? new Date() : null,
      deactivatedAt: status === "DEACTIVATED" ? new Date() : null,
    },
    update: {
      role: mapClerkRole(data.role),
      status,
      joinedAt: status === "ACTIVE" ? new Date() : undefined,
      deactivatedAt: status === "DEACTIVATED" ? new Date() : null,
    },
  });
  if (status === "ACTIVE") {
    await database.staffInvitation.updateMany({
      where: { gymId: gym.id, email: emailFromClerkData(data), status: "PENDING" },
      data: { status: "ACCEPTED" },
    });
  }
}

export function webhookErrorCode(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) return `PRISMA_${error.code}`;
  return "RECONCILIATION_FAILED";
}
