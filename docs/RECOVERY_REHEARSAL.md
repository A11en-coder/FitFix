# FitFix recovery rehearsal

Use this document to record a non-production recovery rehearsal before release. The rehearsal should use a Neon branch or isolated database and synthetic, non-sensitive data.

## Rehearsal identity

- Rehearsal date:
- Operator:
- Source commit:
- Source migration set:
- Database provider/branch:
- Backup, restore point, or branch identifier:
- Planned recovery objective: maximum 24-hour data-loss window / four-hour service restoration

## Backup and restore evidence

- [ ] The selected Neon plan or provider capability supports the required restore operation.
- [ ] A backup, branch, or restore point was created before the rehearsal.
- [ ] The restore operation completed without exposing credentials or sensitive data.
- [ ] The restored database accepted `prisma migrate status` and reported the expected migration state.
- [ ] Expected tables, constraints, indexes, and migration records were present.
- [ ] Row-count checks matched the recorded synthetic fixture counts.
- [ ] No unexpected tenant, membership, fault, media, audit, notification, or outbox records appeared.

## Application verification after restore

- [ ] `/api/health` reports database readiness.
- [ ] A valid manager can authenticate.
- [ ] A deactivated member remains denied.
- [ ] A user from another gym cannot read or mutate the rehearsal gym's resources.
- [ ] Equipment listing and detail access work.
- [ ] Fault listing and detail access work.
- [ ] One synthetic fault can be reviewed, assigned, resolved, closed, and reopened where permitted.
- [ ] Audit events retain actor, action, entity, and request ID without sensitive content.
- [ ] Pending email outbox records remain deduplicated and safe to reconcile.
- [ ] `DELETE_PENDING` media remains retryable and no attached evidence was removed.
- [ ] Clerk webhook verification and event deduplication remain functional.

## Rollback rehearsal

1. Stop promotion and disable the affected write path if continued writes could increase damage.
2. Record the deployment ID, commit, migration set, observed error, and provider status.
3. If the schema is backward compatible, point the application to the last known-good commit.
4. If configuration caused the failure, restore the previous configuration revision and rotate exposed secrets.
5. Do not reverse a destructive migration automatically. Use a forward repair or verified database replacement after explicit review.
6. Run authentication, tenant-isolation, equipment, fault, and synthetic lifecycle smoke checks.
7. Resume traffic gradually and monitor for one normal operating interval.

## Evidence record

- Restore duration:
- Application restoration duration:
- Approximate data-loss window:
- Failed checks and remediation:
- Follow-up issue links:
- Final result: Pass / Pass with follow-up / Fail
- Approved by:
