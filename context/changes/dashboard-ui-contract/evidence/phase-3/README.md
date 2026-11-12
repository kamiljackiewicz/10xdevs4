# Phase 3 verification evidence

## Baseline and browser availability

- Baseline source: commit `9b61db5fd023e8823b84283120e487263bf20353`, before connecting the dashboard theme.
- The local app was started at `http://127.0.0.1:4321`. Anonymous `/dashboard` returned HTTP 302 to `/auth/signin`; the sign-in page returned HTTP 200.
- Browser inventory initially reported `The browser access host is unavailable`. Native Chrome later showed a stale Vite optimized-dependency error; restarting the dev server restored the dashboard. No pre-change baseline screenshot was captured.
- Native Chrome was subsequently used in a separate Incognito window with a newly created synthetic account. The screenshots here contain synthetic data only, plus Chrome's responsive toolbar and DevTools. They are window captures, not cropped page exports; the toolbar records the CSS viewport dimensions.

## Browser observations — human review confirmed

- Verified browser sign-in with the synthetic account and anonymous dashboard redirect. Home displayed the authenticated entry points.
- Created a profile through the Polish form, including native keyboard entry of the date and sex. The read view displayed the persisted synthetic values after navigation.
- Submitting incomplete input showed textual field errors and retained the entered first name. Keyboard Tab showed visible focus on Home and an invalid surname field.
- Switched to English, opened edit, changed a value, then canceled: the read view retained the previously saved value.
- At 390 × 844, simulated offline networking in DevTools, attempted a PATCH, observed the generic save error and retained draft. Restored `No throttling`, saved again, and observed the updated synthetic value in the read view. Switched back to Polish and inspected the edit form.
- Calendar icons were visibly light against dark date fields; observed mobile forms used a single column and their controls remained within the viewport width. No numeric DOM overflow measurement was made.
- Found insufficient spacing between the React island and sign-out divider. Added a normal block wrapper around the island in `dashboard.astro`; the later mobile edit screenshots show the corrected separation.
- The test was interrupted when Chrome switched to the user's other window. Steering stopped to avoid operating on that unrelated page. The synthetic patient and user were then deleted through the scoped cleanup workflow and the temporary credential file removed.

### Screenshot inventory

- Desktop 1440 × 1000, before the spacing correction: `desktop-pl-create.png`, `desktop-pl-validation-focus.png`, `desktop-pl-field-focus.png`, `desktop-pl-read.png`, `desktop-en-read.png`.
- Mobile 390 × 844: `mobile-en-read.png` precedes the spacing correction; `mobile-en-edit.png`, `mobile-en-save-error.png`, `mobile-pl-read.png`, `mobile-pl-edit.png` follow it.
- The files are supporting observations, not a completed final visual baseline. No image was captured from the user's real profile or unrelated browser window.

### Still pending

- The user confirmed phase 3 after reviewing the alignment fixes and verification report. Manual criteria 3.4–3.6 are complete; the limitations below remain explicitly recorded.
- Timed pending-state/layout-stability demonstration remains part of the explicit seven-state gate in phase 4. Real requests completed too quickly to capture a reliable pending screenshot in this session.
- There is no pre-change screenshot baseline, so regression observations are supported by unchanged source/global styles and the current rendered views, not a pixel comparison against a prior image.

## Final follow-up after alignment feedback

- The user reviewed the UI and requested a better aligned sex-select arrow and centered save label, then confirmed the result looked better.
- `Select` now retains its native element and props but hides the browser arrow, adds a decorative ChevronDown at a token-scale right inset and vertical center, and reserves text padding. The submit spinner is positioned independently with symmetric label padding; stacked idle/pending labels still reserve a stable label area.
- A second synthetic fixture covered the completion branch in PL/EN. Its first name was U+FEFF, accepted by the existing database constraints but treated as empty by client normalization. This was a synthetic representation of incomplete data, not an actual historic patient row; no constraint was disabled or changed. Completing it through the UI successfully saved a valid first name and showed the read view.
- Final desktop 1440 × 1000 captures: `desktop-en-complete-final.png`, `desktop-en-read-final.png`, `desktop-pl-read-final.png`, `desktop-pl-edit-final.png`, `desktop-pl-action-focus-final.png`, `desktop-pl-save-focus-final.png`.
- Final mobile 390 × 844 captures: `mobile-pl-complete-final.png`, `mobile-en-complete-final.png`. These follow both the spacing and alignment corrections; earlier screenshots remain explicitly intermediate evidence.
- Keyboard navigation reached the save and cancel actions with visible focus. Enter on Cancel returned to the unchanged profile read view.
- Browser navigation through Home and timeline was checked, including keyboard activation of the Home link. The synthetic account was signed out, and a fresh `/dashboard` visit redirected to `/auth/signin`. Supporting images: `home-pl-regression-final.png`, `home-en-regression-final.png`, `timeline-pl-regression-final.png`, `signin-en-regression-final.png`.
- Both synthetic browser accounts/patients were cleaned up with owner-scoped deletion and verification; their temporary credential files were removed. No real patient profile was edited.
- After alignment changes, lint, Astro check, build and all 16 unit tests passed. The final smoke against the restarted current dev server also passed, with verified synthetic fixture cleanup. The earlier production-preview smoke pass remains recorded above.

## Automated evidence

- `npm run lint`: PASS, no warnings after adopting Astro's `class:list` convention.
- `npx astro check`: PASS, 47 files, zero errors/warnings/hints.
- `npm run build`: PASS. Existing sitemap warning remains: missing `site` option.
- `npm run test:unit`: PASS, 16 tests.
- `/10x-ui` hardcoded-value scan: PASS, zero matching lines in `dashboard.astro`, `PatientProfile.tsx` and `PatientProfileView.tsx`; baseline was 22 matching lines in the original two files.
- `git diff --check`: checked before handoff.
- After the island-spacing correction, lint, Astro check, build and all 16 unit tests were rerun successfully. Dev was stopped before build and restarted afterward to avoid invalidating a live Vite dependency cache. Workers preview was also restarted, and the full smoke rerun passed with verified fixture cleanup.

## Smoke blocker — resolved after service resume

- Production build preview was started at `http://127.0.0.1:4322`.
- Existing smoke was invoked with `BASE_URL=http://127.0.0.1:4322 node --env-file=.dev.vars scripts/smoke.mjs`. It failed at `temporary user setup`, before reaching dashboard assertions. No successful fixture setup was reported.
- Repeating outside the sandbox did not resolve the failure. Diagnostic requests initially encountered `ENOTFOUND`; a later HTTPS health request connected, but the final read-only admin diagnostic returned `AuthRetryableFetchError`, HTTP 521.
- The local `.env` and `.dev.vars` URLs/keys agreed; runtime variables matched `.dev.vars`. Values were not printed or changed. A successful health connection does not establish readiness of the authenticated API.
- The user confirmed the Supabase project had been paused and resumed it. The management CLI subsequently reported `COMING_UP`; later authenticated health returned HTTP 200, admin reads succeeded, and diagnostic synthetic user creation and cleanup succeeded.
- The final full smoke rerun passed every step: home, anonymous denial, wrong/correct sign-in, profile guards and validation, create/persistence, timeline CRUD, duplicate rejection, persistent PL/EN, profile edit, sign-out and verified synthetic fixture cleanup. The original smoke script and local credentials were unchanged.
- Progress item 3.2 is now complete. This result supersedes the earlier service blocker; it does not validate browser hydration or visual appearance.
- Manual checks 3.4–3.6 were subsequently confirmed by the user. No phase 3 commit has been created yet.
