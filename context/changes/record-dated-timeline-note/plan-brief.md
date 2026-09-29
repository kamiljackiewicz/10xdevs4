# Record dated timeline notes — Plan Brief

> Full plan: `context/changes/record-dated-timeline-note/plan.md`

## What & Why

Caregivers need one private, chronological place to record patient context for later consultation. This change adds dated plain-text notes with creation, reading, editing, and confirmed permanent deletion, without medical interpretation or imported-result functionality.

## Starting Point

The application already has authenticated caregiver sessions, a single patient profile, Supabase RLS, calendar-date helpers, and Polish/English UI. It has no note table, note API, or timeline page.

## Desired End State

From the dashboard, a patient owner can open `/dashboard/timeline`, manage dated notes, and see them persist in newest-event-date order. Direct database and HTTP access remain restricted to the profile owner, while notes that become older than a later-corrected birth date stay visible with a warning.

## Key Decisions Made

| Decision | Choice | Why | Source |
| --- | --- | --- | --- |
| Operations | Create, read, edit date/body, confirmed permanent delete | Covers the agreed MVP lifecycle without versioning or recovery. | Plan |
| Location | Separate `/dashboard/timeline` page | Keeps patient history discoverable without overloading the profile dashboard. | Plan |
| Content | Required plain text, 1–5000 Unicode code points after normalization | Gives useful context while avoiding titles, Markdown, and rich-content risk. | Plan |
| Dates | Calendar day, local-device default, future dates allowed | Preserves the caregiver's intended day without timezone shifts. | Plan |
| Birth-date rule | New or re-saved notes cannot predate the current birth date | Enforced in client, API, and database; profile corrections preserve existing rows. | Plan |
| Ordering | `event_date` descending, then `created_at` descending | Later-created notes on the same day come first; editing body does not reorder. | Plan |
| Access | Owner only, including direct database requests | RLS remains the enforcement boundary rather than trusting client IDs. | Plan |
| Languages | Existing PL/EN mechanism | Makes all labels, errors, empty states, and confirmations consistent with the app. | Plan |

## Scope

**In scope:** migration and RLS; validation; protected CRUD API; paginated timeline UI; PL/EN copy; unit, Cloud, HTTP, and smoke coverage.

**Out of scope:** PDF import, medical interpretation, attachments, Markdown, search, sharing, soft delete, history, offline sync, automatic retries, and deployment.

## Architecture / Approach

Astro provides the protected page and initial owner-scoped read; React manages forms and in-memory drafts; API routes validate session/origin/input and resolve the patient from the session; Supabase persists records and independently enforces ownership and current birth-date constraints. Calendar dates stay `YYYY-MM-DD` strings throughout.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Data and access rules | Note schema, validation, RLS, Cloud isolation tests | Bypassing app checks through direct database access |
| 2. API and timeline | Full PL/EN create/read/edit/delete flow | Losing the user's draft after an error |
| 3. End-to-end verification | Smoke, isolation, documentation, UI review | Treating HTTP tests as browser-interaction proof |

**Prerequisites:** S-01 complete; approved Supabase Cloud project and existing test secrets available.
**Estimated effort:** About three implementation sessions plus final UI review.

## Open Risks & Assumptions

- The last successful write wins when two edits overlap; the app does not introduce conflict resolution.
- A network failure can leave the server outcome ambiguous, so the UI must tell the user to inspect the list before retrying.
- Cloud verification is only valid when the configured project and synthetic-test credentials are available.

## Success Criteria (Summary)

- Notes retain body, event date, and defined order after refresh and pagination.
- Owners can edit or permanently delete notes; another user cannot read or mutate them.
- A changed birth date preserves earlier notes but warns on them and prevents re-saving an invalid event date.
