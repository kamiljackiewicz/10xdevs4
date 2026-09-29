<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Private patient profile and Polish/English UI

- **Plan**: context/changes/create-patient-profile/plan.md
- **Scope**: Full plan
- **Reviewed phases**: 1, 2, 3
- **Date**: 2026-09-29
- **Verdict**: APPROVED
- **Findings**: 0 critical, 0 warnings, 0 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Findings

No confirmed actionable findings. No code fixes or triage decisions required.

## Scope and evidence

Reviewed implementation commits `62a1ac7`, `3a3e061`, `f27deee` and close-out `1d43b35`, using diff `62a1ac7^..1d43b35`. Progress contains 11/11 completed items across phases 1–3. Later roadmap commit `04586bc` and uncommitted lesson-tooling installation are outside the implementation scope. No lessons.md exists.

Two independent reviewers checked plan adherence/scope and safety/quality/patterns. Main reviewer checked verification evidence and investigated their shared SQL concern against the approved Cloud database.

- Locale resolution is request-scoped; PL/EN dictionaries, safe redirect validation, cookie flags and stable translated error codes match phase 1.
- Profile validation, session-bound ownership, RLS, create/update distinction, HTTP guards and private/no-store responses match phase 2. Legacy roots use completion/PATCH without changing identity.
- Required surname, persistent homepage action, date presentation and revised landing page are explicitly approved corrections, not unexplained scope growth.
- Cloud tests use authenticated synthetic identities for assertions, exact denial/uniqueness codes, persisted values and object cleanup before root/user cleanup. Smoke covers HTTP auth/profile/locale lifecycle.
- SQL legacy-root test exists at `supabase/tests/patient_profile_contract.sql:28`, exercising the deployed constraints on a temporary table and preserving ID through completion.

## Verification

| Command / evidence | Result |
|--------------------|--------|
| `npm run test:unit` | PASS — 13 tests, 0 failures |
| `npm run lint` | PASS — exit 0 |
| `npx astro check` | PASS — 37 files, 0 errors/warnings/hints |
| `npm run build` | PASS — elevated rerun succeeded after sandbox denied Wrangler log writes; existing sitemap site-option warning remains |
| `npm run smoke` locally | BLOCKED before assertions — missing exported SUPABASE_URL; not counted as a successful local run |
| `npm run test:supabase-access` locally | BLOCKED before assertions — missing exported SUPABASE_URL; not counted as a successful local run |
| GitHub CI run 36622482440, SHA f27deee523d70a236da7333409551b87489d44d1 | PASS — rechecked through gh; both ci and smoke jobs succeeded, including Cloud profile/language/auth smoke and private Storage isolation |

CI evidence: https://github.com/kamiljackiewicz/10xdevs4/actions/runs/36622482440. Application/test code has not changed since that passing run. The plan explicitly allows CI-only Cloud verification when test-only secrets reside in GitHub. No CI rerun or new Cloud test fixtures were created during review.

Manual criteria 1.3, 2.4 and 3.4 are checked and supported by user acceptance recorded in change.md and the conversation. Browser UX was not re-executed in this review. HTTP smoke does not exercise hydrated React interactions; the manual gate remains relevant. The temporary-table legacy SQL test is not wired into CI and was not rerun here; its earlier successful execution is recorded in change.md.

## Investigated and excluded concern

Both reviewers suspected that the first-name constraint's escape sequence for vertical tab might instead trim literal `v`. Main review tested only synthetic constants and read constraint metadata in Supabase Cloud, without accessing patient records or modifying schema/data. Actual results: `ascii(E'\v') = 11`, the migration trim expression accepts `Gustav`, and the deployed constraint contains U+000B. The suspected defect is therefore not supported on the approved database and is excluded from findings. This is not a portability assertion about other PostgreSQL versions.

## Disposition

Review complete. No implementation files changed. change.md marked impl_reviewed; Progress and roadmap remain unchanged. No commit, push, archive, or production deployment performed by this review.
