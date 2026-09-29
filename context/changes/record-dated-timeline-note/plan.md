# Record dated timeline notes Implementation Plan

## Overview

Add a caregiver-owned timeline of dated plain-text patient notes, including creation, reading, editing, and confirmed permanent deletion.

## Current State Analysis

- The dashboard loads the signed-in owner's patient profile with `private, no-store` responses.
- The patient API already validates sessions, `Origin`, JSON requests, and allowed fields.
- The codebase has calendar-date helpers that avoid timezone day shifts and PL/EN dictionaries.
- Supabase Cloud integration tests use synthetic identities, while the product currently has no notes schema, API, or UI.

## Desired End State

An owner can navigate from the dashboard to `/dashboard/timeline`, see an explicit empty or load-error state, and manage notes in a paginated chronological list. Notes retain their body, date, and ordering after reload; non-owners cannot access them through either the app or Supabase.

### Key Discoveries

- `src/pages/api/patient.ts` establishes the mutation-validation pattern to extend.
- `src/pages/dashboard.astro` establishes the protected, uncached SSR data-read pattern.
- `src/lib/i18n.ts` contains date formatting that preserves a calendar day.
- `scripts/smoke.mjs` and `scripts/supabase-cloud-access.mjs` provide the existing synthetic HTTP and database-access test harnesses.

## What We're NOT Doing

- Importing PDFs, comparing results, medical interpretation, patient sharing, or attachments.
- Titles, categories, Markdown, search, filtering, soft delete, version history, or recovery of deleted notes.
- Conflict resolution beyond last successful save, automatic retry, offline sync, or persistent browser drafts.
- Production deployment.

## Implementation Approach

Keep event dates as `YYYY-MM-DD` strings rather than timestamps. Share note-domain validation between forms and routes; make the database the final authority through constraints/triggers and RLS. Let Astro load the first owner-scoped page and React refresh list state after mutations while retaining an unsaved in-memory draft on errors.

## Critical Implementation Details

Changing a patient's birth date must never retroactively reject, alter, or delete notes. Insert and update operations must validate against the *current* birth date, so an existing now-invalid note can be deleted but cannot be saved again until its date is corrected.

## Phase 1: Data and access rules

### Overview

Establish durable note storage and the domain/security rules that apply even outside the web app.

### Changes Required:

#### 1. Timeline-notes migration

**File**: `supabase/migrations/<timestamp>_create_timeline_notes.sql`

**Intent**: Persist notes under a patient and enforce the owner and birth-date invariants in Supabase.

**Contract**: Add `timeline_notes(id, patient_id, event_date, body, created_at, updated_at)` with a cascading patient foreign key; database-assigned identity/timestamps; immutable `id`, `patient_id`, and `created_at`; automatic `updated_at`; normalized nonblank 1–5000-code-point body; finite `0001`–`9999` calendar date; and an index on `(patient_id, event_date DESC, created_at DESC, id DESC)`. RLS SELECT/INSERT/UPDATE/DELETE predicates must prove ownership through `patients`; anonymous users have no access. INSERT/UPDATE must reject a missing patient birth date or an event date before it, without revalidating old notes when `patients.birth_date` changes.

#### 2. Timeline-note domain helpers and unit tests

**Files**: `src/lib/timeline-notes.ts`, `src/lib/timeline-notes.test.ts`

**Intent**: Give UI and API the same field-level input rules and safe note projection.

**Contract**: Define a note record/read projection, `{ event_date, body }` input, field error codes, newline and edge-whitespace normalization, and calendar/birth-date validation. Future dates are valid; the birth day itself is valid; invalid leap dates and dates before birth are rejected.

#### 3. Cloud access tests

**File**: `scripts/supabase-cloud-access.mjs`

**Intent**: Demonstrate that ownership and write invariants are protected at the actual database boundary.

**Contract**: Extend synthetic fixtures and cleanup to cover owner CRUD, second-user denials, direct invalid writes, metadata immutability, and cascade deletion. The service key may prepare and clean fixtures only, never stand in for a user assertion.

### Success Criteria:

#### Automated Verification:

- Unit tests cover normalization, empty/whitespace input, 5000/5001 Unicode code points, emoji, paragraphs, birth-date boundaries, leap dates, and future dates.
- The migration and Cloud test prove owner CRUD, cross-user isolation, immutable metadata, direct-write validation, and cascade cleanup.
- `npm run lint`, `npx astro check`, and `npm run build` pass.

## Phase 2: API and separate timeline

### Overview

Expose the guarded CRUD contract and a usable localized timeline page.

### Changes Required:

#### 1. Timeline note API routes

**Files**: `src/pages/api/timeline-notes.ts`, `src/pages/api/timeline-notes/[id].ts`

**Intent**: Provide owner-scoped mutations without accepting a client-supplied patient identifier.

**Contract**: `POST /api/timeline-notes` accepts `{ event_date, body }` and returns `201 { note }`; `PATCH` on `[id]` accepts the same shape and returns `200 { note }`; `DELETE` returns `204`. Mutations require session and matching `Origin`; POST/PATCH require JSON. Return 401 for no session, 403 for origin failure, 415 for bad content type, 400 for invalid input, identical 404 for absent/foreign notes or no profile, and 409 when no birth date prevents saving. Re-read the current birth date and map a concurrent database rejection to a safe user-facing error. All responses are `private, no-store`; never log note bodies or expose raw database errors.

#### 2. Owner-scoped timeline page and UI

**Files**: `src/pages/dashboard/timeline.astro`, `src/components/TimelineNotes.tsx`, `src/pages/dashboard.astro`, `src/lib/i18n.ts`

**Intent**: Provide a separate accessible PL/EN workspace for managing history.

**Contract**: SSR load only the signed-in owner's notes, sorted by `event_date DESC, created_at DESC, id DESC`, 50 per `page` query parameter, with previous/next navigation. Link to the page from an existing dashboard profile; show a profile-creation link when no patient exists. Render bodies as text preserving line breaks. New-form local default uses the device's current calendar day; edit preserves the stored date. Disable duplicate operations while pending, retain drafts in component memory on failures, and advise users to inspect the list after ambiguous network failures rather than retrying automatically. Create/edit refresh page one; delete refreshes the current page and moves back if that page becomes empty. Require explicit irreversible-delete confirmation. Flag existing notes before the current birth date, while requiring a corrected date on re-save. Use labeled keyboard-accessible form errors and localized labels, states, confirmation, and messages.

#### 3. HTTP and page behavior tests

**Files**: `scripts/smoke.mjs` and focused unit/component tests where existing test tooling supports them

**Intent**: Verify endpoint contracts and that SSR reflects persisted mutations.

**Contract**: Cover request/session/origin/content-type failures, POST/PATCH/DELETE success, same 404 for foreign IDs, no trust of a supplied patient ID, and SSR-visible create/edit/delete behavior.

### Success Criteria:

#### Automated Verification:

- HTTP tests prove endpoint contracts, request guards, and SSR-visible data after create, edit, and delete.
- `npm run lint`, `npm run test:unit`, `npx astro check`, and `npm run build` pass.

#### Manual Verification:

- In PL and EN, navigation, keyboard form flow, confirmations, empty/load-error states, and draft retention after a failure work as specified.

## Phase 3: End-to-end verification

### Overview

Make the full path repeatable and confirm browser behavior beyond HTTP assertions.

### Changes Required:

#### 1. Smoke coverage, cleanup, and documentation

**Files**: `scripts/smoke.mjs`, `scripts/supabase-cloud-access.mjs`, `README.md` (only if its setup/test instructions need updating)

**Intent**: Exercise the lifecycle with synthetic Cloud data and document any new verification prerequisite.

**Contract**: Test persistence, ordering, pagination, birth-date correction warning and re-save rule, owner denials, and cleanup even after assertion failure. Reuse current CI tasks and do not add a new test framework.

### Success Criteria:

#### Automated Verification:

- Full smoke and Cloud tests prove persistence, ordering, pagination, birth-date correction behavior, denied access, and fixture cleanup.
- Final `npm run lint`, `npm run test:unit`, `npx astro check`, and `npm run build` pass.

#### Manual Verification:

- Browser review confirms local-date defaults, Polish and English copy, empty/error states, and the warning for a preserved pre-birth-date note.

## Testing Strategy

- Test date boundaries, leap dates, no timezone display shift, future days, and corrected birth dates.
- Test body normalization, whitespace-only bodies, 5000/5001 code points, emoji, paragraphs, and HTML-looking content.
- Test ordering across dates and same-day creation, edit behavior, date moves, and page transitions.
- Test anonymous/cross-user access, forged patient IDs, metadata changes, direct database writes, and invalid Origin.
- Treat HTTP coverage as complementary to manual hydration, keyboard, confirmation, and form-error checks.

## Performance Considerations

Fetch at most 50 rows per page using the patient/date/creation index. No realtime subscription or extra patient-data cache is required; page-boundary shifts from concurrent changes are acceptable for this single-owner MVP.

## Migration Notes

The migration is additive and needs no backfill. Apply it to the approved Supabase project before app and Cloud-test rollout; an app rollback leaves the new table and data intact. Verify the CLI project link before applying it, and report unavailable credentials/access as an unperformed check rather than a pass.

## References

- `context/foundation/prd.md` — FR-004 and MVP boundaries.
- `context/foundation/roadmap.md` — S-02.
- `docs/reference/patient-data-access-contract.md:17` — ownership rules.
- `src/pages/api/patient.ts:13` — mutation guard pattern.
- `src/pages/dashboard.astro:10` — private SSR read pattern.
- `src/lib/i18n.ts:166` — date formatting pattern.
- `scripts/smoke.mjs:27` — authenticated HTTP tests.
- `scripts/supabase-cloud-access.mjs:27` — synthetic identities and isolation tests.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Data and access rules

#### Automated

- [x] 1.1 Unit tests cover validation, normalization, and the 5000-code-point limit. — 934eefe
- [x] 1.2 Migration and Cloud tests prove CRUD, isolation, immutable metadata, and cascade cleanup. — 934eefe
- [x] 1.3 Lint, Astro check, and production build pass. — 934eefe

### Phase 2: API and separate timeline

#### Automated

- [x] 2.1 HTTP tests prove API contracts, request guards, and SSR-visible CRUD.
- [x] 2.2 Lint, unit tests, Astro check, and production build pass.

#### Manual

- [x] 2.3 PL/EN navigation, forms, confirmation, keyboard flow, and draft retention work.

### Phase 3: End-to-end verification

#### Automated

- [ ] 3.1 Full smoke and Cloud tests prove persistence, ordering, pagination, birth-date correction, denials, and cleanup.
- [ ] 3.2 Final lint, unit tests, Astro check, and production build pass.

#### Manual

- [ ] 3.3 Browser review confirms date defaults, localized copy, states, and the old-note warning.
