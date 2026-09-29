<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Record dated timeline notes

- **Plan**: context/changes/record-dated-timeline-note/plan.md
- **Scope**: Full plan
- **Reviewed phases**: 1, 2, 3
- **Date**: 2026-09-29
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 3 warnings, 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | WARNING |

## Verification evidence

- `npm run test:supabase-access` — PASS against Supabase Cloud.
- `BASE_URL=http://localhost:4321 npm run smoke` — PASS.
- `npm run test:unit` — PASS (16 tests).
- `npm run lint`, `npx astro check`, and `npm run build` — PASS.

## Findings

### F1 — Required timeline test matrix is only partially demonstrated

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Success Criteria
- **Location**: scripts/smoke.mjs:177
- **Detail**: The smoke test proves one-note CRUD, POST origin/content-type guards, forged patient-ID rejection, and SSR persistence. It does not prove ordering, more-than-50 pagination, same-day ordering, date moves, anonymous timeline access, PATCH/DELETE request guards, indistinguishable foreign-note 404s, or the UI warning after birth-date correction. The Cloud test proves some direct-RLS and birth-date behavior, but not ordering/pagination. Phase 2 and 3 mark those broader criteria complete.
- **Fix A ⭐ Recommended**: Add focused synthetic Cloud/smoke assertions for sort order, page boundaries, foreign/anonymous API contracts, remaining mutation guards, and the preserved-old-note warning.
  - Strength: Makes the completed verification claims evidence-backed without changing product behavior.
  - Tradeoff: Adds test-fixture setup and increases Cloud smoke duration.
  - Confidence: HIGH — the current synthetic harnesses already create and clean up owned patients and notes.
  - Blind spot: Browser-only hydration behavior still needs a human check.
- **Fix B**: Mark the unsupported verification criteria as pending in the plan.
  - Strength: Keeps the plan strictly truthful without adding test work now.
  - Tradeoff: Leaves meaningful regressions unguarded.
  - Confidence: HIGH — the missing assertions are directly observable in the scripts.
  - Blind spot: None significant.
- **Decision**: SKIPPED — current coverage accepted; the untested contract matrix remains a documented risk.

### F2 — Database and application whitespace normalization differ

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: supabase/migrations/20260929210000_timeline_notes.sql:29
- **Detail**: Application validation uses JavaScript `trim()` (`src/lib/timeline-notes.ts:25`), while the database trigger trims only ASCII whitespace. A direct database write containing only a non-ASCII whitespace character can meet the database's nonblank rule despite the stated normalized-body invariant.
- **Fix**: Define and apply the same explicit whitespace normalization rule in the database and application, with a direct-boundary regression test.
- **Decision**: FIXED — application normalization now uses the database trigger's explicit ASCII edge-whitespace rule, with a regression assertion for non-ASCII whitespace.

### F3 — Note-body validation error is not associated with its field

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/components/patient/TimelineNotes.tsx:136
- **Detail**: The date error uses `aria-describedby` and an error ID, but the note textarea always describes only its hint. Its validation error has neither an ID nor an alert role. This falls short of the planned associated, keyboard-accessible field errors.
- **Fix**: Give the body error an ID and conditionally include it in `aria-describedby` (or use `aria-errormessage`).
- **Decision**: FIXED — the textarea now conditionally describes its identified validation error alongside its hint.

### F4 — Malformed note IDs return an internal-error response

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/pages/api/timeline-notes/[id].ts:41
- **Detail**: A malformed route parameter reaches PostgREST and its UUID-cast error maps to `500`, while an unknown valid UUID maps to opaque `404`. No sensitive detail is exposed, but validating UUID syntax first would keep invalid and foreign resources equally opaque.
- **Fix**: Validate `params.id` before database calls and return `note_not_found` with 404 for invalid IDs.
- **Decision**: FIXED — PATCH and DELETE validate IDs before querying, return opaque 404s, and the smoke test covers both malformed-ID paths.

### F5 — Navigation intent changed after the plan was written

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/components/Welcome.astro:24
- **Detail**: The plan says timeline entry/back navigation is through the dashboard, while the implemented home entry and home back-link reflect the later approved user direction. The product change is intentional, but the descriptive Phase 2 contract remains stale.
- **Fix**: Record the approved home-navigation decision in a follow-up plan addendum when this change is next revised.
- **Decision**: FIXED — the plan now records the approved signed-in-home entry and return navigation.
