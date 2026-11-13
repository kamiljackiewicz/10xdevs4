<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Ochrona szkicu notatki

- **Plan**: context/changes/testing-note-draft-retention/plan.md
- **Scope**: Full plan
- **Reviewed phases**: 1, 2, 3
- **Date**: 2026-11-13
- **Verdict**: APPROVED
- **Findings**: 0 critical, 0 warnings, 0 observations
- **Implementation commits**: b069ec9, 3da2465, d5650d2
- **Epilogue commit**: dbc8495

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

No actionable findings. Two independent reviews covered all three phases: plan adherence and safety/quality/patterns. The prior phase-2 report remains as historical evidence; this report establishes full-plan coverage.

## Evidence

- `package.json:15` defines the separate interaction command. The manifest and lockfile resolve the planned Vitest, jsdom, Testing Library and MSW versions, with compatible peers and types. The Node unit runner remains separate.
- `vitest.config.ts:5` configures the alias and automatic JSX; its test settings restrict discovery to interaction TSX files, use jsdom at localhost, import test APIs explicitly and fail when no tests match.
- `tests/interaction/setup.ts:7` starts MSW before the relative-fetch adapter is installed. Cleanup removes DOM, resets handlers and restores fetch; the server closes after the suite. `tests/interaction/http.ts:6` forwards request options unchanged to the intercepted fetch while resolving relative string URLs.
- `tests/interaction/timeline-note-draft.test.tsx:47` defines six failures across create/edit and PL/EN. Raw DOM expectations and normalized payload expectations are independent literals. The existing edit fixture differs from the new draft in both fields.
- `tests/interaction/timeline-note-draft.test.tsx:144` checks field errors and their accessibility association; other failures require the appropriate message. The test changes both fields again after the response.
- `tests/interaction/timeline-note-draft.test.tsx:200` controls pending with a deferred response, tests inherited fieldset disabling and duplicate clicks, and releases the response in finally. Local validation uses catch-all request counting and requires zero HTTP.
- `.github/workflows/ci.yml:16` pins job ci to Node 22.23.2. Its interaction step is unconditional, immediately after unit tests and before Astro check. Parsed workflow comparison confirmed that the smoke job is unchanged from before phase 3.
- README and cookbook §6.1 reference the actual test case and command, describe isolation and limits, and avoid claims about hydration, persistent drafts or database outcomes. Rollout 1 is complete. Frozen strategy §1–§5 changed only in the permitted rollout status during implementation.
- The first phase included explicitly user-approved course/toolkit files. Those additions were authorized scope, not an unplanned product change. The production TimelineNotes component remains unchanged by this implementation.

## Verification

Checks rerun during this full review:

| Check | Result |
|-------|--------|
| Interaction suite with SUPABASE_URL, SUPABASE_KEY and SUPABASE_TEST_SERVICE_ROLE_KEY removed from the process environment | PASS: 32 tests; exit 0 |
| Interaction command with a filter matching no files | PASS: expected exit 1, No test files found |
| `npm run test:unit` | PASS: 21 tests; exit 0, including the separately delivered date-selector tests |
| `npm run lint` | PASS: UI guard and ESLint; exit 0 |
| `npx astro check` | PASS: 56 files; no errors, warnings or hints; exit 0 |
| `npm run build` | PASS: server build completed; exit 0 |
| Installed dependency/peer inspection | PASS: planned versions installed |
| Parsed CI runtime, step order, mandatory execution and retained smoke job | PASS |

Sensitivity was repeated against the unchanged production component. Independently clearing body or resetting event_date to 2000-01-01 in the failed-response path made the four selected create/edit × PL/EN JSON-500 tests fail their respective field assertions. The remaining 28 tests were outside the targeted filter. Original bytes were restored in finally after each attempt, and the full 32-test interaction suite passed again after restoration.

Component SHA-256 before and after the checks: `9deaa3b7750eccb8f3f2c77d7d5bc6c0d59168b95127792eb8787c56a82888dc`, matching the phase-3 evidence.

The build retained the pre-existing sitemap warning about the missing site option. Wrangler log writing required elevated execution outside the filesystem sandbox.

## Limits and Completion

All eight Progress criteria are complete and carry phase commit SHAs. No manual/visual gate is required by this plan. Coverage here is explicitly phases 1, 2 and 3.

These tests prove retention in a mounted DOM form after a resolved failure. They do not prove Astro hydration, native calendar rendering, persistence after leaving the form, a failed database commit after lost response, or safe idempotent retries. No remote GitHub Actions or Cloud smoke run was claimed from these local checks.

The full review is approved for archive. SHA ancestry was verified against refreshed origin/main snapshot e567421a702f8eee72980133cbcf24a0834dc8b8; all three implementation commits are present, with no repointing needed.
