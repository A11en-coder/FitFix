# FitFix security and operations guide

## Request tracing

API responses from hardened endpoints include `X-Request-Id` and the same identifier in the JSON error shape. Use that value to correlate route failures with structured application logs. Logs contain the route, outcome, duration, actor or gym identifiers when known, and a safe reason code. They must not contain secrets, authorization headers, provider payloads, email bodies, or uploaded media contents.

## Health and readiness

`GET /api/health` performs a lightweight database query. A successful response is a readiness signal. A `503` response means the application process is reachable but should not receive traffic until database connectivity is restored. The response intentionally does not expose connection details.

## Internal jobs

The outbox reconciliation and fault-draft cleanup routes require the `x-internal-job-secret` header. The value must match `INTERNAL_JOB_SECRET`; comparisons use constant-time semantics. Keep this secret server-side and configure the scheduler to send it as a secret. Unauthorized attempts are logged without recording the supplied value.

## Rate limiting

Authenticated invitation, upload-signature, and fault-submission routes have bounded per-process limits and return `429` with `Retry-After` guidance. The limiter is intentionally small and dependency-free for the current deployment. Because it is not shared across instances, production deployments should also configure platform or edge rate limiting before scaling horizontally.

## Webhooks and provider failures

Clerk webhook signatures continue to be verified before event processing. Every accepted event is recorded as `RECEIVED`, `PROCESSED`, or `FAILED`; failed processing returns a non-2xx response so Clerk can retry. Resend failures remain in the outbox for reconciliation, and Cloudinary cleanup failures remain `DELETE_PENDING` for a later retry.

## Incident checklist

1. Capture the affected request ID, timestamp, route, and user-facing error.
2. Check `/api/health` and database availability.
3. Search structured logs by request ID and then by route/event.
4. For invitations, inspect Clerk webhook delivery status and the local webhook-event record.
5. For email, inspect pending and failed outbox records before retrying reconciliation.
6. For media, confirm whether assets remain `DELETE_PENDING`; do not manually remove database rows before provider cleanup is understood.

## Release and recovery

Use [`RELEASE_CHECKLIST.md`](./RELEASE_CHECKLIST.md) for release evidence and [`RECOVERY_REHEARSAL.md`](./RECOVERY_REHEARSAL.md) for isolated backup, restore, and rollback rehearsals. These records should identify the reviewed commit and migration set without storing secrets or sensitive user data.
