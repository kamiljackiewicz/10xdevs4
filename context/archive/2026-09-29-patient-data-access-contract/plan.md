# Patient data access contract implementation plan

## Overview

Create the enforceable Supabase ownership boundary that every patient-data feature
will use. The MVP remains one email/password caregiver account per patient, with
private document storage and no patient-facing workflow in this change.

## Current State Analysis

Cookie-backed Supabase authentication and `/dashboard` route protection already
exist, but there are no application migrations, RLS policies, Storage buckets, or
domain tables. Middleware authentication alone cannot protect data accessed by a
future API or Supabase client.

## Desired End State

A Supabase Cloud database can represent one owner-bound patient root
per authenticated caregiver. RLS and private Storage policies deny cross-user
access. Later slices have a durable contract for patient ownership, review-before-
approval, and permanent deletion without prematurely adding their UI or tables.

### Key Discoveries

- `src/lib/supabase.ts` creates an SSR client from request cookies and server-only
  environment variables.
- `src/middleware.ts` currently protects only `/dashboard`; it is not a data
  authorization layer.
- `supabase/config.toml` enables migrations and Storage but the repository has no
  migrations or bucket policies.
- `scripts/smoke.mjs` and `.github/workflows/ci.yml` cover authentication only.

## What We're NOT Doing

- Patient profile creation UI, profile fields, or patient API routes.
- PDF upload, document metadata, extraction, results, parameters, timeline notes,
  comparisons, correction workflow, sharing, roles, or social login.
- A service-role key, public bucket, real patient data, or a decision about
  production data region and retention.

## Implementation Approach

Use Supabase migrations as the source of truth. A minimal `patients` root stores
only identity and ownership; a unique owner constraint enforces the single-patient
MVP rule. RLS and Storage policies always derive permission from `auth.uid()` and
the patient UUID embedded in a document object's key. Cloud integration tests
create two temporary authenticated users through a test-only administrative client,
and CI executes them separately from the existing HTTP auth smoke test.

## Critical Implementation Details

Deleting a database patient cannot delete Storage objects by cascade. This change
creates only the access boundary; a later deletion workflow must explicitly delete
the object's Storage row/file as part of its permanent-delete operation.

## Phase 1: Ownership and Storage boundary

### Overview

Create the minimal ownership root and the private document bucket policies that
future patient workflows inherit.

### Changes Required

#### 1. Supabase ownership migration

**File**: `supabase/migrations/<timestamp>_patient_data_access_contract.sql`

**Intent**: Establish an owner-bound patient root without adding patient-profile
fields or any result workflow.

**Contract**: Create `public.patients` with UUID `id`, `owner_id` referencing
`auth.users`, and audit timestamps. Default `owner_id` to `auth.uid()`, require it,
and make it unique. Enable RLS and provide owner-only select, insert, update, and
delete policies whose `USING` and `WITH CHECK` predicates require
`owner_id = auth.uid()`.

#### 2. Private document bucket and object policies

**File**: same migration

**Intent**: Reserve a non-public Storage boundary before PDF import exists.

**Contract**: Create a private `patient-documents` bucket. Object names use the
stable form `<patient-id>/<opaque-file-name>`. Select, insert, update, and delete
policies must authorize only when the first path segment resolves to a
`patients.id` owned by `auth.uid()`. Do not add an upload endpoint or metadata
table.

### Success Criteria

#### Automated Verification

- The migration applies cleanly to the linked Supabase Cloud project.
- The migration creates `patients`, enables RLS, creates the private bucket, and
  installs all required table and object policies.

#### Manual Verification

- Supabase Studio shows `patient-documents` as non-public and shows the expected
  migration objects; no patient-facing page or endpoint is introduced.

**Implementation Note**: Pause after the automated checks for human confirmation
of the Cloud database and bucket inspection before proceeding.

---

## Phase 2: Shared domain contract

### Overview

Document the invariants that later slices must honor, rather than designing their
schemas early.

### Changes Required

#### 1. Patient-data contract reference

**File**: `docs/reference/patient-data-access-contract.md`

**Intent**: Give S-01 through S-05 a single implementation reference for ownership,
approval, Storage naming, and deletion semantics.

**Contract**: State that patient-bound rows reference `patients.id`; their RLS
policies follow patient ownership; imported values are never initially approved and
require an explicit caregiver review transition in S-03; and product deletion is
permanent, including explicit Storage-object removal. State the selected MVP
boundaries: email/password only, one patient per caregiver, and no sharing.

### Success Criteria

#### Automated Verification

- The contract document references the migration's table and bucket identifiers
  exactly and introduces no unimplemented product route or schema.

#### Manual Verification

- A reviewer can use the reference to distinguish this foundation from S-01
  profile UI and S-03 import/approval implementation.

**Implementation Note**: Pause after the scope review before proceeding.

---

## Phase 3: Isolation verification and CI

### Overview

Make the data-access boundary reproducible and continuously checked.

### Changes Required

#### 1. Two-user database and Storage policy tests

**Files**: `scripts/supabase-cloud-access.mjs`, `package.json`

**Intent**: Prove policies deny cross-user access rather than relying on code
review or Studio inspection.

**Contract**: Add a runnable Cloud test command that provisions two authenticated
test identities in the approved Cloud project and verifies owner-only patient CRUD
plus owner-only Storage object read/write/update/delete through the real Storage
API. It demonstrates denial for the non-owner and always removes all temporary
identities, rows, and objects in `finally`. A test-only service-role key may create
and delete those identities; it is never used by application code or exposed to a
browser.

#### 2. CI database verification

**File**: `.github/workflows/ci.yml`

**Intent**: Run the new database isolation command against the approved Supabase
Cloud project in CI while preserving the existing browserless authentication smoke
test.

**Contract**: The workflow runs the new command with GitHub Actions secrets
`SUPABASE_URL`, `SUPABASE_KEY`, and `SUPABASE_TEST_SERVICE_ROLE_KEY`. The test
uses the same approved Cloud project, cleans up after itself, and must not print or
commit secrets.

### Success Criteria

#### Automated Verification

- The two-user database test passes against the linked Supabase Cloud project after
  the migration is applied.
- The CI workflow invokes the database isolation command with Supabase Cloud.
- `npm run lint`, `npm run build`, and the existing authentication smoke test pass.

#### Manual Verification

- A reviewer confirms the CI log includes the isolation test and that only
  temporary Cloud test identities and objects were used.

**Implementation Note**: Pause for manual CI confirmation before marking this
phase complete.

## Testing Strategy

- Database tests cover successful owner operations and denied non-owner operations
  for both `patients` and `storage.objects`.
- Existing smoke coverage remains responsible for signin, session handling,
  dashboard protection, and signout. It uses a temporary, pre-confirmed Cloud test
  user because production email confirmation must not send messages to arbitrary
  test addresses.
- Run lint and production build after each code/configuration change; the Cloud
  access test is executed only with the test-only service-role secret configured.

## Migration Notes

The repository currently has no product rows, so no backfill is required. Apply the
migration to the approved Cloud project. A production code rollback does not
undo this schema or Storage configuration; do not introduce real patient data until
region, retention, and privacy controls are separately approved.

## References

- `context/foundation/prd.md`
- `context/foundation/roadmap.md`
- `context/foundation/infrastructure.md`
- `src/lib/supabase.ts`
- `src/middleware.ts`
- `supabase/config.toml`
- `.github/workflows/ci.yml`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Ownership and Storage boundary

#### Automated

- [x] 1.1 Apply the owner-bound patients migration with RLS — 51c7463
- [x] 1.2 Create the private patient-documents bucket and owner-only object policies — 51c7463
- [x] 1.3 Verify the migration applies cleanly to Supabase Cloud — 51c7463

#### Manual

- [x] 1.4 Inspect the private bucket and migration objects in Supabase Dashboard — 51c7463

### Phase 2: Shared domain contract

#### Automated

- [x] 2.1 Add the patient-data contract reference with the approved invariants — 036ee5b

#### Manual

- [x] 2.2 Review the contract boundary against S-01 and S-03 scope — 036ee5b

### Phase 3: Isolation verification and CI

#### Automated

- [x] 3.1 Add and run two-user database and Storage isolation tests — 6ba14b9
- [x] 3.2 Run the isolation test in CI with Supabase Cloud — 6ba14b9
- [x] 3.3 Pass lint, build, and the existing authentication smoke test — 6ba14b9

#### Manual

- [x] 3.4 Confirm CI uses only temporary Cloud test identities and objects — 6ba14b9
