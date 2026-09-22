// this file defines the role-based access control (RBAC) policies for the application, including the roles and permissions for different types of users. It also includes utility functions for checking user roles and asserting permissions.
import { MemberRole, MemberStatus } from "@prisma/client";

export class AuthorizationError extends Error {
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export type ActiveMembership = {
  id: string;
  gymId: string;
  role: MemberRole;
  status: MemberStatus;
  gym: { clerkOrganizationId: string }; // The associated gym's Clerk organization ID
  user: { clerkUserId: string; email: string; displayName: string }; // The associated user's Clerk user ID, email, and display name
};

// This function checks if the user has an active gym membership. If not, it throws an AuthorizationError.
export function assertActiveMembership(
  membership: ActiveMembership | null,
): asserts membership is ActiveMembership {
  if (!membership || membership.status !== MemberStatus.ACTIVE) {
    throw new AuthorizationError("An active gym membership is required.");
  }
}

// This function checks if the user has a manager role in the gym membership.
export function assertManager(membership: ActiveMembership): void {
  assertActiveMembership(membership);
  if (membership.role !== MemberRole.MANAGER) throw new AuthorizationError();
}

// This function maps a member role to the corresponding Clerk role for the organization. Managers are mapped to "org:admin", while regular members are mapped to "org:member".
export function clerkRoleForMemberRole(role: MemberRole): "org:admin" | "org:member" {
  return role === MemberRole.MANAGER ? "org:admin" : "org:member";
}
