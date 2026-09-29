<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Patient data access contract

- **Plan**: context/changes/patient-data-access-contract/plan.md
- **Scope**: Full plan
- **Reviewed phases**: 1, 2, 3
- **Date**: 2026-09-29
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 2 warnings, 0 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | FAIL |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | WARNING |
| Pattern Consistency | PASS |
| Success Criteria | WARNING |

Plan Adherence has a noncritical FAIL because phase 3 explicitly requires non-owner Storage update denial coverage, which is missing. Existing automated checks pass but do not establish the full promised coverage. Safety/Architecture warnings refer to a conditional orphan-object ownership risk, not evidence of a current disclosure.

## Findings

### F1 — A retired patient ID can authorize access to retained documents

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: supabase/migrations/20260929175821_patient_data_access_contract.sql:17
- **Detail**: INSERT checks owner_id but allows client-supplied patient id; UPDATE likewise permits id changes. Storage SELECT (lines 39–52) authorizes the current owner of the UUID used as the folder name, not its original owner. If A deletes patient P or changes its ID while P/file remains, B knowing P can create their own valid patient with id=P, then satisfy the file's read/update/delete policies. A database cascade does not delete Storage objects. The plan acknowledges future cleanup, but does not prevent reassignment of that authorization namespace. The S-01 API field whitelist does not restrict direct authenticated Supabase calls. Read-only Cloud metadata confirms authenticated INSERT/UPDATE permissions on id, DELETE permission, ownership-only RLS predicates, and only the updated_at user trigger. The complete exploit was not executed and no patient data was read. The risk is conditional on a retained object and knowledge of its patient UUID; PDF upload and product deletion UI remain outside current scope.
- **Fix**: Add a forward migration enforcing server-assigned, immutable patient IDs for untrusted clients, preventing deliberate reuse of retired IDs; add a synthetic two-user delete/reclaim regression and document trusted administrative restore constraints.
  - Strength: Preserves the existing patient-folder contract and prevents ordinary clients from selecting a previously used authorization namespace.
  - Tradeoff: Changes the database write contract; administrative restore/import and any explicit-ID fixtures need review. A UUID default alone is insufficient.
  - Confidence: HIGH for the identified authorization gap; MED for the exact migration until designed and tested.
  - Blind spot: End-to-end Storage reproduction has not been run. Existing orphan inventory was deliberately not inspected. This fix does not replace required Storage cleanup in the future deletion workflow.
- **Decision**: FIXED — user approved the exact trigger and same-project Cloud migration. Applied `20260929203000_patient_id_guard.sql`; Cloud temporary-table probe passed (supplied ID replaced, ID update rejected, retired ID replaced on insert), and metadata confirms the trigger is attached to public.patients. Lint, build and 13 unit tests pass. Two-user integration regression added but awaits CI with the test-only secret; no end-to-end orphan-file exploit was executed. See follow-ups/review-fixes.md.

### F2 — Non-owner Storage overwrite is not tested

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: scripts/supabase-cloud-access.mjs:96
- **Detail**: The script tests owner replacement and foreign download, new upload and deletion, but never asks the other identity to update/overwrite an existing object. Phase 3 and Testing Strategy require denied non-owner operations for read/write/update/delete. The SQL UPDATE policy has both USING and WITH CHECK, but this part of its contract lacks an executable regression. Owner replacement also reuses identical bytes, so a stronger assertion should check persisted content.
- **Fix**: Attempt foreign Storage update/upsert with different synthetic bytes, assert denial and unchanged owner-readable content, and assert an owner update persists different bytes while retaining scoped cleanup.
- **Decision**: FIXED — user approved the exact test change. Owner replacement now persists different bytes; foreign update and upsert must fail, and an owner download verifies unchanged content. Cleanup is unchanged. Lint, build, 13 unit tests and script syntax checks pass; execution of the modified Cloud integration suite remains pending CI.

## Scope and evidence

- Historical implementation range: `51c7463^..3035086`; phase commits `51c7463`, `036ee5b`, `9cb9af3` and CI/smoke follow-ups `193005d`, `572ad63`, `6ba14b9`; completion recorded by `3035086`.
- Progress: 10/10 checked, phases 1–3, all with commit suffixes. change.md previously implemented. No lessons.md exists.
- Two reviewers separately examined plan drift and safety/patterns. Current files were compared with historical scope; later approved S-01 profile fields and test improvements were not labeled F-01 scope creep. Historical cleanup weaknesses already corrected by S-01 are excluded.
- Phase 1 minimal root, unique owner, owner CRUD policies and private bucket match planned structure. Phase 2 reference records ownership, review-before-approval, permanent deletion and MVP scope accurately; F1 exposes a gap in the original design, not merely implementation drift.
- README, CLI dependency/lockfile, ESLint tooling exclusion, CI branch correction and state documents are justified supporting changes, not new product features.

## Verification

| Command / evidence | Result |
|--------------------|--------|
| `npm run lint` | PASS — exit 0 |
| `npm run build` | PASS — build completed; existing sitemap site-option warning |
| `npm run smoke` locally | BLOCKED before assertions — missing exported SUPABASE_URL |
| `npm run test:supabase-access` locally | BLOCKED before assertions — missing exported SUPABASE_URL |
| GitHub CI 36600301193 for 6ba14b9d034f9d52936833f4e11aae6ad7feeb8e | PASS — rechecked ci and smoke jobs, including Cloud data-access isolation |
| Subsequent CI runs 36600585819, 36622482440, 36623046956 | success in GitHub run listing; current expanded smoke/isolation steps were verified in preceding S-01 review |
| Read-only Cloud metadata | patients RLS=true; four patient policies; four patient-document policies; bucket public=false |
| Read-only Cloud privileges/triggers | authenticated can insert/update id and delete own rows; ownership-only policies; only updated_at user trigger |

Historical CI: https://github.com/kamiljackiewicz/10xdevs4/actions/runs/36600301193. Cloud checks require the test-only secret, which is configured in CI; local precondition failures are not reported as test assertion failures or local passes. No migration was reapplied and no new Cloud fixtures were created. Current Cloud metadata corroborates deployment, but is not a fresh clean-database migration replay.

Manual items 1.4, 2.2 and 3.4 are checked and supported by the user's phase confirmations in the conversation, the shared contract, inspected Cloud metadata and successful CI steps. Studio/manual checks were not re-executed in this review. Passing CI does not remove the F2 coverage gap.

## Disposition

Original review saved and change.md marked impl_reviewed; this means reviewed, not approved. During subsequent triage, the user approved and applied F1, including its Cloud migration, and F2's test changes. Both findings are FIXED in code. Full integration verification remains pending CI, so original verdicts above describe the review snapshot, not a new post-fix approval. No archive, commit or push performed during triage.
