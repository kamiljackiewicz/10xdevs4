# Dashboard UI evidence

## Scope and provenance

The phase 3 render checks and screenshot inventory are in [phase-3/README.md](phase-3/README.md). They use synthetic data; no pre-change screenshot baseline was available. Existing phase 3 captures must not be presented as a before/after pixel comparison.

Phase 4 uses `/dev/dashboard-ui` only in development. Its React showcase mounts eight independent instances/scenarios with fixed date `2026-11-12` and synthetic fixture `Ada Fixture`, born `2000-01-02`. Profile messages come from the existing PL/EN dictionary. The shared presentation layer is `PatientProfileView`; the read-failure card reproduces the dashboard's alert because this branch belongs to its Astro page. No fixture is read from or saved to Supabase.

The showcase is client-only, so the production form's native API action is absent before hydration. Local submit callbacks prevent the default submission. A recovery link inside a save-failure card resets the local example. No profile API transport exists in the showcase. Production `/dev/dashboard-ui` must return 404 before rendering content; the real dashboard's middleware remains unchanged.

## Reproduction

1. Start `npm run dev` and open `/dev/dashboard-ui`. Use the existing language toolbar to select PL or EN.
2. Navigate to scenarios using the anchor links (`#read`, `#create`, `#complete`, `#edit`, `#field-error`, `#save-error`, `#load-error`, `#pending`). All cards remain mounted, with independent state and React-generated control IDs.
3. Hover over the actual actions, then use Tab / Shift+Tab through the controls. No simulated hover/focus classes are used.
4. In an edit card, compare the submit action and its cancel neighbor before and after saving. The local handler holds pending indefinitely. “Toggle loading” is outside the disabled fieldset and releases the state. “Reset example” restores the initial fixture.
5. Confirm field errors, retained draft on simulated save failure, read failure, empty create and incomplete-profile messages. The demonstration does not simulate a successful server write.
6. Repeat at CSS viewport sizes **1440 × 1000** and **390 × 844** in both languages. Save captures in `phase-4/` and record the inspected scenario and viewport.
7. In the production preview, request `/dev/dashboard-ui` and record its 404 response. In development, inspect profile API requests while exercising submit/recovery actions; expect none.

## Seven-state matrix — phase 4

Render verification completed in native Chrome on 2026-11-13. The user confirmed the phase 4 manual checks on 2026-11-13. Captures are whole-window PNGs including DevTools; the responsive toolbar records CSS viewport dimensions, not image dimensions.

| State         | Render target / action                                      | Evidence and result                                                                                                              |
| ------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Default       | Read card, shared summary and edit button                   | Observed: desktop-en-overview.png                                                                                                |
| Hover         | Pointer over actual edit/save/cancel action                 | Actual pointer interaction: mobile-pl-hover.png and mobile-pl-errors.png                                                         |
| Focus-visible | Tab through input, date picker, native select and actions   | Keyboard Tab: desktop-en-edit-focus.png                                                                                          |
| Disabled      | Pending card's native fieldset and submit                   | Native disabled fields/actions: mobile-en-pending.png                                                                            |
| Error         | Field-error, save-error and load-error cards; text and ARIA | Textual errors: desktop-pl-errors.png, mobile-pl-errors.png                                                                      |
| Empty         | Create card with empty values                               | Empty create: desktop-en-overview.png, desktop-pl-overview.png                                                                   |
| Loading       | Pending card; spinner, status, stable action position       | Spinner and stable actions: mobile-en-pending.png vs mobile-en-idle.png; desktop-pl-edit-idle.png vs desktop-pl-edit-pending.png |

## Capture and contrast results — phase 4

| Language | CSS viewport | Screenshot paths / result                                                                                     |
| -------- | ------------ | ------------------------------------------------------------------------------------------------------------- |
| PL       | 1440 × 1000  | phase-4/desktop-pl-overview.png, desktop-pl-errors.png, desktop-pl-edit-idle.png, desktop-pl-edit-pending.png |
| EN       | 1440 × 1000  | phase-4/desktop-en-overview.png, desktop-en-edit-focus.png, desktop-en-pending-network.png                    |
| PL       | 390 × 844    | phase-4/mobile-pl-edit.png, mobile-pl-hover.png, mobile-pl-errors.png                                         |
| EN       | 390 × 844    | phase-4/mobile-en-pending.png, mobile-en-idle.png                                                             |

Calculated from scoped sRGB tokens: foreground/card 13.35:1; muted-foreground/card 9.85:1; foreground/background 16.30:1; primary-foreground/primary 8.66:1; destructive/card 7.71:1; border/background 3.75:1; border/card 3.07:1; ring/card 7.92:1. Text exceeds 4.5:1 and essential borders exceed 3:1. These are opaque token pairs, not a full WCAG audit or measurements of every hover/opacity composite. Input focus uses the full ring token; the shared Button uses a translucent ring, calculated at 3.10:1 over card after 50% sRGB compositing. Calendar icons were visibly light on dark fields. Disabled fields remained legible, were reported disabled by Chrome AX and could not be edited. No horizontal clipping was observed at either CSS width; no numeric DOM overflow measurement was made. Idle/pending captures preserve the save and cancel positions in both languages. Long showcase content scrolls vertically.

## Automated and contract evidence — phase 4

- Lint, Astro check (50 files, zero diagnostics), build and unit (16 tests): PASS. Initial lint crashed in no-misused-promises on an Astro frontmatter Response return; the exception is restricted to the new dev page in eslint.config.js. No dependency or runtime behavior changed. Existing sitemap site warning remains.
- Final smoke after the recovery-href correction: PASS against the restarted dev app at 127.0.0.1:4321. Auth, profile, timeline, PL/EN persistence and signout passed; temporary patient/user cleanup was verified. Earlier production-preview smoke also passed.
- Guard: PASS. A disposable bg-purple-500 fixture returned 1 with file:line; a semantic bg-card/text-foreground/border-input fixture returned 0. Temporary files were removed. Default scan found zero matching lines in all three production view files (original baseline: 22 in two files). Explicit fixture paths can be passed to `node scripts/check-dashboard-ui.mjs <path>`; default invocation scans only the three approved view files.
- Production preview at 127.0.0.1:4322 returned HTTP 404 for /dev/dashboard-ui. Native Chrome Network filtered to /api/patient showed no matching Fetch/XHR while submitting the local edit form and switching pending/language. See desktop-en-pending-network.png. Source review confirms no fetch/API transport and default submission is prevented.
- C1 tokens: scoped source and existing semantic classes from phases 2–3.
- C2/C3 controls: shared `Button`, `Input`, `Select`, `Field`, and shared `PatientProfileView` from phases 1–3.
- C4 durability: repository UI rule outside the managed CLI block; the narrow guard is included in lint.
- C5 states: all seven states have render evidence above; human confirmation was received on 2026-11-13.
- Separate `/10x-impl-review dashboard-ui-contract`: pending after the implementation commits. No new findings have been silently waived.

## Findings and limits

- Fixed during phase 4: native activation of the shared recovery link could navigate to the real dashboard despite the local reset callback. The presentation view now accepts an optional reloadHref, defaulting to /dashboard for production; the showcase supplies #save-error. This is an additive presentation-only adaptation. Captures precede this href-only correction; appearance is unchanged. The correction passed lint, types, build and final smoke; the user subsequently confirmed the manual checks, including the local recovery link.
- The eight cards are independent instances using React useId; no hard-coded duplicate control IDs were added. Client-only rendering keeps native API actions out of unhydrated HTML.
- Manual phase 4 criteria were confirmed by the user on 2026-11-13 and marked complete in Progress. Separate implementation review remains pending. Progressive enhancement and the missing pre-change visual baseline remain explicitly deferred as recorded in phase 3.
