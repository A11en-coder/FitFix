import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  notificationListSchema,
  notificationReadSchema,
} from "../src/features/notifications/notification-schema.ts";

describe("notification schemas", () => {
  it("normalizes list pagination and rejects unsafe limits", () => {
    assert.deepEqual(notificationListSchema.parse({ limit: "10" }), { limit: 10 });
    assert.throws(() => notificationListSchema.parse({ limit: "101" }));
    assert.throws(() => notificationListSchema.parse({ unexpected: true }));
  });

  it("requires exactly one read target", () => {
    assert.deepEqual(notificationReadSchema.parse({ markAll: true }), { markAll: true });
    assert.throws(() => notificationReadSchema.parse({}));
    assert.throws(() =>
      notificationReadSchema.parse({
        markAll: true,
        notificationId: "00000000-0000-0000-0000-000000000001",
      }),
    );
  });
});
