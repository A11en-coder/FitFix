# FitFix release checklist

This checklist is the release evidence record for the portfolio MVP. Complete it against a specific Git commit and do not copy secrets, provider tokens, personal data, or raw webhook payloads into the record.

## Release identity

- Release candidate commit: `226ef6184fa43837ac6d3b93d91c62360f0693fe`
- Release candidate date: 2026-09-24
- Prisma migration set: 11 migrations through `20260924010000_dashboard_indexes`
- Reviewer/owner: Pending assignment
- Target environment: Local release-candidate evidence only; not staging or production

## Current evidence baseline

This record is intentionally limited to checks observed in the shared workspace. It does not establish staging, provider, recovery, performance, accessibility, or commercial-launch readiness.

- `npm run format:check`: passed.
- `npm run db:validate`: passed with explicit CI-style `DATABASE_URL` and `DIRECT_URL` values.
- `npm run typecheck`: passed.
- `npm test`: passed, 31 tests.
- `npm run lint`: passed with zero warnings.
- `npm run build`: passed.
- `git diff --check`: passed.
- Tracked-file secret-pattern scan: no matches; this is not a substitute for a provider or hosted secret scan.
- Isolated `npm ci` from the committed lockfile: passed in a temporary directory; the shared workspace install remains blocked by the locked Prisma Windows query engine.
- Dependency audit: 5 vulnerabilities reported (1 moderate, 4 high); remediation or explicit risk acceptance remains open.
- Clean PostgreSQL migration deployment, hosted CI, staging smoke tests, provider contract tests, and recovery rehearsal: not verified.

## Automated quality gates

- [x] `npm ci` completed from the committed lockfile in an isolated temporary directory.
- [x] `npm run format:check` passed.
- [x] `npm run db:validate` passed.
- [ ] `npm run db:deploy` passed against a clean PostgreSQL database.
- [x] `npm run typecheck` passed.
- [x] `npm test` passed.
- [x] `npm run lint` passed with zero warnings.
- [x] `npm run build` passed.
- [ ] Dependency and secret review completed without an unresolved release blocker.

## Environment and provider gates

- [ ] Preview/staging uses separate Clerk, Neon, Cloudinary, and Resend credentials.
- [ ] Production secrets are not present in the repository, preview environment, logs, or screenshots.
- [ ] `APP_URL` points to the target environment.
- [ ] Clerk webhook URL and signing secret match the target environment.
- [ ] Cloudinary upload configuration is server-side and uses the intended account.
- [ ] Resend sender configuration is verified for the target environment.
- [ ] `INTERNAL_JOB_SECRET` is configured for scheduled reconciliation jobs.
- [ ] Support, privacy, and terms content has been reviewed for the intended release stage.

## Data and migration gates

- [ ] A recoverable Neon backup, branch, or provider-supported restore point exists.
- [ ] The backup/restore procedure was verified and recorded in the recovery rehearsal document.
- [ ] Migration logs were reviewed for locks, destructive operations, and failures.
- [ ] Post-migration smoke queries and schema checks passed.
- [ ] The migration is backward compatible with the application version used during rollout, or the rollback plan explicitly covers the incompatibility.

## Staging smoke flow

- [ ] Public landing, support, privacy, and terms pages load.
- [ ] A test manager can authenticate and reach the dashboard.
- [ ] A test manager can create or access the intended gym workspace.
- [ ] A test staff member can accept an invitation and access only the intended gym.
- [ ] A manager can create equipment and download its QR code.
- [ ] A staff member can report a fault with valid and invalid input.
- [ ] A manager can review, assign, resolve, close, and reopen a test fault.
- [ ] In-app notifications appear and can be marked read.
- [ ] Email outbox behavior is verified without sending non-test messages.
- [ ] Clerk webhook delivery, deduplication, and reconciliation are verified.
- [ ] `/api/health` returns database readiness.

## Promotion and monitoring

- [ ] The exact reviewed commit is promoted; no rebuild from unrelated source is used.
- [ ] Production health check passes before user traffic is enabled.
- [ ] One synthetic, non-sensitive write flow passes after promotion.
- [ ] Error rate, latency, database health, webhook age, outbox age, and media cleanup are monitored.
- [ ] A rollback owner and communication path are known before promotion.
- [ ] The release decision is recorded as Go / No-go with rationale.

## Portfolio versus commercial launch

This checklist can establish portfolio-MVP readiness. It does not replace professional review of retention, privacy, terms, provider plans, availability targets, backup guarantees, or commercial operational ownership.
