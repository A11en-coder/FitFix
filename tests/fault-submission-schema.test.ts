import assert from "node:assert/strict";
import test from "node:test";
import { faultSubmissionSchema } from "../src/features/faults/submission-schema.ts";

const validSubmission = {
  equipmentPublicId: "ABC123",
  title: "Loose cable",
  description: "The cable is frayed near the handle.",
  severity: "HIGH",
  equipmentStatus: "OUT_OF_SERVICE",
  discoveredAt: "2026-09-23T00:00:00.000Z",
  immediateAction: "Placed an out-of-service sign.",
  mediaAssetIds: [],
};

test("fault submissions require complete report details", () => {
  const parsed = faultSubmissionSchema.parse(validSubmission);
  assert.equal(parsed.severity, "HIGH");
  assert.equal(parsed.mediaAssetIds.length, 0);
  assert.throws(() => faultSubmissionSchema.parse({ ...validSubmission, title: "" }));
  assert.throws(() =>
    faultSubmissionSchema.parse({
      ...validSubmission,
      discoveredAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    }),
  );
  assert.throws(() => faultSubmissionSchema.parse({ ...validSubmission, unexpected: true }));
});

test("fault submissions accept an optional draft and up to five media assets", () => {
  const parsed = faultSubmissionSchema.parse({
    ...validSubmission,
    draftId: "11111111-1111-4111-8111-111111111111",
    mediaAssetIds: ["11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222"],
    version: 2,
  });
  assert.equal(parsed.version, 2);
  assert.equal(parsed.mediaAssetIds.length, 2);
  assert.throws(() =>
    faultSubmissionSchema.parse({
      ...validSubmission,
      mediaAssetIds: Array.from({ length: 6 }, () => "11111111-1111-4111-8111-111111111111"),
    }),
  );
});
