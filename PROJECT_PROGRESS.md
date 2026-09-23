# FitFix Project Progress

## Status

- **Assessment date:** 2026-09-24
- **Specification sources:** `docs/FitFix_Product_Requirements_Document.md` and `docs/FitFix_Technical_Requirements_Document.md`
- **Current phase:** Phase 7 — Release readiness
- **Current capability:** Portfolio MVP implementation complete; commercial launch evidence remains pending
- **Approval state:** Capability 17 complete and Gate 2 approved
- **Last capability commit:** `feat: add release and recovery evidence` (current `HEAD` after checkpoint)

## Completed capabilities

### 1. Project foundation and tenant-safe data layer

Completed and committed in `3c986e2 feat: establish FitFix foundation`.

Includes the Next.js shell, typed configuration, Prisma foundation schema and migration, request context, tenant guard, health endpoint, tests, lint, typecheck, build, and CI configuration.

### 2. Public entry points and authentication

Completed and committed in `83d5193 feat: add public entry points and authentication`.

Includes public pages, Clerk provider and middleware, sign-in/sign-up routes, protected workspace boundary, signed-in controls, and dashboard entry point.

### 3. Gym onboarding and local identity reconciliation

Completed and Gate 2 approved in the current working tree.

Implemented:

- Protected `/onboarding` page and gym setup form.
- `POST /api/gyms` for one-gym-per-user workspace creation.
- Clerk Organization creation/reuse with the creator as Clerk administrator.
- Local `Gym`, `UserProfile`, and active manager `GymMember` creation in a transaction.
- Strict Zod onboarding validation.
- Verified `/api/webhooks/clerk` endpoint.
- Idempotent `WebhookEvent` ledger and replay-safe organization/membership reconciliation.
- Clerk-to-FitFix role and membership-state mapping helpers.
- Unit tests for validation, mapping, and webhook event parsing.
- Prettier configuration and scoped formatting scripts.

Relevant requirements: PRD FR-01; TRD FR-01, SP-02, TC-01, Clerk integration, identity reconciliation, and webhook replay safety.

### 4. Roles and staff management

Completed and Gate 2 approved in the current working tree.

Implemented:

- Manager-only staff listing, invitation, role-change, and deactivation APIs.
- Manager/staff policy guards based on active local `GymMember` membership.
- Clerk Organization invitations and membership role synchronization.
- Local `StaffInvitation` persistence with idempotency keys and invitation lifecycle status.
- Local `AuditEvent` records for invitation, role, and access changes.
- Last-manager and self-deactivation safeguards.
- Staff management page with retry-safe invitation UI, role controls, and deactivation controls.
- Webhook reconciliation for accepted and revoked organization invitations.
- Role policy tests and authorization-focused validation.

Relevant requirements: PRD FR-02 and FR-03; TRD FR-02, FR-03, TC-02, TC-03, the manager/staff policy matrix, membership auditability, and tenant isolation.

### 5. Equipment registry and archival

Completed and Gate 2 approved in the current working tree.

Implemented:

- Manager-only equipment creation, editing, and archival.
- Tenant-scoped equipment listing, search, and detail views for active members.
- Equipment status tracking with historical status intervals.
- Optimistic concurrency protection using equipment versions.
- Soft archival using `archivedAt` and the `ARCHIVED` status.
- Audit events for equipment creation, updates, and archival.
- Equipment registry, creation, and detail UI flows with archive confirmation.
- Prisma migration `0004_equipment_registry`, applied to Neon.
- Equipment schema validation tests.

Fault-report workflows remain intentionally deferred to later capabilities.

Relevant requirements: PRD FR-04 and FR-05; TRD FR-04, TC-04, TC-05, equipment archival, status history, auditability, and tenant isolation.

### 6. Equipment QR workflow

Completed and Gate 2 approved in the current working tree.

Implemented:

- Manager-only QR PNG generation for active equipment.
- QR payloads using `APP_URL` and the equipment's opaque `publicId`.
- Download action on the equipment detail page.
- Tenant-scoped lookup and archive protection for QR generation.
- Private, non-cacheable image responses with sanitized filenames.
- QR URL and PNG output tests.

The QR code identifies equipment but does not bypass Clerk authentication or local gym membership checks. Printable PDF labels remain a later enhancement.

Relevant requirements: PRD FR-05 and FR-19; TRD QR service mapping, TC-05, NFR-06, and NFR-08.

### 7. Fault-report drafts and media

Implemented and Gate 2 approved; ready for Git checkpoint.

Implemented:

- Fault draft creation, retrieval, optimistic-concurrency updates, and discard APIs.
- Tenant-safe draft access: managers can access gym drafts; staff can access their own drafts.
- Zod validation for draft fields, media metadata, MIME types, dimensions, and size limits.
- Fault draft and media Prisma models with migration `20260922111937_fault_drafts_and_media`.
- Direct browser-to-Cloudinary image uploads using server-generated signatures.
- Server-side media registration with Cloudinary URL, folder, tenant, size, and five-image limits.
- Audit events for draft creation, saving, and discard operations.
- Thirty-day draft expiration and retryable internal Cloudinary cleanup flow.
- Fault draft form with local draft resumption, image upload, save, and discard actions.

Relevant requirements: PRD FR-06 and FR-07; TRD fault drafts, media assets, signed uploads, retention cleanup, tenant isolation, and auditability.

### 8. Fault submission

Implemented and Gate 2 approved; ready for Git checkpoint.

Implemented:

- Active-member `POST /api/faults` submission endpoint.
- Permanent `FaultReport` and chronological `FaultUpdate` models.
- Draft-to-report conversion with optimistic version checking.
- Tenant-safe equipment and media ownership validation.
- Persisted idempotency keys and request fingerprints for retry-safe submissions.
- Immutable submitted evidence transition from `DRAFT` to `ATTACHED`.
- Reporter safety rule preventing restoration to a less restrictive equipment status.
- Equipment status interval updates linked to the originating fault.
- Initial fault timeline and `FAULT_REPORTED` audit event.
- Submission confirmation with a public fault reference.
- Retryable cleanup for media marked `DELETE_PENDING`.

Relevant requirements: PRD FR-06 and FR-07; TRD FaultReport, FaultUpdate, signed media attachment, idempotent submission, status history, auditability, and tenant integrity.

### 9. Manager review and prioritization

Implemented and Gate 2 approved; ready for Git checkpoint.

Implemented:

- Tenant-scoped fault registry and fault detail views for active members.
- Manager-only review endpoint and review form.
- Severity and equipment-status revision with optimistic version protection.
- `REPORTED` to `UNDER_REVIEW` transition, represented to the UI as the `REVIEWED` triage state.
- Equipment status interval updates linked to the reviewed fault.
- Fault timeline update and `FAULT_REVIEWED` audit event with before/after metadata.
- Historical fault retention; no one-fault-per-equipment constraint was introduced.
- Zod validation tests for review payloads and list filters.

Relevant requirements: PRD FR-08 and US-03; TRD fault review contract, manager authorization, status transitions, equipment status history, auditability, and tenant isolation.

### 10. Repair assignment

Implemented and Gate 2 approved; ready for Git checkpoint.

Implemented:

- Manager-only assignment endpoint for reviewed faults.
- Internal active-staff assignment with same-gym validation.
- External technician records with optional company and contact details.
- Required target repair date and optimistic version protection.
- `UNDER_REVIEW` to `ASSIGNED` transition.
- Exactly one internal or external assignment stored per fault.
- Assignment timeline update and `FAULT_ASSIGNED` audit event.
- Durable in-app notification creation for internal assignees.
- Assignment form integrated into the fault detail page.
- Prisma migration `20260923012853_repair_assignment`, applied to Neon.
- Assignment schema tests and validation coverage.

Notification listing, read state controls, and email delivery remain scheduled for capability 12.

Relevant requirements: PRD FR-09 and US-04; TRD assignment service, internal/external assignment rules, target dates, auditability, notification creation, and tenant isolation.

### 11. Fault lifecycle, updates, resolution, and closure

Implemented and Gate 2 approved; ready for Git checkpoint.

Implemented:

- Explicit lifecycle endpoints for start, updates, resolve, close, and reopen.
- Transition enforcement for `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`, and reopened states.
- Manager and internal-assignee authorization rules.
- Resolution summary and optional repair-cost recording.
- Manager-only verification, closure, and reopening.
- Required reasons for reopening.
- Chronological `FaultUpdate` records for comments, status changes, resolution, and reopening.
- Immutable `AuditEvent` records for lifecycle actions.
- Atomic lifecycle notifications for resolution, closure, and reopening.
- Lifecycle controls integrated into the fault detail UI.
- Prisma migration `20260923020455_fault_lifecycle`, applied to Neon.
- Lifecycle schema tests and validation coverage.

Relevant requirements: PRD FR-10, FR-11, FR-12, FR-14 and US-05 through US-07; TRD lifecycle transition table, update timeline, resolution and closure rules, auditability, notifications, and tenant isolation.

### 12. Notifications and email delivery

Implemented and Gate 2 approved; ready for Git checkpoint.

Implemented:

- Durable in-app notification creation for assignments and lifecycle events.
- Tenant-scoped notification listing, unread counts, and read-state updates.
- Notifications page and shared workspace navigation entry.
- Database-backed email outbox with retry metadata and delivery status.
- High-severity fault email enqueueing for active managers.
- Resend email delivery adapter with a retryable internal reconciliation route.
- Prisma migrations for the notification and email-outbox models.
- Dedicated Clerk invitation acceptance route using Clerk ticket sign-in/sign-up flows.
- Clerk webhook verification, Svix delivery deduplication, invitation reconciliation, and active membership reconciliation.
- Cleanup of temporary provider-diagnostic response details and legacy event-name compatibility helpers.

Relevant requirements: PRD FR-16, US-03, US-04, US-05, and the transactional email integration requirement; TRD notification contracts, email outbox, Resend integration, webhook verification, retry handling, and tenant isolation.

### 13. Equipment history, downtime, costs, search, and filters

Implemented and Gate 2 approved; ready for Git checkpoint.

Implemented:

- Tenant-scoped equipment history on the equipment detail endpoint and page.
- Chronological equipment status interval history.
- Total out-of-service duration calculation, including currently open intervals.
- Total repair-cost calculation across retained fault reports.
- Fault history links and active-fault summary on equipment details.
- Equipment search and filters for name/asset ID, category, location, status, and archived state.
- Fault search by reference, title, equipment name, and asset ID.
- Fault filters for lifecycle status, severity, and equipment public ID.
- Cursor pagination and load-more controls for equipment and fault registries.
- Correct archived-equipment semantics using `archivedAt` rather than the operational equipment status enum.
- Validation coverage for the expanded fault list query.

No schema migration was required; the existing status interval, fault lifecycle, repair-cost, and indexing foundations already supported this capability.

Relevant requirements: PRD FR-13, FR-14, and FR-15; TRD equipment history, downtime and cost summaries, search/filter contracts, cursor pagination, TC-12, TC-13, and tenant isolation.

### 14. Manager and staff dashboards

Implemented and Gate 2 approved; committed in `1fdeb10 feat: add manager and staff dashboards`.

Implemented:

- Role-aware `/dashboard` UI for managers and staff.
- Tenant-scoped `GET /api/dashboard` endpoint with bounded date ranges.
- Manager metrics for active faults, high severity, overdue repairs, and out-of-service equipment.
- Manager priority queue with severity, triage, outage, and overdue scoring.
- Manager availability breakdown, average resolution time, opened-versus-resolved trend, recurring equipment, and recent activity.
- Staff metrics for assigned tasks, personal reports, and current outages.
- Dashboard links into tenant-scoped equipment and fault filters.
- Active, high-severity, overdue, assigned-to-me, and reported-by-me fault filters.
- Responsive dashboard layout with loading, empty, and error states.
- Additive dashboard indexes for target-date and assignee/status queries.
- Dashboard date validation tests and expanded fault-filter coverage.

Relevant requirements: PRD FR-17 and US-09; TRD role-specific dashboard aggregates, `GET /api/dashboard`, TC-15, tenant isolation, bounded analytics ranges, and dashboard query indexes.

### 15. Responsive and accessible product completion

Implemented, Gate 2 approved, and committed in the current Git checkpoint.

Implemented:

- Shared role-aware workspace navigation with desktop and mobile layouts.
- Mobile bottom navigation with Home, Equipment, Report, Faults, and More actions.
- Skip-to-content navigation and active route indicators.
- Visible focus styles, keyboard-friendly controls, 44px touch targets, and reduced-motion support.
- Responsive filter, form, dashboard, card, and action layouts for phone, tablet, and desktop widths.
- Explicit loading, empty, success, retry, error, and disabled states across core interactive screens.
- Visible filter labels and grouped filter semantics for equipment and fault registries.
- Accessible confirmation dialogs for equipment archival, staff deactivation, and draft discard.
- Focus trapping, Escape handling, body-scroll locking, and focus restoration for dialogs.
- Fault form error summary with links to fields and focus on the first missing required field.
- Comprehensive Prettier scripts covering source and test files.

Relevant requirements: PRD NFR-01, NFR-02, NFR-04, NFR-05, NFR-08, NFR-09, NFR-12, NFR-14, and the responsive/accessibility behavior requirements; TRD NFR-01, NFR-02, NFR-04, NFR-05, NFR-08, NFR-09, NFR-12, NFR-14, TC-17, TC-18, TC-20, and TC-22.

### 16. Security, observability, and operational hardening

Implemented and Gate 2 approved; committed in `feat: harden security and operations`.

Implemented:

- Structured JSON logging with request IDs and redaction of secrets, tokens, provider payloads, and other sensitive values.
- Request ID response headers on hardened health, internal-job, invitation, upload, and webhook flows.
- Security response headers for content type, framing, referrer, permissions, and production transport security.
- Constant-time internal-job secret comparison shared by outbox reconciliation and fault-draft cleanup.
- Bounded per-process rate limits for staff invitations, upload signatures, and fault submissions with `429` retry guidance.
- Database-backed readiness checks for `GET /api/health`, returning `503` without exposing connection details when unavailable.
- Structured success, denial, duplicate, deferred-cleanup, and failure logging for key operational flows.
- Expanded environment validation for Cloudinary, internal-job, and email configuration, including production-only email requirements.
- Security foundation tests covering redaction, rate limiting, and internal-job authorization.
- Operational runbook covering request tracing, health checks, provider failures, rate limiting, and incident response.

No Prisma schema migration was required for this capability.

Relevant requirements: PRD NFR-06, NFR-07, NFR-14, release readiness, and deployment/operations requirements; TRD security controls, observability signals, failure/recovery behavior, rate limiting, request tracing, internal job protection, and release gates.

### 17. Release and recovery evidence

Implemented, Gate 2 approved, and committed in `feat: add release and recovery evidence`.

Implemented:

- CI PostgreSQL 16 service for clean-database migration rehearsal.
- CI formatting check and `prisma migrate deploy` execution using isolated credentials.
- `npm run db:deploy` script for repeatable migration deployment.
- Release checklist covering automated quality, environment, provider, migration, staging smoke, promotion, and monitoring gates.
- Recovery rehearsal guide covering backup/restore evidence, row-count and schema checks, tenant and lifecycle verification, and rollback procedure.
- Operations guide links to the release and recovery evidence documents.
- Explicit distinction between portfolio-MVP readiness and commercial-production prerequisites.

No application schema migration or production deployment was performed for this capability. The provider-specific backup and restore rehearsal remains a manual launch prerequisite.

Relevant requirements: PRD launch-readiness criteria and product dependencies; TRD deployment and rollout sequence, rollback runbook, recovery objectives, TC-23, operational gate, and launch gate.

## Verification

- Prettier check: passed.
- Typecheck: passed after the production build completed.
- Unit tests: 31 passed.
- ESLint: passed.
- Production build: passed; onboarding, equipment, QR, fault-draft, fault-submission, manager-review, assignment, and lifecycle API routes are present.
- Latest verification: 31 unit tests passed, typecheck passed, ESLint passed, Prettier passed, production build passed, and the dashboard route/page compiled successfully.
- Capability 16 verification: security foundation tests, typecheck, ESLint, Prettier, production build, Prisma validation with `.env.local`, and `git diff --check` passed.
- Capability 17 verification: typecheck, ESLint, Prettier, 31 unit tests, production build, Prisma schema validation, read-only Prisma `SELECT 1`, and `prisma migrate status` passed outside the restricted sandbox; 11 migrations were found and the Neon database was up to date.
- Capability 17 CI evidence: workflow configured with a PostgreSQL 16 service and clean-database `prisma migrate deploy`; the hosted workflow remains to be run by GitHub after push.
- Prisma schema validation with `.env.local`: passed.
- Dashboard migration deployment: passed. Neon migration `20260924010000_dashboard_indexes` was applied successfully, and `prisma migrate status` reports that the database schema is up to date.
- Neon connectivity: read-only `SELECT 1` passed.
- Earlier migration application: complete. Neon migration `20260922235107_fault_submission` was created and applied after `20260922111937_fault_drafts_and_media`; the later transient connectivity issue was resolved during dashboard migration verification.
- Capability 15 verification: Prettier, typecheck, ESLint, 28 unit tests, production build, `git diff --check`, public-page runtime rendering, and protected-route redirect checks passed. A provider-hosted Clerk sign-in page emitted minified React warnings during browser inspection; no corresponding local application or build error was observed.
- No live Clerk organization was created during verification.

Known non-blocking issue: `npm install` reported 5 dependency audit findings (1 moderate, 4 high). No forced audit upgrade was applied.

## Ordered capability roadmap

### Phase 1 — Foundation

1. Project foundation and tenant-safe data layer — complete.

### Phase 2 — Identity and workspace access

2. Public entry points and authentication — complete.
3. Gym onboarding and local identity reconciliation — complete and approved.
4. Roles and staff management — complete and approved.

### Phase 3 — Equipment and discovery

5. Equipment registry and archival — complete and approved.
6. Equipment QR workflow — complete and approved.

### Phase 4 — Fault intake

7. Fault-report drafts and media — complete and approved.
8. Fault submission — complete and approved.

### Phase 5 — Reactive-maintenance lifecycle

9. Manager review and prioritization — complete and approved.
10. Repair assignment — complete and approved.
11. Fault lifecycle, updates, resolution, and closure — complete and approved.
12. Notifications and email delivery — complete.

### Phase 6 — Operational insight

13. Equipment history, downtime, costs, search, and filters — complete.
14. Manager and staff dashboards — complete.

### Phase 7 — Release readiness

15. Responsive and accessible product completion — complete.
16. Security, observability, and operational hardening — complete.
17. Release and recovery evidence — complete.

Deferred from MVP: preventive maintenance, member reporting, multiple locations, authenticated technicians, inventory, billing, browser push, AI features, and custom profile/notification preferences.

## Next action

The approved portfolio MVP implementation is complete. Before any commercial production launch, complete the provider-specific backup/restore rehearsal, staging smoke flow, dependency/secret review, and final release checklist.
