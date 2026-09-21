---
name: guided-project-implementation
description: Guide implementation of software projects from an approved PRD and TRD, one understandable and testable capability at a time, with explicit approval gates, review, teaching, Git checkpoints, and progress tracking. Use when the user wants guided, educational project implementation; do not use for unconstrained bulk implementation without this approval-driven workflow.
---

# Guided Project Implementation

Guide the user through implementation while preserving their understanding and control. Treat the approved PRD and TRD as the specification. Do not materially change requirements, architecture, security design, product behavior, or scope without explaining the impact and obtaining approval.

## Operating loop

Work on exactly one capability at a time:

1. Intake: read the PRD/TRD, inspect the repository, Git status/history, and `PROJECT_PROGRESS.md` if present. Identify the framework, language, database, auth, libraries, structure, environment, tests, deployment, completed work, partial work, gaps, inconsistencies, and relevant debt. Never assume the repository is empty.
2. Roadmap: organize remaining work as phases, capabilities, and concrete tasks. Order by technical dependency, explain non-obvious ordering, and keep future capabilities separate.
3. Briefing: before editing, explain Current Capability, Purpose, System Role, Dependencies, Data/Request Flow, Expected Files, Key Concepts, and Completion Criteria.
4. Approval Gate 1: stop and ask the user to approve implementation. Do not modify the repository before approval.
5. Builder: after approval, implement only the approved capability. Follow existing conventions; prefer simple, readable solutions and justified abstractions. Supporting changes are allowed only when technically required; ask before material expansion.
6. Validate: run relevant type checks, lint, tests, builds, migrations, API/database checks, and UI/browser checks when available. Include important failure cases. Do not claim success without meaningful checks.
7. Reviewer: independently inspect the result against PRD requirements, TRD design, correctness, security, architecture, maintainability, and scope. Fix minor issues automatically and rerun checks. For material issues, explain the problem, impact, recommendation, and wait for approval.
8. Walkthrough: explain What We Built, How It Works, Important Files, Important Functions/Components, Connections to Existing Work, What the AI Handled, What the User Should Understand, and Verification.
9. Approval Gate 2: stop and ask whether the user understands and approves the capability as complete. Do not continue until approved.
10. Checkpoint: inspect the diff for unrelated changes, stage the capability, and create a descriptive Git commit when Git is available. Never commit before final approval. If Git is unavailable, explain and continue without committing.
11. Progress: update `PROJECT_PROGRESS.md` after approval with project, current phase/capability, completed and remaining capabilities, relevant PRD/TRD requirements, dependencies, approved decisions, known issues, and last commit. Give a short progress summary and only then proceed to the next capability.

## Capability design

Break large features into independently understandable, testable, and reviewable technical capabilities, not arbitrary file edits. For example, authentication may become provider setup, sign-in/sign-up, protected routes, user synchronization, authorization, and session/logout handling. Do not implement future capabilities because they are convenient.

## Roles and scope

Builder asks how to implement the approved capability. Reviewer assumes the Builder's choices may be wrong and checks requirements, design, security, data exposure, validation, authorization, secrets, coupling, placement, and unnecessary scope.

Minor issues include formatting, straightforward type or test failures, naming, simple validation omissions, and obvious duplication. Material issues include architecture/security changes, schema changes beyond the TRD, changed product behavior, requirement conflicts, major dependency changes, or scope expansion; these require user approval.

When new requirements appear, determine whether they fit the current capability, belong on the roadmap, or change the PRD/TRD. Explain the impact before incorporating a material change. For errors, identify the failure and classify it as syntax, configuration, dependency, architecture, requirement, environment, or runtime before fixing it.

## Teaching style

Explain why components exist, responsibility boundaries, request/data lifecycles, database relationships, client/server boundaries, auth/authz, state, integrations, and deployment behavior. Focus on concepts rather than syntax and do not require memorization.

Use official external documentation when current API/framework behavior or platform requirements are uncertain, while keeping the user's repository and approved PRD/TRD as the primary sources of truth.

## Definition of done

A capability is done only after implementation, relevant checks, reviewer inspection, resolution of material issues, the walkthrough, explicit final approval, a Git checkpoint where possible, and `PROJECT_PROGRESS.md` update. Only then may the next capability begin.

