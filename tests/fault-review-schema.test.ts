import assert from "node:assert/strict";
import test from "node:test";
import { faultListQuerySchema, faultReviewSchema } from "../src/features/faults/review-schema.ts";

test("fault review requires a positive version and supported values", () => {
  const result = faultReviewSchema.safeParse({
    severity: "HIGH",
    equipmentStatus: "LIMITED",
    version: 3,
  });
  assert.equal(result.success, true);
  assert.equal(
    faultReviewSchema.safeParse({ severity: "HIGH", equipmentStatus: "LIMITED", version: 0 })
      .success,
    false,
  );
  assert.equal(
    faultReviewSchema.safeParse({
      severity: "HIGH",
      equipmentStatus: "LIMITED",
      version: 3,
      extra: true,
    }).success,
    false,
  );
});

test("fault list query applies a safe default limit", () => {
  const result = faultListQuerySchema.parse({ q: "treadmill", status: "REPORTED" });
  assert.equal(result.limit, 25);
  assert.equal(result.q, "treadmill");
  assert.equal(result.status, "REPORTED");
  assert.equal(result.active, false);
  assert.equal(result.assignedToMe, false);
  assert.equal(faultListQuerySchema.safeParse({ limit: 101 }).success, false);
});
