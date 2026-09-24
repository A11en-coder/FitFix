# FitFix

FitFix is a multi-tenant maintenance workspace for independent gyms. It gives gym managers and staff one place to register equipment, report faults, assign repair work, track resolution, and keep an auditable history of maintenance activity.

This repository contains the FitFix portfolio MVP: a full-stack Next.js application with Clerk authentication, Prisma/PostgreSQL persistence, tenant-isolated workspaces, equipment QR workflows, fault-management lifecycle tools, notifications, and operational safeguards.

## What the MVP includes

- Gym onboarding and workspace membership management.
- Clerk-backed sign-in, invitations, role synchronization, and manager/staff authorization.
- Equipment registry with search, status tracking, archival, history, and QR code generation.
- Fault reporting from equipment context, including draft recovery and optional media uploads.
- Manager review, prioritization, repair assignment, target dates, updates, resolution, closure, and reopening.
- Dashboard views for urgent, overdue, and active maintenance work.
- In-app notifications and email delivery through Resend.
- Tenant-scoped data access, audit events, rate limiting, request tracing, health checks, webhook replay protection, and internal-job authentication.
- Responsive, accessible workspace pages and automated CI checks.

## Product flow

1. A gym manager creates a workspace and invites staff.
2. Equipment is registered and can be labelled with a FitFix QR code.
3. A staff member scans a code or selects equipment and submits a fault.
4. A manager reviews the report, sets priority, and assigns repair responsibility.
5. The repair progresses through updates, resolution, verification, and closure.
6. The equipment record retains maintenance history for future operational decisions.

## Technology

- Next.js 15 with React 19 and TypeScript
- PostgreSQL with Prisma ORM and versioned migrations
- Clerk for authentication and organization membership
- Resend for transactional email
- Cloudinary for fault-report media uploads
- Zod for request and form validation
- GitHub Actions for CI

## Getting started

### Prerequisites

- Node.js 22+
- npm
- PostgreSQL 16 or a compatible hosted PostgreSQL database
- Clerk application and organization configuration
- Cloudinary account if media uploads are enabled
- Resend account if email delivery is enabled

### Install and configure

```bash
npm ci
Copy-Item .env.example .env.local
```

Fill in `.env.local` with local credentials. Never commit `.env.local` or any provider credentials. The checked-in `.env.example` contains placeholders only.

### Initialize the database

```bash
npm run db:validate
npm run db:generate
npm run db:deploy
```

For local schema development, use `npm run db:migrate` instead of `db:deploy`.

### Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Quality checks

The same checks used by CI can be run locally:

```bash
npm run format:check
npm run db:validate
npm run typecheck
npm test
npm run lint
npm run build
```

## Repository guide

- `src/` — application routes, UI features, server services, and API handlers
- `prisma/` — database schema and migrations
- `tests/` — validation, authorization, tenant-isolation, and service tests
- `docs/` — product requirements, technical requirements, operations, and release guidance
- `.github/workflows/ci.yml` — PostgreSQL-backed CI pipeline
- `.env.example` — required configuration variables with safe placeholders

## Project status

The core portfolio MVP implementation is complete and the repository is in release-readiness phase. Commercial launch evidence, production provider configuration, deployment, and live operational validation remain environment-specific follow-up work.

## Security notes

FitFix is designed around tenant isolation and least-privilege roles, but a production deployment still requires correctly configured Clerk, database, Cloudinary, Resend, internal-job, and webhook secrets. Review `docs/OPERATIONS.md` and `docs/RELEASE_CHECKLIST.md` before deploying.

## License

`package.json` declares the project as `UNLICENSED`, and this repository does not grant permission for open-source reuse. Add a specific license file if the project is later released as open source.
