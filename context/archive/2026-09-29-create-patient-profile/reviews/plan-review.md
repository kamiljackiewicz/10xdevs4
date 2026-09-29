<!-- PLAN-REVIEW-REPORT -->
# Plan Review: Private patient profile and Polish/English UI

- **Plan**: `context/changes/create-patient-profile/plan.md`
- **Mode**: Deep
- **Date**: 2026-09-29
- **Verdict**: SOUND after targeted clarifications
- **Findings**: 0 critical, 4 warnings resolved, 0 observations

## Verdicts

| Dimension | Verdict |
| --- | --- |
| End-State Alignment | PASS |
| Lean Execution | PASS |
| Architectural Fitness | PASS |
| Blind Spots | PASS after fixes |
| Plan Completeness | PASS after fixes |

## Grounding

Existing dashboard, middleware, SSR client, configuration status, auth pages,
Cloud access test, smoke test and CI paths were inspected. New locale and profile
modules are intentional additions. `createClient`, `App.Locals`, `owner_id`,
`locale` and Cloud-secret use are consistent with the proposed interfaces.
Plan and brief agree on three phases and all user decisions. Progress has one
canonical section, three matching phases and eleven unchecked criteria, each
corresponding to one success criterion.

## Findings

### F1 — Legacy roots and required profile fields need an explicit transition

- **Severity**: WARNING
- **Impact**: MEDIUM
- **Dimension**: Blind Spots
- **Location**: Phase 2, migration
- **Detail**: F-01 contains no profile columns. Unconditional required columns would
  invalidate pre-existing roots or require fabricated data.
- **Fix**: Add nullable columns with a required-value CHECK constraint marked
  NOT VALID. Preserve untouched old roots and enforce complete values on subsequent
  inserts/updates. Complete old roots using their original IDs and test that behavior.
- **Decision**: FIXED in plan and summarized in brief.

### F2 — Required fields can make the existing RLS assertion falsely pass

- **Severity**: WARNING
- **Impact**: LOW
- **Dimension**: Plan Completeness
- **Location**: Phase 2 fixtures and phase 3 assertions
- **Detail**: `scripts/supabase-cloud-access.mjs:89` inserts an empty object and
  `:117` supplies only owner_id for the forbidden insert; any error currently passes.
- **Fix**: Move valid profile fixture updates into phase 2. Check RLS code 42501
  separately from uniqueness code 23505 and verify persisted values.
- **Decision**: FIXED.

### F3 — Raw auth messages cannot reliably follow a language switch

- **Severity**: WARNING
- **Impact**: LOW
- **Dimension**: Architectural Fitness
- **Location**: Phase 1 auth endpoints and rendering
- **Detail**: Existing signin/signup handlers place provider messages in URL query
  parameters, which pages pass directly to React forms.
- **Fix**: Use stable application error codes and translate while rendering;
  unknown codes use a safe translated fallback.
- **Decision**: FIXED.

### F4 — Failed Storage cleanup must preserve the ownership path

- **Severity**: WARNING
- **Impact**: LOW
- **Dimension**: Blind Spots
- **Location**: Phase 3 cleanup
- **Detail**: Storage authorization depends on the patient row. Removing patients
  and users after a failed object deletion can strand synthetic test objects.
- **Fix**: Remove objects first; on failure retain the ownership root/user and
  report a failing cleanup with synthetic identifiers. Keep smoke cleanup in finally.
- **Decision**: FIXED.

## Verification Boundary

This review verified source and plan contracts; it did not apply migrations or
execute product tests. Implementation and all manual acceptance rows remain pending.
