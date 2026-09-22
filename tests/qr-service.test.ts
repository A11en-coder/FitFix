import assert from "node:assert/strict";
import test from "node:test";
import { createEquipmentQrPng, equipmentPageUrl } from "../src/features/equipment/qr-service.ts";

test("equipment QR URLs use the opaque public ID and configured app URL", () => {
  assert.equal(
    equipmentPageUrl("https://fitfix.example", "ABC123"),
    "https://fitfix.example/equipment/ABC123",
  );
});

test("equipment QR URLs encode public IDs safely", () => {
  assert.equal(
    equipmentPageUrl("https://fitfix.example/", "ABC/123"),
    "https://fitfix.example/equipment/ABC%2F123",
  );
});

test("equipment QR generation returns a PNG image", async () => {
  const png = await createEquipmentQrPng(equipmentPageUrl("https://fitfix.example", "ABC123"));

  assert.ok(png.length > 100);
  assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
});
