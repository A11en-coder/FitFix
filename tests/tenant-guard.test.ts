import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertTenantResource, resolveTenantContext, TenantGuardError } from "../src/server/tenant-guard.ts";

describe("tenant guard", () => {
  it("resolves the gym from an active server-side membership", async () => {
    const context = await resolveTenantContext({ clerkUserId: "user_1" }, async (userId) => {
      assert.equal(userId, "user_1");
      return { gymId: "gym_a", status: "ACTIVE" };
    });
    assert.deepEqual(context, { gymId: "gym_a", clerkUserId: "user_1" });
  });

  it("denies missing or inactive membership", async () => {
    await assert.rejects(resolveTenantContext(null, async () => ({ gymId: "gym_a", status: "ACTIVE" })), TenantGuardError);
    await assert.rejects(resolveTenantContext({ clerkUserId: "user_1" }, async () => null), TenantGuardError);
  });

  it("does not reveal a cross-tenant resource", () => {
    assert.doesNotThrow(() => assertTenantResource({ gymId: "gym_a", clerkUserId: "user_1" }, "gym_a"));
    assert.throws(() => assertTenantResource({ gymId: "gym_a", clerkUserId: "user_1" }, "gym_b"), {
      name: "TenantGuardError",
      message: "Resource not found."
    });
  });
});
