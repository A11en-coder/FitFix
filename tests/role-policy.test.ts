import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MemberRole, MemberStatus } from "@prisma/client";
import {
  assertActiveMembership,
  assertManager,
  AuthorizationError,
  clerkRoleForMemberRole,
} from "../src/features/auth/role-policy.ts";

const membership = {
  id: "member_1",
  gymId: "gym_1",
  role: MemberRole.MANAGER,
  status: MemberStatus.ACTIVE,
  gym: { clerkOrganizationId: "org_1" },
  user: { clerkUserId: "user_1", email: "manager@example.com", displayName: "Manager" },
};

describe("staff role policy", () => {
  it("allows active managers and maps local roles to Clerk roles", () => {
    assert.doesNotThrow(() => assertActiveMembership(membership));
    assert.doesNotThrow(() => assertManager(membership));
    assert.equal(clerkRoleForMemberRole(MemberRole.MANAGER), "org:admin");
    assert.equal(clerkRoleForMemberRole(MemberRole.STAFF), "org:member");
  });

  it("rejects inactive or staff members from manager actions", () => {
    assert.throws(
      () => assertActiveMembership({ ...membership, status: MemberStatus.DEACTIVATED }),
      AuthorizationError,
    );
    assert.throws(
      () => assertManager({ ...membership, role: MemberRole.STAFF }),
      AuthorizationError,
    );
  });
});
