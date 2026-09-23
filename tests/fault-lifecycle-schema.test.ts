import assert from "node:assert/strict";
import test from "node:test";
import {
  faultCloseSchema,
  faultReopenSchema,
  faultResolveSchema,
  faultUpdateSchema,
} from "../src/features/faults/lifecycle-schema.ts";

test("lifecycle schemas require the current version", () => {
  assert.equal(faultUpdateSchema.safeParse({ body: "Motor inspected", version: 2 }).success, true);
  assert.equal(faultUpdateSchema.safeParse({ body: "", version: 2 }).success, false);
  assert.equal(
    faultResolveSchema.safeParse({ resolutionSummary: "Replaced belt", version: 2 }).success,
    true,
  );
  assert.equal(faultReopenSchema.safeParse({ reason: "Repair failed", version: 2 }).success, true);
});

test("closure accepts non-negative repair cost and optional equipment status", () => {
  assert.equal(
    faultCloseSchema.safeParse({ version: 3, repairCost: "125.50", equipmentStatus: "AVAILABLE" })
      .success,
    true,
  );
  assert.equal(faultCloseSchema.safeParse({ version: 3, repairCost: -1 }).success, false);
});
