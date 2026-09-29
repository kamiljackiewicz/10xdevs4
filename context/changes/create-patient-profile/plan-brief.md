# Private patient profile and Polish/English UI — Plan Brief

> Full plan: [plan.md](plan.md)

## What & Why

Deliver S-01: the caregiver can create and correct their own patient profile.
The user also selected Polish and English throughout the current application,
so the first profile flow is usable in either language.

## Starting Point

F-01 already supplies the patient ownership root, unique owner and RLS.
The dashboard is a protected placeholder and Cloud integration CI is working.
There are no profile fields or shared translation mechanism yet.

## Desired End State

The dashboard shows a creation form or the saved profile with an edit action.
The profile survives reload and is visible only to its owner. The application
has a persistent PL/EN switch with Polish as the default.

## Key Decisions Made

| Decision | Choice | Why | Source |
| --- | --- | --- | --- |
| Data | Required first name, birth date, sex | Agreed profile scope | Plan |
| Sex | Required `female` / `male` | Explicit two-choice selection | Plan |
| Editing | Available immediately | Caregiver can correct mistakes | Plan |
| Placement | Dashboard | Uses the existing protected entry point | Plan |
| Languages | Entire current application in PL/EN | Explicit expansion beyond the profile | Plan |
| Locale | Cookie, switch, Polish default | Persistent SSR-compatible preference | Plan |
| Ownership | One patient per caregiver, no sharing | Existing F-01 boundary | Contract |
| Backend | Same Supabase Cloud project | User's Cloud-only requirement | Plan |

## Scope

**In scope:** translations, profile schema, create/view/edit, validation,
Cloud isolation and application smoke coverage.

**Out of scope:** sharing, deletion, diagnoses, PDFs, notes, comparisons,
local Supabase, localized URLs and translated Supabase email templates.

## Architecture / Approach

Typed dictionaries serve Astro pages and React forms; a validated cookie selects
the language. The existing authenticated SSR client writes profile data under
RLS. A new additive migration preserves existing patient IDs and ownership.
Incomplete old roots receive a profile-completion state without fabricated data.
New writes require all three fields through an initially unvalidated database
constraint, preserving untouched old roots. POST creates and PATCH edits the
session owner's profile; invalid input stays in the form for correction.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. PL/EN | Dictionaries, language switch, translated current screens | Server and hydrated text must agree |
| 2. Profile | Cloud columns and dashboard create/view/edit | Required fields and existing roots |
| 3. Verification | Cloud isolation and expanded HTTP smoke | Cleanup on failed tests |

**Prerequisites:** completed F-01, Cloud migration access and existing CI secrets.
**Estimated effort:** three implementation phases with manual UI checkpoints.

## Open Risks & Assumptions

- Existing roots must retain their identity and receive explicit completion handling.
- Profile data must not leak into URLs, logs or raw error messages.
- Cloud tests use synthetic data and test-only administrative credentials.
- Denied writes use valid profile data and assert RLS-specific errors, avoiding
  false positives caused by required-field validation.
- Deployment remains a separate operation; this plan does not authorize production deployment.

## Success Criteria (Summary)

- The caregiver creates and edits a persisted private profile.
- All current screens support persistent PL/EN selection.
- CI proves owner isolation, single-profile limits and successful application flow.

## References

- `context/foundation/prd.md` — FR-001.
- `context/foundation/roadmap.md` — S-01.
- `docs/reference/patient-data-access-contract.md` — ownership contract.
