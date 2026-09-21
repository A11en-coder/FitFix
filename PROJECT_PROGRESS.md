# FitFix Project Progress

## Status

- **Assessment date:** 2026-09-21
- **Specification sources:** `docs/FitFix_Product_Requirements_Document.md` (PRD v1.0) and `docs/FitFix_Technical_Requirements_Document.md`
- **Current phase:** Pre-implementation intake and roadmap
- **Current capability:** None implemented
- **Approval state:** Waiting for Approval Gate 1 for the foundation capability
- **Last commit:** None; Git repository has no commits

## Current implementation state

The repository is specification-only. It contains the PRD, TRD, the guided implementation skill, an empty progress file, and a minimal `package.json`. There is currently no Next.js application, TypeScript configuration, UI, server code, Prisma schema or migrations, test harness, CI configuration, environment template, authentication integration, or deployment configuration.

Git is on `master` with no commits. Existing files are untracked. No implementation files have been changed during this intake.

## Ordered capability roadmap

The order follows the TRD implementation plan and dependency relationships. Each capability is implemented and approved independently before the next begins.

### Phase 1 — Foundation gate

1. **Project foundation and tenant-safe data layer** — establish the Next.js modular-monolith shell, typed configuration, design-token baseline, Prisma/PostgreSQL schema foundation, migration workflow, request identity/tenant context boundary, initial tenant-guard prototype, and CI quality checks. This is the first capability because every later feature depends on a runnable application, persistent data model, and trustworthy tenant isolation.

### Phase 2 — Identity and workspace access

2. **Public entry points and authentication** — public shell, sign-up/sign-in, Clerk session handling, and protected application boundary.
3. **Gym onboarding and local identity reconciliation** — create the local Gym from the authenticated Clerk organization and safely reconcile identity/membership events, including SP-02 replay behavior.
4. **Roles and staff management** — manager/staff policy matrix, invitations, membership synchronization, deactivation, and authorization tests.

### Phase 3 — Equipment and discovery

5. **Equipment registry and archival** — manager CRUD, asset IDs, locations, current equipment status, archive behavior, and status intervals.
6. **Equipment QR workflow** — opaque public equipment identifiers, QR resolution, downloadable/printable labels, and tenant-safe lookup.

### Phase 4 — Fault intake

7. **Fault-report drafts and media** — recoverable report fields, autosave/resume, signed Cloudinary uploads, attachment validation, draft-media lifecycle, and SP-05 cleanup.
8. **Fault submission** — QR and search entry paths, validation, duplicate-awareness, idempotent creation, initial status/triage state, confirmation, and audit/outbox records.

### Phase 5 — Reactive-maintenance lifecycle

9. **Manager review and prioritization** — review evidence, revise controlled priority/status fields, and record traceable changes.
10. **Repair assignment** — internal staff or external technician assignment, target date, exactly-one-assignee rules, and assignment notifications.
11. **Fault lifecycle, updates, resolution, and closure** — purpose-specific transitions, comments/timeline, optimistic concurrency, resolution summary, manager verification, cost recording, reopen reason, and SP-03 atomicity checks.
12. **Notifications and email delivery** — in-app notifications, Resend templates, transactional outbox, deduplication, retry/reconciliation, and SP-04.

### Phase 6 — Operational insight

13. **Equipment history, downtime, costs, search, and filters** — chronological history, status intervals, aggregates, indexed tenant-scoped queries, cursor pagination, and stable sorting.
14. **Manager and staff dashboards** — urgent/overdue/out-of-service metrics, filtered links, staff task view, trends, and performance validation.

### Phase 7 — Release readiness

15. **Responsive and accessible product completion** — responsive layouts, WCAG 2.2 AA checks, loading/empty/success/error states, form recovery, destructive confirmations, and browser coverage.
16. **Security, observability, and operational hardening** — cross-tenant attack matrix, structured request logs, audit review, rate limits, failure handling, provider checks, and runbooks.
17. **Release and recovery evidence** — user testing, demo data, migration/rollback rehearsal, backup/restore spike SP-06, deployment gates, launch checklist, and portfolio evidence.

Deferred from the MVP: preventive maintenance, member reporting, multiple locations, authenticated technicians, inventory, billing, browser push, AI features, and custom profile/notification preferences.

## First capability: Project foundation and tenant-safe data layer

### Purpose

Create the minimum trustworthy platform on which FitFix can be built. It should run locally, validate typed configuration, connect to PostgreSQL through Prisma, establish the tenant-owned data model and migration path, and provide a single server-side boundary for deriving the active gym from authenticated request context. It also produces the first automated tenant-isolation checks and CI quality gate.

### System role

This capability is the foundation gate from TRD Week 1. It does not implement sign-in, onboarding UI, equipment, faults, or business workflows. It defines the boundaries those capabilities must use: database integrity, server-only configuration, request context, authorization/tenant guard primitives, and repeatable verification.

### Dependencies

- Approved PRD/TRD scope and terminology.
- Node.js/npm and the selected Next.js/TypeScript toolchain.
- Development PostgreSQL/Neon connection details, with secrets kept outside source control.
- Prisma migration tooling.
- The SP-01 tenant-guard prototype and its negative authorization matrix.

Clerk is a later capability dependency for real session identity; the foundation should keep the identity-to-gym boundary explicit so it can be connected without allowing caller-supplied `gymId` values to become authority.

### Expected files

Expected paths are provisional until the implementation scaffold is created and conventions are confirmed:

- `package.json`, lockfile, `next.config.*`, `tsconfig.json`
- `app/` or the TRD-approved App Router structure, including a minimal health/root boundary
- `src/server/` or equivalent domain/server modules for typed config, request context, tenant guard, and errors
- `prisma/schema.prisma` and `prisma/migrations/`
- `.env.example` with names only, never secrets
- `tests/` for tenant-isolation and foundation checks
- `.github/workflows/` or the selected CI configuration
- Initial design-token/theme files if required by the chosen UI setup

No implementation files have been created yet; these are the planned outputs, not an assertion that they exist.

### Data/request flow

1. A request enters the Next.js application boundary and receives a request ID.
2. Server-only configuration is loaded and validated; missing or malformed required values fail clearly without exposing secrets.
3. The authenticated identity context is represented by a server-side principal. Until Clerk is integrated, tests use controlled fixtures rather than trusting a client-provided gym identifier.
4. A tenant-context resolver maps the principal to one local Gym context. Route/service code receives that context from the resolver, never from request body, query, or path input.
5. Prisma queries and writes require the resolved `gymId` in their tenant scope. Composite relations/constraints prevent records from crossing gym boundaries.
6. The tenant guard returns a safe not-found/forbidden result for altered or cross-tenant identifiers, without revealing whether another gym’s record exists.
7. The test harness exercises valid access, cross-tenant reads/writes, missing identity, and malformed context; CI runs type checking, lint/format checks, migrations, and tests.

### Key concepts to understand

- **Modular monolith:** one Next.js deployable contains UI, route handlers, and domain services, while modules preserve boundaries for future extraction.
- **Tenant isolation:** every tenant-owned record is scoped by Gym, and the server derives that scope from authenticated context.
- **Session authority vs. local mirror:** Clerk will be the immediate identity authority; local records support operational relationships and authorization.
- **Migration discipline:** Prisma schema changes are reviewed, reproducible migrations rather than ad hoc database edits.
- **Fail-closed configuration and authorization:** absence or ambiguity denies access and does not silently fall back to a caller-supplied value.
- **Negative security tests:** proving that forbidden cross-gym access fails is as important as proving that valid access succeeds.

### Completion criteria

- The application starts in development and production-build mode with documented configuration requirements.
- Type checking, lint/format checks, tests, and the production build run through CI.
- Prisma schema and an initial migration apply from an empty development database.
- The initial tenant-owned model and constraints reflect the TRD foundation entities and one-gym-per-user MVP rule without inventing future scope.
- Tenant context is derived server-side, and no route/service accepts a caller-supplied gym identifier as authority.
- SP-01 negative tests demonstrate no cross-tenant data or existence leakage for representative reads and writes.
- Errors include a request ID and safe, typed failure behavior.
- The foundation diff contains no feature implementation beyond what is technically required for this boundary.

## Next action

Waiting for explicit Approval Gate 1 before creating implementation code for the foundation capability.
