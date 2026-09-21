PRODUCT REQUIREMENTS DOCUMENT

FitFix Product Requirements Document

_Reactive equipment maintenance SaaS for independent gyms_

Version 1.0 | Approved product definition | 21 September 2026

**Decision summary** Build a portfolio-ready, multi-tenant SaaS MVP that helps independent gyms report, assign, track and analyse reactive equipment faults. The MVP prioritizes fast staff reporting and manager visibility while reserving preventive maintenance, member reporting and multi-location support for later releases.

# Purpose of this document

This PRD consolidates the approved research, planning, content and UI/UX decisions for FitFix. It defines what the MVP must achieve, who it serves, how success will be evaluated and which capabilities are intentionally excluded. It is intended to guide product design, implementation planning, usability testing and the portfolio case study. Technical architecture belongs in a separate TRD.

| **Field**            | **Value**                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------ |
| Product owner        | Allen                                                                                                  |
| Delivery owner       | Allen, solo developer                                                                                  |
| Primary stakeholders | Product owner; prospective independent-gym owners and managers; gym staff; usability-test participants |
| Status               | Approved for MVP planning                                                                              |
| Target delivery      | 10 weeks, with up to 2 contingency weeks                                                               |
| Effort assumption    | Approximately 21 hours per week                                                                        |

# 1 Document control

| **Item**        | **Detail**                                                   |
| --------------- | ------------------------------------------------------------ |
| Product         | FitFix                                                       |
| Document        | Product Requirements Document                                |
| Version         | 1.0                                                          |
| Date            | 21 September 2026                                            |
| Owner           | Allen                                                        |
| Approval status | Stages 1 through 4 approved; PRD compiled for delivery       |
| Review cadence  | At milestone gates and whenever MVP scope changes materially |

## Decision and revision summary

| **Version** | **Date**    | **Decision**                                                                                            |
| ----------- | ----------- | ------------------------------------------------------------------------------------------------------- |
| 0.1         | 21 Sep 2026 | Research direction approved: independent gyms, reactive equipment maintenance and staff-only reporting. |
| 0.2         | 21 Sep 2026 | MVP scope, requirements, statuses, analytics, success criteria and delivery plan approved.              |
| 0.3         | 21 Sep 2026 | Content strategy, terminology, landing-page hierarchy and notification scope approved.                  |
| 0.4         | 21 Sep 2026 | Visual direction, navigation, wireframes, accessibility and prototype scope approved.                   |
| 1.0         | 21 Sep 2026 | Consolidated PRD approved for implementation planning.                                                  |

# 2 Executive summary

FitFix is a gym-specific SaaS product for independent-gym owners, managers and staff. It replaces fragmented fault reporting across conversations, paper notes and spreadsheets with a shared workflow for reporting equipment faults, assigning repairs, monitoring status, recording resolution details and reviewing equipment history.

The MVP focuses exclusively on reactive maintenance. Authenticated staff can report faults by scanning an equipment QR code or selecting equipment from a searchable registry. Managers can review severity, change equipment availability, assign work to an internal staff member or record an external technician, set target dates, monitor updates, verify resolutions and close reports. Dashboards surface urgent, overdue and out-of-service equipment.

The primary desired outcome is reduced equipment downtime. Supporting outcomes are centralized maintenance records and clearer accountability. Because the first release is a portfolio MVP, success will be evaluated through observable usability and workflow-completion targets rather than unsupported claims about commercial impact.

# 3 Product vision and problem definition

## Vision

Give independent gyms a clear, fast and trustworthy way to move every equipment fault from discovery to verified resolution.

## Problem statement

Independent-gym managers need to know what equipment is faulty, whether it is safe to use, who is responsible for repair and how long it has been unavailable. When this information is distributed across verbal conversations, messaging threads, spreadsheets and paper notes, responsibility and status can become unclear. Staff need a quick reporting method, while managers need an operational view and a durable equipment history.

## Current alternatives

• Verbal reports and informal staff handovers.  
• Group chats or direct messages.  
• Paper maintenance logs and labels.  
• General spreadsheets or task trackers.  
• Broad computerized maintenance management systems designed for many industries.

## Opportunity

FitFix can differentiate through a narrower gym-specific workflow, quick QR entry, plain terminology and role-based views. The opportunity is not to reproduce an enterprise CMMS. It is to make the most important reactive-maintenance work easier for a small independent gym.

## Goals

• Reduce friction between discovering and reporting a fault.  
• Make every active fault visibly owned, prioritized and dated.  
• Give managers an immediate view of downtime and overdue work.  
• Preserve fault, repair and cost history at equipment level.  
• Demonstrate an end-to-end SaaS workflow suitable for a professional portfolio.

## Non-goals for the MVP

• Preventive maintenance scheduling or inspection programmes.  
• Member-facing reporting or consumer workout functionality.  
• Multiple locations within one gym workspace.  
• External-technician accounts or contractor portals.  
• Parts inventory, procurement, subscription billing or AI diagnosis.

# 4 Research and evidence

## Market context and demand signals

General maintenance products validate the core workflow. MaintainX describes capabilities for reactive and preventive maintenance, work orders, requests, asset health, parts inventory, checklists and reporting. Its mobile listing also describes QR access to asset maintenance history and open work. These sources demonstrate that structured asset records, work assignment, status tracking and QR entry are established maintenance patterns.

The evidence is indirect: it supports the general maintenance workflow but does not prove willingness to pay among independent gyms. No market-size claim, conversion forecast or revenue forecast is included. Interviews with gym operators remain a recommended validation step before treating FitFix as a commercial venture.

## Competitive frame

| **Category**              | **Strength**                                                              | **FitFix response**                                                                                    |
| ------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Broad CMMS platforms      | Deep work-order, asset, inventory, inspection and reporting capabilities. | Prioritize gym-specific simplicity, faster setup and a smaller vocabulary.                             |
| General task trackers     | Flexible and familiar.                                                    | Add equipment identity, availability status, QR entry, repair history and downtime context.            |
| Spreadsheets and messages | Low cost and already available.                                           | Provide ownership, lifecycle status, notifications, history and actionable dashboards in one workflow. |

## Audience research status

The current audience definition is based on product discovery and known operational patterns, not completed field interviews. Usability testing with at least five participants is required for the portfolio MVP. If possible, at least one participant should have experience working in or managing a gym.

## Sources

MaintainX Help Center. Product capabilities for work requests, work orders, preventive and reactive maintenance, equipment health and reporting. <https://help.getmaintainx.com/>

MaintainX mobile application listing. QR access to asset history, work orders and protocols. [Google Play listing](https://br.getmaintainx.com/d4S2WddXJLb)

# 5 Target audience

| **Role**                | **Jobs to be done**                                                                                                    | **Needs and pain points**                                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Owner or manager        | Review faults; prioritize work; assign responsibility; control access; monitor downtime, costs and recurring problems. | One operational view, clear responsibility, reliable history, fast decisions and separation between gym workspaces. |
| Staff reporter          | Identify equipment; report a problem; communicate immediate action; follow the report.                                 | Fast mobile flow, minimal required fields, clear confirmation and visibility of active faults.                      |
| Assigned staff repairer | Understand assigned work; add progress; mark work resolved.                                                            | Clear next action, target date, equipment context, update history and notifications.                                |
| External technician     | Performs repair but has no MVP account.                                                                                | Manager records company or technician identity, status and outcome on their behalf.                                 |

## Role distinctions

• Managers have full control of equipment, staff, faults, assignments, severity, target dates, costs, analytics and closure.  
• Staff can view equipment and active faults throughout their gym. They can edit reports they created and repair work assigned to them.  
• External technicians are records rather than authenticated users in the MVP.  
• Members are not users in the MVP. Member reporting is a future opportunity.

## Accessibility and context of use

Staff may report from a phone while standing near equipment. Managers may work from a phone, tablet or desktop. Interfaces must support touch, keyboard and assistive technologies, remain usable at 200 percent zoom and avoid relying on colour alone. Operational language must be short and understandable in a busy environment.

# 6 Product strategy

## Value proposition

**Keep your gym equipment working.** FitFix helps independent gyms report faults, assign repairs and track equipment downtime in one place.

## Differentiation

• Designed around gym equipment and availability rather than generic assets.  
• QR scanning and searchable equipment selection are equal entry paths.  
• Separate fault lifecycle from equipment usability to improve operational clarity.  
• Make the full workflow achievable without enterprise maintenance complexity.

## Business and service model

FitFix begins as a free portfolio MVP. It is positioned as a multi-tenant SaaS so a future commercial release could offer subscriptions, but billing, pricing and plan enforcement are outside the MVP.

## Product principles

| **Principle**                  | **Implication**                                                            |
| ------------------------------ | -------------------------------------------------------------------------- |
| Fast at the point of discovery | A staff member should report a fault in less than one minute.              |
| Ownership over ambiguity       | Every active fault shows responsibility, severity, status and target date. |
| Safety status is explicit      | Equipment usability is visible independently of repair progress.           |
| History is durable             | Equipment with historical reports is archived, not casually deleted.       |
| Actionable before decorative   | Dashboards prioritize urgent and overdue work over nonessential charts.    |

## Success metrics

| **Metric**                 | **Approved target**                                                  | **Method**                                         |
| -------------------------- | -------------------------------------------------------------------- | -------------------------------------------------- |
| Fault submission time      | Under 1 minute                                                       | Moderated task test from QR entry to confirmation. |
| Review and assignment time | Under 2 minutes                                                      | Moderated manager task test.                       |
| Information completeness   | Every active fault displays owner, severity, status and target date  | Interface inspection and test cases.               |
| Priority visibility        | Overdue and unavailable equipment visible from dashboard             | Task test without opening individual records.      |
| Usability completion       | At least 5 users complete the core flow without developer assistance | Moderated or observed testing.                     |
| Tenant separation          | No user can access another gym workspace                             | Permission and security acceptance tests.          |

# 7 Scope and prioritization

## MVP definition

A responsive single-location workspace for each independent gym, supporting manager and staff accounts, an equipment registry, QR labels, reactive fault reporting, repair assignment, status tracking, comments, history, notifications, search, filters and manager analytics.

## MoSCoW prioritization

| **Priority** | **Included capabilities**                                                                                                                                                                                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Must         | Gym workspace; authentication; roles; staff invitations; equipment registry; QR codes; fault reports; photos; severity; assignment; dual status models; target dates; updates; resolution and closure; history; costs; search; filters; in-app and email notifications; manager dashboard. |
| Should       | Activity history; downloadable and printable QR labels; useful empty, loading, success and error states; archive equipment.                                                                                                                                                                |
| Could        | Profile and notification preferences; saved report drafts; richer analytics refinements.                                                                                                                                                                                                   |
| Won't now    | Preventive maintenance; members; multiple locations; technician accounts; inventory; billing; browser push; AI features.                                                                                                                                                                   |

## Later releases

• Recurring preventive maintenance and inspections.  
• Member-submitted limited reports with duplicate and misuse controls.  
• Multiple locations and cross-location reporting.  
• External-technician accounts and vendor collaboration.  
• Parts inventory and purchase tracking.  
• Subscription plans, billing and plan limits.  
• Advanced reliability analysis and export capabilities.

# 8 Functional requirements

| **ID** | **Requirement**            | **Product behavior and rationale**                                                                                                     | **Priority** | **Depends on**                |
| ------ | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ----------------------------- |
| FR-01  | Gym workspace creation     | Owner can create a distinct gym workspace. Independent gym needs isolated operational context.                                         | Must         | Authentication and onboarding |
| FR-02  | Staff invitations          | Managers invite, view and deactivate staff. Create a shared but controlled workspace.                                                  | Must         | FR-01                         |
| FR-03  | Role permissions           | System enforces manager and staff capabilities. Protect administrative actions and tenant data.                                        | Must         | FR-01, FR-02                  |
| FR-04  | Equipment registry         | Managers create, edit, view and archive equipment records. Identify assets and retain durable history.                                 | Must         | FR-03                         |
| FR-05  | Equipment QR codes         | Each equipment item has a downloadable QR code opening its page. Accelerate point-of-discovery reporting.                              | Must         | FR-04                         |
| FR-06  | Fault reporting            | Staff report a fault from QR entry or equipment search. Record problems quickly.                                                       | Must         | FR-03, FR-04                  |
| FR-07  | Fault evidence             | Reports accept title, description, severity, equipment status, time, immediate action and photos. Give managers enough context to act. | Must         | FR-06                         |
| FR-08  | Review and prioritization  | Managers review and may revise severity and equipment status. Ensure operational triage.                                               | Must         | FR-03, FR-07                  |
| FR-09  | Repair assignment          | Manager assigns internal staff or records an external technician and target date. Create ownership and accountability.                 | Must         | FR-08                         |
| FR-10  | Lifecycle status           | Authorized users update fault and equipment statuses independently. Distinguish repair progress from usability.                        | Must         | FR-08, FR-09                  |
| FR-11  | Updates and comments       | Authorized users add chronological progress updates and comments. Maintain shared context.                                             | Must         | FR-09                         |
| FR-12  | Resolution and closure     | Assignee marks resolved; manager verifies and closes; manager may reopen with reason. Separate claimed completion from verification.   | Must         | FR-10                         |
| FR-13  | Equipment history          | Equipment page shows chronological faults, repairs, downtime and costs. Support recurring-problem and replacement decisions.           | Must         | FR-04, FR-12                  |
| FR-14  | Resolution and cost record | Managers record resolution summary and repair cost. Preserve operational and financial history.                                        | Must         | FR-12                         |
| FR-15  | Search and filters         | Users search and filter equipment and faults by relevant attributes. Find priority work efficiently.                                   | Must         | FR-04, FR-06                  |
| FR-16  | Notifications              | Users receive relevant in-app and email notifications. Ensure assignments and urgent work are seen.                                    | Must         | FR-06, FR-09, FR-12           |
| FR-17  | Manager dashboard          | Managers see urgent, overdue, out-of-service and trend information. Enable fast prioritization.                                        | Must         | FR-06 to FR-14                |
| FR-18  | Activity history           | Important state, assignment and access changes remain traceable. Support accountability.                                               | Should       | FR-03, FR-10                  |
| FR-19  | QR label output            | Managers download or print equipment QR labels. Support physical deployment.                                                           | Should       | FR-05                         |
| FR-20  | Profile preferences        | Users manage profile and available notification preferences. Improve account usability.                                                | Could        | FR-02, FR-16                  |

# 9 Non-functional product requirements

| **ID** | **Area**               | **Requirement**                                                                                                             |
| ------ | ---------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| NFR-01 | Responsive use         | Core workflows work on current phones, tablets and desktops.                                                                |
| NFR-02 | Accessibility          | Target WCAG 2.2 AA, including keyboard use, visible focus, labels, contrast, zoom, touch targets and reduced motion.        |
| NFR-03 | Performance outcome    | Primary pages should load within 3 seconds under normal tested conditions; the test context must be documented.             |
| NFR-04 | System feedback        | Every asynchronous or empty state provides clear loading, empty, success and error feedback.                                |
| NFR-05 | Form recovery          | Recoverable errors do not unnecessarily erase valid user input.                                                             |
| NFR-06 | Tenant privacy         | A user cannot access another gym's workspace or data.                                                                       |
| NFR-07 | Traceability           | Important changes record actor, time and change.                                                                            |
| NFR-08 | Destructive safeguards | Destructive or irreversible actions require clear confirmation and name the affected object.                                |
| NFR-09 | Language               | Interface uses concise plain English and consistent terminology.                                                            |
| NFR-10 | Browser support        | Support current major versions of common modern browsers at release.                                                        |
| NFR-11 | Language and region    | MVP is English only. Dates, times and currency must be presented consistently for the configured gym context.               |
| NFR-12 | Offline use            | Not applicable to the MVP. A network connection is required; failure states must explain loss of connectivity.              |
| NFR-13 | Retention              | Closed reports and equipment history remain available; retention policy requires legal and commercial review before launch. |
| NFR-14 | Support                | Provide a visible support/contact route and actionable error messages.                                                      |
| NFR-15 | Privacy and legal      | Provide privacy and terms placeholders for the portfolio MVP; obtain professional review before commercial release.         |

## Required product integrations

At product level, the MVP requires account authentication, image upload, QR-code output and transactional email. Providers and implementation patterns are deferred to the TDD.

# 10 User stories and acceptance criteria

## US-01 Report a fault from a QR code

As a Staff reporter, I want to report a fault from a QR code, so that equipment problems reach the manager quickly.

Acceptance criteria: QR opens the correct equipment; active faults are shown; required fields are validated; successful submission creates a Reported fault and confirmation; failed submission preserves valid input.

Traceability: FR-05, FR-06, FR-07

## US-02 Find equipment and report without a QR code

As a Staff reporter, I want to find equipment and report without a QR code, so that a missing label does not block reporting.

Acceptance criteria: Search supports name or asset ID; selection shows location and status; report follows the same validation and confirmation path.

Traceability: FR-04, FR-06, FR-15

## US-03 Review and prioritize a new fault

As a Manager, I want to review and prioritize a new fault, so that urgent work is acted on first.

Acceptance criteria: Manager can review evidence, revise severity and equipment status; high-severity submission triggers manager notification; changes are traceable.

Traceability: FR-08, FR-10, FR-16

## US-04 Assign repair responsibility and a target date

As a Manager, I want to assign repair responsibility and a target date, so that every fault has an accountable owner.

Acceptance criteria: Manager selects internal staff or records external technician; target date is saved; internal assignee is notified; assignment change is recorded.

Traceability: FR-09, FR-16

## US-05 Post an update and mark work resolved

As a Assigned staff, I want to post an update and mark work resolved, so that managers can monitor progress.

Acceptance criteria: Assignee can update assigned fault; timeline shows actor and time; resolution requires summary; manager is notified for verification.

Traceability: FR-10, FR-11, FR-12

## US-06 Verify and close a resolved fault

As a Manager, I want to verify and close a resolved fault, so that completed work is explicitly accepted.

Acceptance criteria: Only manager closes; resolution summary is visible; cost may be recorded; close time is stored; reporter and assignee receive closure notice.

Traceability: FR-12, FR-14

## US-07 Reopen a report

As a Manager, I want to reopen a report, so that incomplete or failed repairs return to active work.

Acceptance criteria: Manager supplies reason; report returns to an active state; history retains closure and reopening events; responsible users are notified.

Traceability: FR-12, FR-18

## US-08 Review equipment history

As a Manager, I want to review equipment history, so that recurring faults and spending are visible.

Acceptance criteria: History is chronological; active and closed faults are distinguishable; downtime and cost totals reflect recorded data; archived equipment remains viewable.

Traceability: FR-13, FR-14, FR-17

## US-09 See urgent and overdue work on the dashboard

As a Manager, I want to see urgent and overdue work on the dashboard, so that I can prioritize without opening every record.

Acceptance criteria: Dashboard shows active, high-severity, overdue and out-of-service counts; cards link to filtered lists; unavailable equipment is visible.

Traceability: FR-17

## US-10 Invite and manage staff

As a Manager, I want to invite and manage staff, so that only authorized people access the gym workspace.

Acceptance criteria: Invitee receives invitation; accepted user receives correct role; deactivated staff cannot access workspace; users cannot cross gym boundaries.

Traceability: FR-02, FR-03

# 11 Information architecture and user flows

## Screen map

| **Area**         | **Screens**                                                                                                     |
| ---------------- | --------------------------------------------------------------------------------------------------------------- |
| Public           | Landing page; sign up; log in; privacy; terms; support.                                                         |
| Shared workspace | Dashboard; equipment list; equipment details; fault list; fault details; create report; notifications; profile. |
| Manager only     | Add or edit equipment; QR management; staff management; external technician records; analytics; gym settings.   |
| Onboarding       | Gym details; first equipment; optional staff invitations; completion checklist.                                 |

## Navigation model

Desktop and tablet use a persistent left sidebar: Dashboard, Equipment, Faults, Analytics, Notifications, Staff for managers, and Settings. Mobile uses Home, Equipment, a prominent Report action, Faults and More. Role-restricted destinations are hidden; unavailable actions may be disabled only when the explanation is useful.

## Primary reactive-maintenance flow

1\. Staff scans QR code or finds equipment.  
2\. FitFix shows equipment identity, status and existing active faults.  
3\. Staff submits issue details, severity, equipment status, evidence and immediate action.  
4\. Manager reviews, adjusts priority if needed and assigns repair responsibility and target date.  
5\. Assignee posts updates and marks the repair resolved with a summary.  
6\. Manager verifies work, records cost if applicable and closes the report.  
7\. Equipment history, dashboard metrics and notifications update.

## Secondary and recovery flows

• No QR: search equipment by name or asset ID.  
• Possible duplicate: show active fault and let user view it before creating another.  
• Upload failure: preserve report text and allow retry or submission without the failed photo when permitted.  
• Permission failure: explain the restriction and preserve safe navigation.  
• Closed fault needs more work: manager reopens with a required reason.  
• Equipment removal: archive items with history rather than permanently deleting them.

# 12 Content strategy

## Messaging and voice

FitFix sounds professional, direct, reassuring and action-oriented. It uses plain English suitable for busy staff. It avoids exaggerated claims, technical maintenance jargon and language implying that FitFix diagnoses or performs repairs.

## Landing-page hierarchy

1\. Hero with "Keep your gym equipment working," supporting explanation and Create your gym workspace CTA.  
2\. Problem framing around scattered fault information and unclear responsibility.  
3\. Three-step workflow: report, assign, track.  
4\. Benefits: faster reporting, accountability, equipment history and operational visibility.  
5\. QR-reporting explanation and product demonstration.  
6\. Dashboard preview focused on urgent, overdue and unavailable equipment.  
7\. Final CTA: "Bring your gym's maintenance into one place."

## Content matrix

| **Screen**    | **User intent**           | **Key content**                                            | **Primary action**    |
| ------------- | ------------------------- | ---------------------------------------------------------- | --------------------- |
| Landing       | Understand value          | Problem, workflow, benefits, QR and dashboard preview      | Create gym workspace  |
| Onboarding    | Prepare workspace         | Gym details, first equipment, staff invitations, checklist | Finish setup          |
| Dashboard     | Identify priorities       | Urgent faults, overdue work, downtime, activity            | Review fault          |
| Equipment     | Find and understand asset | Identity, status, details, QR, active faults, history      | Report fault          |
| Fault form    | Record problem            | Issue, severity, status, photos, immediate action          | Submit report         |
| Fault details | Coordinate work           | Assignment, dates, updates, cost, history                  | Update repair         |
| Staff         | Control access            | Invitations, roles, account status                         | Invite staff          |
| Analytics     | Identify patterns         | Downtime, resolution time, costs, recurring faults         | Investigate equipment |

## Terminology and microcopy

| **Use**                                                         | **Avoid or clarify**                                                    |
| --------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Fault report                                                    | Do not alternate casually among ticket, case and incident.              |
| Repair assignment                                               | Distinguish the assigned work from the original report.                 |
| Resolved                                                        | Repairer states work is complete; awaiting manager verification.        |
| Closed                                                          | Manager has verified and finalized the report.                          |
| Out of service                                                  | Equipment is unavailable; do not communicate only through red colour.   |
| Report fault / Assign repair / Mark resolved / Verify and close | Prefer explicit verbs over generic Save or Submit when context permits. |

## Governance, localization and maintenance

• English-only MVP.  
• Product owner maintains interface, landing and help content.  
• Gym managers own gym, equipment and external-technician information.  
• Users own operational content they submit, subject to product terms.  
• FitFix provides coordination content, not repair instructions.  
• Localization is future work.  
• Privacy, terms and support content require review before commercial launch.

# 13 UI and UX requirements

## Visual direction

Modern fitness SaaS: deep charcoal and warm white with an energetic lime accent. Red communicates high severity or destructive actions, amber communicates warnings and overdue work, and blue communicates informational or in-progress states. Status always includes text or iconography. Manrope is recommended for headings and Inter for interface and body text, subject to availability and accessible rendering.

## Layout and navigation

• Spacious but operational composition with restrained cards and subtle shadows.  
• Tables on desktop convert to structured cards on small screens.  
• Manager views may be denser than staff views, but priority order remains visible.  
• Equipment images support identification rather than decoration.  
• Desktop sidebar and mobile bottom navigation follow the approved screen map.

## Dashboard text wireframe

| **Region**    | **Contents**                                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------------- |
| Top           | Title, date range, search, notifications and Report fault action.                                       |
| Priority row  | Active faults, high severity, overdue repairs and equipment out of service; each opens a filtered list. |
| Main left     | Requires attention list with severity, equipment, assignee, status and target date.                     |
| Main right    | Equipment-status breakdown and average resolution time.                                                 |
| Lower         | Opened versus resolved trend, recurring-fault equipment and recent activity.                            |
| Staff variant | Assigned tasks, reports created by the user and current outages; no business-wide analytics.            |

## Fault-report text wireframe

• Equipment summary with image, name, asset ID, location, current status and active-fault warning.  
• Fields: title, description, severity, equipment status, photos, immediate action and discovery time.  
• Primary Submit fault report action, secondary Save draft if retained in scope, and notification explanation.  
• Success state shows reference, Reported status and routes to the report or equipment.  
• Mobile uses a single column and sticky submission action; error focus moves to the first invalid field.

## Fault-details text wireframe

• Header shows reference, title, severity, fault status, equipment status and contextual action.  
• Main column shows original evidence, immediate action, chronological updates and resolution summary.  
• Side panel shows reporter, assignee, target date, timestamps, cost and equipment link.  
• Manager controls support severity, assignment, target date, equipment status, closure and reopening.

## Equipment text wireframe

• List provides search and filters for category, location and status; desktop table becomes mobile cards.  
• Detail view shows identity, availability, QR output, active-fault warning, summary metrics and chronological history.  
• Managers can edit and archive. Duplicate asset IDs are rejected.

## Components and states

Required components include buttons, inputs, selects, upload controls, severity and status badges, cards, tables, mobile cards, charts, filters, dialogs, timelines, toasts, notification items and navigation. Each supports applicable default, hover, focus, active, loading, empty, success, warning, error, disabled and permission-limited states.

## Responsive and accessible behaviour

• Minimum 44 by 44 pixel touch targets.  
• Persistent visible labels, keyboard focus and logical reading order.  
• Error summary links to fields.  
• Accessible table headings and structured mobile alternatives.  
• Dialogs trap focus and return it on close.  
• Usable at 200 percent zoom and with reduced motion.  
• Uploaded images receive a meaningful description or label.  
• Motion is limited to helpful feedback and state transitions.

## Prototype and usability test

Prototype the full treadmill scenario: scan QR, report high-severity fault, mark equipment out of service, review, assign, update, resolve, verify, close, then inspect history and dashboard changes. Observe whether participants distinguish fault status from equipment status, interpret severity consistently, understand resolved versus closed and locate assignment, history and comments efficiently.

No visual mockup is included in this PRD. Text wireframes are approved; visual wireframes or high-fidelity mockups may be produced as a separate artifact.

# 14 Delivery plan

| **Week** | **Milestone**                                            | **Review gate**                                  |
| -------- | -------------------------------------------------------- | ------------------------------------------------ |
| 1        | Finalize requirements, flows and interface direction.    | PRD and flow consistency review.                 |
| 2        | Public pages, authentication and gym onboarding.         | Account and onboarding walkthrough.              |
| 3        | Roles, staff invitations and permissions.                | Role and tenant-access tests.                    |
| 4        | Equipment registry, details and QR workflow.             | Equipment and QR acceptance tests.               |
| 5        | Fault reporting and photo submission.                    | One-minute reporting usability test.             |
| 6        | Assignment, statuses, comments and notifications.        | End-to-end lifecycle walkthrough.                |
| 7        | History, costs, search and filters.                      | Data visibility and recovery review.             |
| 8        | Manager dashboard and analytics.                         | Metric accuracy and priority visibility review.  |
| 9        | Responsive, accessibility, errors and edge cases.        | Accessibility and device review.                 |
| 10       | User testing, fixes, demo data and portfolio case study. | Launch-readiness review.                         |
| 11–12    | Contingency if required.                                 | Scope decision before adding any future feature. |

## Roles and resources

Allen owns product decisions, design, implementation, testing coordination and portfolio presentation. The working assumption is about three hours per day, averaging 21 hours per week. Test participants provide usability feedback but are not delivery owners.

## Product-level dependencies

• Access to representative devices and browsers.  
• At least five usability-test participants.  
• A transactional email capability, image-upload capability and QR output.  
• Representative demo equipment and fault data.  
• Privacy and terms review before any commercial launch.

## Launch-readiness criteria

• All Must requirements pass acceptance tests.  
• Core lifecycle completes on mobile and desktop.  
• Tenant separation and permissions pass tests.  
• No blocking accessibility defect in the primary flow.  
• Success metrics can be tested and recorded.  
• Demo workspace contains realistic but non-sensitive sample data.  
• Known limitations and future work are documented.

# 15 Risks assumptions constraints and dependencies

| **Risk or constraint**                             | **Likelihood**      | **Impact** | **Mitigation**                                                                         | **Owner**      |
| -------------------------------------------------- | ------------------- | ---------- | -------------------------------------------------------------------------------------- | -------------- |
| MVP expands into preventive maintenance or billing | Medium              | High       | Enforce explicit exclusions and use weeks 11–12 only for contingency.                  | Product owner  |
| Analytics delays the core workflow                 | Medium              | Medium     | Prioritize urgent and overdue operational views; reduce secondary charts first.        | Product owner  |
| Product feels like a generic issue tracker         | Medium              | High       | Keep equipment status, QR entry, gym terminology, history and downtime central.        | Product owner  |
| No access to real gym operators                    | Medium              | High       | Recruit at least five testers and seek one gym-experienced participant where possible. | Product owner  |
| Users confuse dual status systems                  | Medium              | High       | Use distinct labels, help text and usability testing.                                  | Product owner  |
| Photo, email or QR dependency fails                | Low to medium       | Medium     | Design clear retry and fallback states; document provider choices in TDD.              | Delivery owner |
| Working name unavailable                           | Unknown             | Medium     | Treat FitFix as working name until availability checks are complete.                   | Product owner  |
| Legal content insufficient for commercial use      | High without review | High       | Use placeholders for portfolio; obtain professional review before commercialization.   | Product owner  |

## Approved assumptions

• One location per gym workspace in the MVP.  
• External technicians do not need accounts.  
• Portfolio MVP is free and has no billing.  
• English is the only MVP language.  
• Normal operation requires connectivity.  
• Managers verify closure; staff may mark assigned work resolved.

# 16 Deferred to TDD

The following are intentionally excluded from this PRD and must be decided in a technical design document:

• Frontend and backend frameworks.  
• Database technology, schema and migrations.  
• Authentication and authorization implementation.  
• API routes, request formats and internal service boundaries.  
• Tenant-isolation implementation.  
• Image storage and delivery.  
• Email provider and delivery mechanics.  
• QR-code generation implementation.  
• Hosting, infrastructure, deployment and observability.  
• Caching, queues, background jobs and retry architecture.  
• Security controls at code and infrastructure level.  
• Test frameworks and continuous integration configuration.

# 17 Open questions and future opportunities

| **Item**                           | **Status** | **Next action**                                                     |
| ---------------------------------- | ---------- | ------------------------------------------------------------------- |
| FitFix name availability           | Open       | Check trademark, product and domain conflicts before public launch. |
| Independent-gym willingness to pay | Open       | Interview gym operators before defining pricing.                    |
| Retention policy                   | Open       | Define with legal and commercial input before production launch.    |
| Exact performance test context     | Open       | Specify devices, network and data volume in the TDD/test plan.      |
| Save draft feature                 | Could      | Retain only if fault-form testing shows clear need within scope.    |
| Preventive maintenance             | Future     | Research scheduling, inspection templates and escalation after MVP. |
| Member reporting                   | Future     | Design limited permissions, duplicate controls and moderation.      |
| Multi-location support             | Future     | Research cross-location roles, navigation and analytics.            |
| External-technician portal         | Future     | Validate contractor communication needs before adding accounts.     |
| Subscription model                 | Future     | Define plans only after demand validation.                          |

# 18 Approval

| **Approval item**             | **Status**            | **Date**    | **Conditions or follow-up**                                 |
| ----------------------------- | --------------------- | ----------- | ----------------------------------------------------------- |
| Stage 1 Research and analysis | Approved              | 21 Sep 2026 | Validate demand with real operators when possible.          |
| Stage 2 Planning              | Approved              | 21 Sep 2026 | Protect the agreed MVP boundary.                            |
| Stage 3 Content creation      | Approved              | 21 Sep 2026 | Legal content requires review before commercial launch.     |
| Stage 4 UI and UX design      | Approved              | 21 Sep 2026 | Text wireframes approved; visual mockups are separate.      |
| Consolidated PRD              | Approved for delivery | 21 Sep 2026 | Create a TDD before committing implementation architecture. |

## Final consistency check

• Every Must requirement supports an approved user need or product goal.  
• Major stories include observable acceptance criteria and requirement traceability.  
• MVP priorities align with the 10-week delivery plan.  
• User flows, content and UI/UX cover the functional requirements.  
• Metrics are testable proposed targets, not claimed market benchmarks.  
• Research limitations and assumptions are explicit.  
• Technical implementation decisions remain deferred to the TDD.