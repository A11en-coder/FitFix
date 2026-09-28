import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { waitForActiveMembership } from "../src/features/auth/membership-readiness.ts";

describe("invitation membership readiness", () => {
  it("continues once the membership webhook has created an active membership", async () => {
    let checks = 0;
    const ready = await waitForActiveMembership(
      async () => {
        checks += 1;
        return checks === 3;
      },
      async () => {},
    );

    assert.equal(ready, true);
    assert.equal(checks, 3);
  });

  it("stops retrying after the bounded wait when membership is still pending", async () => {
    let checks = 0;
    const ready = await waitForActiveMembership(
      async () => {
        checks += 1;
        return false;
      },
      async () => {},
    );

    assert.equal(ready, false);
    assert.equal(checks, 9);
  });

  it("retries temporary readiness-check failures", async () => {
    let checks = 0;
    const ready = await waitForActiveMembership(
      async () => {
        checks += 1;
        if (checks === 1) throw new Error("temporary request failure");
        return true;
      },
      async () => {},
    );

    assert.equal(ready, true);
    assert.equal(checks, 2);
  });
});
