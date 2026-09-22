import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  equipmentCreateSchema,
  equipmentSearchSchema,
  equipmentUpdateSchema,
} from "../src/features/equipment/equipment-schema.ts";

describe("equipment schemas", () => {
  it("applies the available default and rejects unknown fields", () => {
    assert.deepEqual(
      equipmentCreateSchema.parse({
        assetId: "TREADMILL-01",
        name: "Treadmill",
        category: "Cardio",
        location: "Main floor",
      }),
      {
        assetId: "TREADMILL-01",
        name: "Treadmill",
        category: "Cardio",
        location: "Main floor",
        currentStatus: "AVAILABLE",
      },
    );
    assert.throws(() =>
      equipmentCreateSchema.parse({
        assetId: "TREADMILL-01",
        name: "Treadmill",
        category: "Cardio",
        location: "Main floor",
        unexpected: true,
      }),
    );
  });

  it("requires a version for updates and normalizes search filters", () => {
    assert.equal(equipmentUpdateSchema.parse({ version: 2, name: "Updated treadmill" }).version, 2);
    assert.deepEqual(equipmentSearchSchema.parse({ includeArchived: "true", limit: "10" }), {
      includeArchived: true,
      limit: 10,
    });
    assert.throws(() => equipmentUpdateSchema.parse({ name: "Missing version" }));
  });
});
