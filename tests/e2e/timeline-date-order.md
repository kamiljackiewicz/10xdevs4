# R4: calendar days and chronology after reload

Standalone browser facet selected by the user, based on
`context/foundation/test-plan.md` R4 and its warning that correct parsing does
not prove a correct screen. Validation and localized date formatting already
have unit coverage in `scripts/timeline-notes.test.mjs` and
`scripts/i18n.test.mjs`. Seed: `tests/e2e/seed.spec.ts`.

## Scenario

1. Provision a unique temporary identity and load its real app authentication
   cookies as storageState. Create its patient profile through the real API.
2. Open the timeline and verify the empty state.
3. Through the hydrated UI, save a note dated 2024-03-31 and then one dated
   2024-02-29. Inserting the earlier day last distinguishes event order from
   insertion order; leap day and the March DST boundary exercise calendar dates.
4. Reload the SSR timeline. Assert the exact visible Polish dates and both
   note bodies in newest-event-first order.
5. Always delete the temporary identity. Assert successful deletion and zero
   patient/note rows for its IDs after cascading cleanup.

## Observations and boundaries

Live exploration on 2026-11-26 exposed `Dodaj notatkę`, `Data zdarzenia`,
`Notatka` and `Zapisz notatkę`. After save and reload, semantic list items showed
`31 marca 2024` before `29 lutego 2024`. The exploration profile and notes were
removed with an asserted zero-leftover check.

Real: browser, React hydration, auth cookies, app routing/API, remote Supabase,
RLS, persistence and SSR. No network mocks. Administrative access is restricted
to temporary identity provisioning and cleanup in a Node-only fixture; the test
creates application data through the owned API/UI and asserts browser output.
The browser never receives the service-role key. This fixture needs the existing
ignored `.dev.vars` variables `SUPABASE_URL` and `SUPABASE_TEST_SERVICE_ROLE_KEY`.

## Review

- Naive assertion: exact dates and ordered note bodies after reload.
- Brittle selector: semantic roles/labels and exact accessible names only.
- Shared state: unique identity and token per test; fixture overrides storageState.
- Hardcoded wait: visible states, responses and a repeatable form-opening action;
  record creation is never retried.
- No cleanup: fixture teardown runs on success/failure, asserts every result and
  verifies no rows remain. The token is attached to the Playwright report.

## Verification

- Cold-server single-spec run: 2 passed (setup + R4).
- Deliberate regression: change the SSR `event_date` query to ascending order.
  The test failed on the ordered note-body assertion, with earlier/later reversed.
- Deliberate regression: render 2024-03-30 instead of the stored event day.
  The test failed on the exact visible `31 marca 2024` assertion.
- Both temporary production edits were restored byte for byte immediately after
  their respective red runs. Fixture teardown passed after each green/red run,
  including the queries asserting zero remaining patient/note rows.
- Final cold whole-suite run: 3 passed (setup + seed + R4). After adding the
  helper's explicit missing-env guard for TypeScript, the R4 run again passed
  (2 tests including setup).
- Project Stop hook passed: changed-file lint, all unit tests, interaction tests
  and Astro check. Formatting passed; production builds completed in the cold
  Playwright runs. Production source files have no final diff.
