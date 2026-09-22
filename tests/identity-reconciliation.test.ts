import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  displayNameFromClerkData,
  mapClerkMembershipStatus,
  mapClerkRole,
  parseClerkWebhookEvent,
} from "../src/features/auth/identity-reconciliation.ts";
import { parseGymOnboardingInput } from "../src/features/auth/onboarding-schema.ts";

describe("identity reconciliation", () => {
  it("maps Clerk roles and lifecycle states to local policy values", () => {
    assert.equal(mapClerkRole("org:admin"), "MANAGER");
    assert.equal(mapClerkRole("org:member"), "STAFF");
    assert.equal(
      mapClerkMembershipStatus("organizationMembership.deleted", "active"),
      "DEACTIVATED",
    );
    assert.equal(mapClerkMembershipStatus("organizationMembership.created", "active"), "ACTIVE");
  });

  it("normalizes profile data without storing a raw provider payload", () => {
    assert.equal(
      displayNameFromClerkData({ public_user_data: { first_name: "Ada", last_name: "Lovelace" } }),
      "Ada Lovelace",
    );
  });

  it("validates onboarding input and rejects unknown fields", () => {
    assert.deepEqual(
      parseGymOnboardingInput({ name: "Northside Fitness", slug: "northside-fitness" }),
      {
        name: "Northside Fitness",
        slug: "northside-fitness",
        timeZone: "Australia/Sydney",
        currencyCode: "AUD",
      },
    );
    assert.throws(() => parseGymOnboardingInput({ name: "A", slug: "bad_slug", extra: true }));
  });

  it("requires a verified event-shaped payload before reconciliation", () => {
    assert.deepEqual(
      parseClerkWebhookEvent({ id: "evt_1", type: "organization.created", data: { id: "org_1" } })
        .id,
      "evt_1",
    );
    assert.throws(() => parseClerkWebhookEvent({ type: "organization.created", data: {} }));
  });
});
