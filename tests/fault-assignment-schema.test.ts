import assert from "node:assert/strict";
import test from "node:test";
import { faultAssignmentSchema } from "../src/features/faults/assignment-schema.ts";

test("fault assignment accepts one internal assignee", () => {
  const result = faultAssignmentSchema.safeParse({
    assigneeType: "INTERNAL",
    assigneeMemberId: "00000000-0000-4000-8000-000000000001",
    targetDate: "2030-01-15",
    version: 2,
  });
  assert.equal(result.success, true);
});

test("fault assignment accepts a new external technician", () => {
  const result = faultAssignmentSchema.safeParse({
    assigneeType: "EXTERNAL",
    externalTechnician: { name: "Northside Repairs", email: "repairs@example.com" },
    targetDate: "2030-01-15",
    version: 2,
  });
  assert.equal(result.success, true);
  assert.equal(
    faultAssignmentSchema.safeParse({
      assigneeType: "EXTERNAL",
      targetDate: "2030-01-15",
      version: 2,
    }).success,
    false,
  );
});
