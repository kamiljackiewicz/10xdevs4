# R5: keyboard correction and persisted profile edit

Browser facet of `context/foundation/test-plan.md` R5; modelled on
`tests/e2e/seed.spec.ts`. This standalone test covers Polish keyboard access,
required-field feedback and recovery through a real persisted edit. It does not
mark the full R5 rollout phase complete: EN, pending/error variants and visual
focus/contrast review remain separate work.

## Scenario and observed UI

1. Create a unique owned profile as fixture setup and open `/dashboard`.
2. Wait for Astro hydration. Use Tab and Enter to open `Edytuj profil`.
3. Tab to `Nazwisko`, clear it with keyboard shortcuts, tab to `Zapisz profil`
   and press Enter. Expect `aria-invalid` and accessible, visible feedback
   `To pole jest wymagane.`.
4. Tab back, type a corrected unique surname, return to save and press Enter.
5. Reload. The corrected surname and unchanged name, leap-day birth date and
   sex must all be displayed in `Profil pacjenta`.
6. Teardown removes only the temporary account and asserts no profile/notes
   remain, including after a failing test.

These steps were executed live with playwright-cli on 2026-11-26, using the
dedicated exploration account. All test interactions after navigation use the
keyboard; role locators identify expectations and tab targets. Checking the
active element observes focus rather than setting it programmatically.

## Boundaries and review

Real: browser keyboard/focus, React state and validation, auth cookies, app API,
remote Supabase and SSR reload. No mocks. Shared isolated-account provisioning
and cleanup stay in Node; admin credentials never enter the browser. Unique
tokens are attached to the Playwright report. Unit tests already cover profile
validation rules; this test covers reaching, correcting and saving the form.

- Naive assertion: visible validation linked to the field, then exact persisted
  profile values, not just a success page.
- Brittle selector: roles/labels only; one framework hydration query is not an
  element locator or CSS-dependent assertion.
- Shared state: separate temporary identity and data for every run.
- Hardcoded wait: hydration/state/response assertions, no timed sleeps.
- No cleanup: asserted account deletion and zero remaining patient/note rows.

## Verification

- Cold-server single-spec run: 2 passed (auth setup + R5).
- Deliberate regression: add `tabIndex={-1}` only to the surname input. The
  test failed at `control must be reachable with Tab` / `toBeFocused`, proving
  the assertion catches an actual keyboard reachability failure.
- The temporary production edit was restored byte for byte. Teardown succeeded
  after both the green and deliberately red run and asserted zero patient/note
  leftovers. Exploration data was also removed and checked separately.
- Project Stop hook passed lint, unit and interaction tests, and Astro check.
- Final cold whole-suite run: 4 passed (auth setup + seed + R4 + R5), with
  the three browser specs running in parallel. Production builds completed as
  part of the cold runs; formatting checks passed. No production source diff.
