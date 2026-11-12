<!-- IMPL-REVIEW-REPORT -->

# Implementation Review: Dashboard UI contract

- **Plan**: context/changes/dashboard-ui-contract/plan.md
- **Scope**: Full plan
- **Reviewed phases**: 1, 2, 3, 4
- **Date**: 2026-11-13
- **Reviewed HEAD**: 95c749ee70a15d20702ae20ed9cc3ff56f8de6fe
- **Verdict**: APPROVED
- **Findings**: 0 critical, 1 warning (resolved), 0 observations; 0 open

APPROVED. F1 was fixed during user-authorized triage on 2026-11-13 and verified in native Chrome at both CSS viewport sizes and in both languages.

## Verdicts

| Dimension           | Verdict |
| ------------------- | ------- |
| Plan Adherence      | PASS    |
| Scope Discipline    | PASS    |
| Safety & Quality    | PASS    |
| Architecture        | PASS    |
| Pattern Consistency | PASS    |
| Success Criteria    | PASS    |

The initial three WARNING verdicts referred to F1. After its narrow correction, the affected dimensions pass. Original finding details below are preserved as review history.

## Findings

### F1 — Spinner overlaps the pending save label

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence / Safety & Quality / Success Criteria
- **Location**: src/components/patient/PatientProfileView.tsx:181
- **Detail**: The submit button uses `px-10` and always contains a direct `LoaderCircle` SVG, including when invisible in idle state. The unchanged shared Button default size adds `has-[>svg]:px-3` (src/components/ui/button.tsx:22). Its more specific selector overrides plain `px-10`, leaving 12px padding. The absolute spinner also begins at `left-3`, so it overlaps the first glyphs of “Zapisywanie...” / “Saving...”. Both independent reviewers confirmed the source/CSS interaction and the committed visual evidence: evidence/phase-4/desktop-pl-edit-pending.png and evidence/phase-4/mobile-en-pending.png. Button geometry remains stable, but the pending label is less readable than required by phases 3–4.
- **Fix**: Add `has-[>svg]:px-10` to this submit button's local className, preserving shared Button styles. Recheck PL/EN idle and pending at desktop/mobile widths and record new captures; rerun the required lint/build gates.
- **Confidence**: HIGH — source, generated CSS and screenshots agree.
- **Decision**: FIXED — added local has-[>svg]:px-10; verified PL/EN idle/pending at desktop/mobile widths on 2026-11-13.

## Scope and plan coverage

The review compared the implementation commits `f28d5c2`, `9b61db5`, `9a62f0b`, `31b6289` and closing documentation `95c749e`, using `f28d5c2^` as the source baseline. The separately authorized Supabase CLI upgrade `2952649` is excluded from UI scope findings. Its README, dependency and Supabase config changes are not attributed to the dashboard plan.

Two independent reviewers examined plan adherence and safety/quality/patterns; the primary reviewer reconciled their findings, checked source locations, inspected evidence and reran automated verification. Both reported only F1.

| Planned work                                                                  | Result                                                                                                    |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Phase 1: native Input/Select props, refs, ARIA and Field wiring               | MATCH; native props/ref spread preserved, native select retained                                          |
| Phase 1: preserve existing Button and auth FormField                          | MATCH; no source changes to either existing component                                                     |
| Phase 2: exact scoped token values and provenance                             | MATCH; CSS and token table agree; global root, dark, body and cosmic definitions unchanged                |
| Phase 3: presentation/controller separation                                   | MATCH; transport, validation, failure handling and draft behavior retained                                |
| Phase 3: SSR ownership, session, localization and native constraints          | MATCH; no changes to API, middleware or i18n; owner filter and no-store retained                          |
| Phases 3–4: readable pending action and stable layout                         | DRIFT limited to F1; dimensions remain stable                                                             |
| Phase 4: development-only showcase, eight scenarios, seven interaction states | MATCH apart from F1; synthetic fixed fixtures, shared view, independent useId instances, no API transport |
| Phase 4: durable rule and narrow guard integrated into lint                   | MATCH; rule outside managed CLI block, exactly three default scan files                                   |

Bounded adaptations are documented: client-only showcase avoids native submissions before hydration; optional `reloadHref` defaults to the original production path while the showcase uses a local fragment; the ESLint exception disables one crashing rule for only the new Astro dev page. No new runtime dependency, theme switch, data migration or deployment was introduced by the UI change.

## Automated verification rerun

| Command / check                                                              | Result and observed output                                                                                                                                              |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`                                                               | PASS, exit 0; guard: `0 literal-value lines in 3 file(s)`; ESLint clean                                                                                                 |
| `npx astro check`                                                            | PASS, exit 0; 50 files, 0 errors, 0 warnings, 0 hints                                                                                                                   |
| `npm run build`                                                              | PASS, exit 0; Cloudflare server build complete; existing missing-site sitemap warning only                                                                              |
| `npm run test:unit`                                                          | PASS, exit 0; 16 tests, 16 passed, 0 failed                                                                                                                             |
| `node scripts/check-dashboard-ui.mjs`                                        | PASS, exit 0; zero matches in the three production view files                                                                                                           |
| Guard disposable fixture with `bg-purple-500`                                | Expected exit 1, observed 1; diagnostic includes file:line                                                                                                              |
| Guard disposable semantic fixture                                            | Expected exit 0, observed 0; temporary files removed                                                                                                                    |
| Production preview GET `/dev/dashboard-ui`                                   | PASS, HTTP 404 on freshly started current build at 127.0.0.1:4322                                                                                                       |
| `BASE_URL=http://127.0.0.1:4322 node --env-file=.dev.vars scripts/smoke.mjs` | PASS, exit 0; home, anonymous denial, authentication, profile guards/create/edit, timeline CRUD, PL/EN persistence and signout; temporary user/profile cleanup verified |

The dev server was stopped before check/build to avoid invalidating a running Vite dependency cache. Preview was restarted after the build. Existing ignored local environment files supplied credentials; no secrets were printed or committed.

## Manual criteria and evidence

All 18 Progress rows are checked, including the human-confirmed manual criteria for phases 1–4, with implementation SHA receipts. Source diffs support the preparatory component and scoped-theme criteria. Phase 3 evidence documents actual synthetic-account flows, focus, draft retention, cancel, navigation and signout; phase 4 records PL/EN CSS viewports 1440 × 1000 and 390 × 844, seven states, contrast calculations and idle/pending captures.

Evidence is not treated as flawless solely because it was confirmed: F1 is visible in the pending captures and qualifies claims of readable pending actions. No pre-change screenshot baseline exists, as explicitly disclosed and accepted in evidence/phase-3/README.md. Regression confidence therefore comes from unchanged global styles, current rendered views and functional smoke, not a before/after pixel comparison. Captures are whole-window PNGs with responsive-toolbar viewport dimensions. Historical no-JavaScript profile submission limitations remain deferred by the plan.

Profile API inactivity in the development showcase was observed during implementation in Chrome's Network panel and recorded in evidence/README.md; this review additionally checked the absence of transport in showcase source. No new live browser interaction was performed during review.

## F1 triage completion — 2026-11-13

The user explicitly requested fixing F1. Added only has-[>svg]:px-10 to the profile submit Button; shared Button styles and API are unchanged. This variant supersedes the existing has-[>svg]:px-3 and reserves symmetric space while the spinner stays at left-3. No transport or auth code changed.

Verification: npm run lint PASS (zero guard matches); npx astro check PASS (50 files, zero diagnostics); npm run build PASS (existing sitemap site warning only). Native Chrome confirmed separate spinner/text and stable idle/pending geometry in Polish and English at 1440 × 1000 and 390 × 844. Eight new captures are in evidence/f1/: desktop-pl-idle.png, desktop-pl-pending.png, desktop-en-idle.png, desktop-en-pending.png, mobile-pl-idle.png, mobile-pl-pending.png, mobile-en-idle.png, mobile-en-pending.png. These are window captures whose responsive toolbar records CSS viewport dimensions. Earlier phase-4 images are retained as historical evidence of F1.

Triage: Fixed F1 (1); open findings 0. The original review scope, reviewed HEAD and historical finding description are preserved; the current verdict table reflects the verified follow-up.
