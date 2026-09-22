import assert from "node:assert/strict";
import test from "node:test";
import {
  faultDraftCreateSchema,
  mediaRegistrationSchema,
  uploadSignatureSchema,
} from "../src/features/faults/draft-schema.ts";

test("fault drafts accept partial fields and reject unknown fields", () => {
  const parsed = faultDraftCreateSchema.parse({ title: "Loose cable", severity: "HIGH" });
  assert.equal(parsed.title, "Loose cable");
  assert.equal(parsed.severity, "HIGH");
  assert.throws(() => faultDraftCreateSchema.parse({ unexpected: true }));
});

test("media registration enforces the supported image contract", () => {
  const valid = mediaRegistrationSchema.parse({
    cloudinaryPublicId: "fitfix/gym/drafts/draft/photo",
    secureUrl: "https://res.cloudinary.com/demo/image/upload/photo.webp",
    mimeType: "image/webp",
    bytes: 1024,
    width: 640,
    height: 480,
  });
  assert.equal(valid.mimeType, "image/webp");
  assert.throws(() => mediaRegistrationSchema.parse({ ...valid, bytes: 10 * 1024 * 1024 + 1 }));
  assert.throws(() => mediaRegistrationSchema.parse({ ...valid, mimeType: "image/gif" }));
});

test("upload signatures require a draft and file metadata", () => {
  const parsed = uploadSignatureSchema.parse({
    draftId: "11111111-1111-4111-8111-111111111111",
    mimeType: "image/jpeg",
    bytes: 2048,
  });
  assert.equal(parsed.bytes, 2048);
  assert.throws(() => uploadSignatureSchema.parse({ ...parsed, draftId: "not-a-uuid" }));
});
