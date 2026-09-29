# Private patient profile and Polish/English UI implementation plan

## Overview

Deliver S-01: a caregiver can create, view and edit their own single patient profile
on the dashboard. Add Polish and English throughout the existing application, with
Polish as the default and an explicit language switch persisted in a cookie.

## Current State Analysis

F-01 supplies `public.patients`, unique ownership, owner-only CRUD RLS and private
Storage policies. The table currently contains only identity and timestamps.
The dashboard is an authenticated placeholder. Astro pages and React auth forms
already use a cookie-backed Supabase SSR client. Cloud integration tests and CI
exist; the user requires the same Supabase Cloud project, without local Supabase.

## Desired End State

An authenticated caregiver sees a create form when no profile exists and their
profile with an edit action after saving. First name, last name, date of birth and sex are
required. Refreshing preserves the profile. A second caregiver cannot access it.
All current application screens, validation and application error messages support
PL/EN. The language choice survives navigation and refresh.

### Key Discoveries

- `src/pages/dashboard.astro` is the existing protected entry point.
- `src/middleware.ts` authenticates request cookies and guards `/dashboard`.
- `src/lib/supabase.ts` supplies the authenticated SSR client; application code
  must not use an administrative key.
- The F-01 migration already enforces one patient per owner and owner-only access.
- `scripts/smoke.mjs` provisions confirmed temporary users; public signup and
  email delivery are intentionally not part of automated Cloud smoke coverage.

## What We're NOT Doing

- Sharing, multiple patients, deleting profiles or medical interpretation.
- Importing PDFs, timeline notes, results or comparisons.
- Additional profile data such as diagnoses.
- Local Supabase, Docker, localized URLs or an external i18n library.
- Translating Supabase email templates or rewriting the landing-page product copy.

## Implementation Approach

Use typed in-repository PL/EN dictionaries shared by Astro and React. Resolve locale
from a validated cookie and pass the corresponding strings to React islands.
Extend the existing patient table through a new additive Cloud migration. Use the
authenticated SSR client for profile operations, server-side validation and the
existing RLS boundary. Test through both the real application and Supabase APIs.

## Critical Implementation Details

Never accept client ownership metadata as authority. Profile writes derive the
owner from the verified session. Keep profile values out of URLs, logs and raw
database error messages. Preserve entered values when displaying validation errors.
Retain existing patient IDs and ownership during migration; never fabricate birth
dates or sex for any pre-existing F-01 roots. Those roots need a completion state
until all required profile fields are supplied.

## Phase 1: Application-wide Polish and English

### Overview

Provide a common language mechanism and translate the current interface.

### Changes Required

#### 1. Locale and message contract

**Files**: `src/lib/i18n.ts`, `src/pages/api/locale.ts`, `src/env.d.ts`

**Intent**: Keep server-rendered and hydrated UI in the same language.

**Contract**: Support exactly `pl` and `en`, defaulting to `pl`. A POST language
endpoint validates the locale, persists cookie `locale`, and redirects only to a
validated same-origin relative path. Existing application URLs stay unchanged.
Resolve locale per request in middleware and expose it through typed locals;
never mutate a global locale. Use a one-year cookie with path `/`, HttpOnly,
SameSite=Lax and Secure on HTTPS. Return 400 for unsupported submitted locales;
missing or invalid stored preferences resolve to Polish. Return 303 after changes.

#### 2. Shared UI and current screens

**Files**: `src/layouts/Layout.astro`, `src/components/`, `src/pages/auth/`,
`src/pages/index.astro`, `src/pages/dashboard.astro`, `src/lib/config-status.ts`,
`src/pages/api/auth/`

**Intent**: Make the entire current application usable in either chosen language.

**Contract**: Translate navigation, landing text, page titles, forms, validation,
pending states, password-toggle labels, confirmation screens and configuration
messages. Set HTML language from the resolved locale. Map provider failures to safe
translated application messages. Preserve authentication semantics and redirects.
Display a language switch through the shared layout, available before login too.
Translate errors at rendering time from stable application error codes so switching
languages also changes an already displayed error. Keep provider details out of
query strings. Add `test:unit` using Node's built-in runner with TypeScript stripping
and `.mjs` test files importing the pure TypeScript helpers; no new test framework.
Wire that command into CI in this phase. Run `npm run smoke` for the auth-related
changes in this phase rather than deferring regression coverage to phase 3.
Unknown error codes render a generic translated message.

### Success Criteria

#### Automated Verification

- Locale selection, invalid-locale fallback, dictionary parity and safe redirects pass focused tests.
- Lint, Astro check and production build pass for the localized application.

#### Manual Verification

- All current screens render in PL and EN, including validation, and preserve the language across navigation.

**Implementation Note**: Pause for manual language review before the next phase.

## Phase 2: Private profile creation and editing

### Overview

Extend the Cloud schema and replace the dashboard placeholder with the profile flow.

### Changes Required

#### 1. Profile fields

**File**: `supabase/migrations/<timestamp>_patient_profile.sql`

**Intent**: Store the four required profile fields on the existing ownership root.

**Contract**: Add `first_name`, `last_name`, `date_of_birth` (PostgreSQL `date`) and `sex`
(`female` or `male`). Completed profiles require all four fields; reject blank
names, invalid/future birth dates and unsupported sex values. Preserve owner
uniqueness and RLS. Apply the migration to the approved Cloud project before
running profile code against it. Update existing test fixtures for the new fields.
Use nullable added columns plus explicit `CHECK ... NOT VALID` constraints requiring all
four valid values on every new insert or update. This preserves untouched legacy
roots without fabricated data, while all subsequent writes must complete them;
do not validate the constraint against old roots until they have been completed.
Use text first and last names trimmed to 1–100 Unicode code points and compare birth dates to today's
UTC calendar date consistently in validation. The completion UI updates the
existing root rather than inserting a second one. Include
`scripts/supabase-cloud-access.mjs` fixture updates in this phase before Cloud CI.

#### 2. Profile UI and authenticated writes

**Files**: `src/pages/dashboard.astro`, `src/components/patient/`,
`src/pages/api/patient.ts`, `src/lib/patient-profile.ts`

**Intent**: Let the caregiver create and correct their profile without leaving the dashboard.

**Contract**: Show create/completion, read and edit states in PL/EN. Validate required
first and last names, a real non-future calendar date and the two-value sex choice on the
server as well as in the form. Store the date without timezone conversion. The
write endpoint verifies authentication, selects allowed profile fields only and
uses the session-bound client. Distinguish creation from updating so a duplicate
create never silently overwrites an existing profile. Handle the unique-owner race
with a clear existing-profile response. Show safe errors and retain entered form
values on failure. Successful writes refresh the displayed persisted profile;
editing preserves the patient ID and updates its timestamp.
Use JSON POST `/api/patient` for creation and PATCH for editing/completion; only
`first_name`, `last_name`, `date_of_birth`, `sex` are writable. Select the target through the
session owner, not a submitted patient ID. Return 201/200 on success, 400 with
stable field error codes for invalid input, 401 without a session, 409 on duplicate
creation and 404 when editing a missing root. Handle other failures with a generic
500 response. Enforce same-origin mutation requests and JSON content type.
The React form retains values on failure and reloads `/dashboard` after success.
Render patient responses with `Cache-Control: private, no-store`.

### Success Criteria

#### Automated Verification

- The additive profile migration applies to Supabase Cloud and preserves ownership policies.
- Profile validation rejects missing fields, invalid/future dates and unsupported sex values.
- Lint, Astro check and production build pass for profile creation and editing.

#### Manual Verification

- A caregiver creates, reloads and edits a profile on the dashboard in both languages.

**Implementation Note**: Pause for manual profile review before the next phase.

## Phase 3: Cloud isolation and application verification

### Overview

Exercise the new behavior against the same Supabase Cloud project through CI.

### Changes Required

#### 1. Cloud access tests

**Files**: `scripts/supabase-cloud-access.mjs`

**Intent**: Verify that adding profile fields preserves the access boundary.

**Contract**: Use two temporary confirmed identities to test owner create/read/edit,
cross-user read/write denial and rejection of a second profile for one owner.
Retain existing private Storage tests. Administrative credentials are test-only;
policy assertions run with authenticated user clients.
Supply valid complete profile payloads even in denied writes and assert the RLS
error code (`42501`) rather than accepting any failure. Assert duplicate-owner
failure separately (`23505`). Check persisted values after writes. Update the
existing other-user fixture so required-field constraints cannot mask an RLS gap.

#### 2. HTTP smoke and CI

**Files**: `scripts/smoke.mjs`, `.github/workflows/ci.yml`, `README.md`

**Intent**: Verify persisted user-visible behavior and document the expanded checks.

**Contract**: Extend smoke to assert profile creation, rendered values, edit and
reload, anonymous denial and PL/EN switching with persisted language. Keep the
existing login/session/logout checks. Use synthetic data and guaranteed cleanup
attempts in `finally`, including when a request throws. Report cleanup failures as
test failures. CI uses the existing three repository secrets and Cloud-backed
Workers preview; never start local Supabase.

### Success Criteria

#### Automated Verification

- Cloud tests pass for profile persistence, owner isolation, single-patient uniqueness and existing private Storage access.
- HTTP smoke passes for authentication, profile create/edit/reload and persistent PL/EN selection, with test-data cleanup.
- CI passes lint, Astro check, build and both Cloud test commands.

#### Manual Verification

- The reviewer confirms both-language profile UX and successful Cloud CI with synthetic test data only.

**Implementation Note**: Record manual acceptance before marking the change implemented.

## Testing Strategy

Use focused validation/locale tests plus real Cloud integration and HTTP smoke.
Include empty names, missing fields, malformed and future dates, unsupported sex,
duplicate creation, anonymous requests, attempted ownership injection, foreign
patient access and language persistence. Verify persisted results rather than only
HTTP success. Keep credentials and patient values out of test diagnostics.
Commands: `npm run test:unit`, `npm run lint`, `npx astro check`, `npm run build`,
`npm run smoke` against a running Cloud-backed app, and `npm run test:supabase-access`.
If the test-only secret is available solely in GitHub, use CI for Cloud checks and
do not mark their criteria complete based on local static checks alone.
Test legacy-root completion without changing its patient ID. During Storage test
cleanup remove objects before patients and users. If object deletion fails, retain
its ownership root and user, fail explicitly and report only synthetic resource
identifiers needed for cleanup; never strand the object by deleting its owner.

## Migration Notes

Use a new migration; do not edit F-01's applied migration. Preserve any existing
roots and make incomplete roots explicit in the UI. Deploy schema before the
profile-dependent application. An application rollback leaves additive columns in
place. Production deployment is separate from this implementation plan.

## References

- `context/foundation/prd.md` — FR-001.
- `context/foundation/roadmap.md` — S-01 and completed F-01.
- `docs/reference/patient-data-access-contract.md` — ownership and Storage contract.
- `supabase/migrations/20260929175821_patient_data_access_contract.sql`.
- Planning conversation: required name/date/sex, two sex choices, editing,
  dashboard placement, whole-application PL/EN and three approved phases.

## Requirements correction — Phase 2

The original requirements mistakenly omitted last name. The corrected requirement
is separate required first and last names, not a scope extension. At the user's
request, the contracts above reflect that correction. The two profile SQL files
were consolidated into `20260929194000_patient_profile.sql` at the user's request;
Cloud tracking was synchronized without rerunning SQL or changing patient data.
The profile also needs a persistent route back to the homepage after saving.

- Add `last_name` to the profile input, selected data, form and read view in PL/EN.
  It is required, trimmed and limited to 1–100 Unicode code points, like first name.
- Include surname in the consolidated additive profile migration.
  Preserve existing records without inventing surnames; a separate `CHECK ... NOT VALID`
  requires a valid surname on future inserts/updates. Existing profiles missing it
  enter the completion state, preserving their IDs and other values.
- Allow only `first_name`, `last_name`, `date_of_birth`, `sex` in profile writes;
  update Cloud test fixtures and validation tests accordingly.
- Show a persistent “Zamknij panel / Close panel” link to `/` on the dashboard,
  outside form/state branches, including after save and when loading fails.
- Repeat phase 2 automated verification and manually confirm surname persistence,
  editing, and closing the panel after saving in both languages.

### Approved UI review follow-up

The user approved the Chrome review fixes: move the persistent homepage link to
the top of the panel, improve the native date picker's dark-theme contrast, and
show a localized, unambiguous birth date in the read view and alongside the native
date input (whose format is controlled by the browser). Replace starter marketing
with a minimal PL/EN patient-profile landing page and show authenticated users a
dashboard action instead of sign-in/sign-up calls to action. This supersedes the
landing-copy exclusion above. No new medical features or authentication semantics
are introduced; the personalized homepage must not be cached publicly.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Application-wide Polish and English

#### Automated

- [x] 1.1 Locale selection, invalid-locale fallback, dictionary parity and safe redirects pass focused tests. — 62a1ac7
- [x] 1.2 Lint, Astro check and production build pass for the localized application. — 62a1ac7

#### Manual

- [x] 1.3 All current screens render in PL and EN, including validation, and preserve the language across navigation. — 62a1ac7

### Phase 2: Private profile creation and editing

#### Automated

- [x] 2.1 The additive profile migration applies to Supabase Cloud and preserves ownership policies. — 3a3e061
- [x] 2.2 Profile validation rejects missing fields, invalid/future dates and unsupported sex values. — 3a3e061
- [x] 2.3 Lint, Astro check and production build pass for profile creation and editing. — 3a3e061

#### Manual

- [x] 2.4 A caregiver creates, reloads and edits a profile on the dashboard in both languages. — 3a3e061

### Phase 3: Cloud isolation and application verification

#### Automated

- [x] 3.1 Cloud tests pass for profile persistence, owner isolation, single-patient uniqueness and existing private Storage access. — f27deee
- [x] 3.2 HTTP smoke passes for authentication, profile create/edit/reload and persistent PL/EN selection, with test-data cleanup. — f27deee
- [x] 3.3 CI passes lint, Astro check, build and both Cloud test commands. — f27deee

#### Manual

- [x] 3.4 The reviewer confirms both-language profile UX and successful Cloud CI with synthetic test data only. — f27deee
