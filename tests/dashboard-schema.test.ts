import assert from "node:assert/strict";
import test from "node:test";
import { dashboardQuerySchema } from "../src/features/dashboard/dashboard-schema.ts";

test("dashboard query accepts an optional bounded date input shape", () => {
  assert.deepEqual(dashboardQuerySchema.parse({ from: "2026-09-01", to: "2026-09-24" }), {
    from: "2026-09-01",
    to: "2026-09-24",
  });
  assert.deepEqual(dashboardQuerySchema.parse({}), {});
  assert.equal(dashboardQuerySchema.safeParse({ range: "30d" }).success, false);
  assert.equal(dashboardQuerySchema.safeParse({ from: "not-a-date" }).success, false);
  assert.equal(dashboardQuerySchema.safeParse({ from: "2026-02-31" }).success, false);
});
