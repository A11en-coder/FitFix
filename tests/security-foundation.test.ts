import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isAuthorizedInternalJob } from "../src/server/internal-job.ts";
import { redactLogContext } from "../src/server/logger.ts";
import { consumeRateLimit, resetRateLimits } from "../src/server/rate-limit.ts";

describe("security foundation", () => {
  it("redacts secrets and nested provider payloads from log context", () => {
    const redacted = redactLogContext({
      requestId: "req_1",
      apiKey: "secret-value",
      nested: { authorization: "Bearer token", safe: "visible" },
    });
    assert.deepEqual(redacted, {
      requestId: "req_1",
      apiKey: "[REDACTED]",
      nested: { authorization: "[REDACTED]", safe: "visible" },
    });
  });

  it("uses a bounded window and returns retry guidance", () => {
    resetRateLimits();
    assert.equal(consumeRateLimit("test", { limit: 2, windowMs: 1_000 }, 0).allowed, true);
    assert.equal(consumeRateLimit("test", { limit: 2, windowMs: 1_000 }, 1).allowed, true);
    const limited = consumeRateLimit("test", { limit: 2, windowMs: 1_000 }, 2);
    assert.equal(limited.allowed, false);
    assert.equal(limited.retryAfterSeconds, 1);
    assert.equal(consumeRateLimit("test", { limit: 2, windowMs: 1_000 }, 1_001).allowed, true);
  });

  it("authorizes internal jobs with constant-time-safe comparison semantics", () => {
    const previous = process.env.INTERNAL_JOB_SECRET;
    process.env.INTERNAL_JOB_SECRET = "job-secret";
    assert.equal(
      isAuthorizedInternalJob(
        new Request("http://localhost", { headers: { "x-internal-job-secret": "job-secret" } }),
      ),
      true,
    );
    assert.equal(
      isAuthorizedInternalJob(
        new Request("http://localhost", { headers: { "x-internal-job-secret": "wrong" } }),
      ),
      false,
    );
    if (previous === undefined) delete process.env.INTERNAL_JOB_SECRET;
    else process.env.INTERNAL_JOB_SECRET = previous;
  });
});
