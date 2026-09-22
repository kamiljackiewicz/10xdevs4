---
project: MedLabTimeline
version: 1
status: active
created: 2026-09-21
updated: 2026-09-21
prd_version: 1
main_goal: market-feedback
top_blocker: decisions
milestone_id: first-reviewed-comparison
milestone_seq: 1
milestone_status: open
---

# Roadmap: MedLabTimeline

> Derived from `context/foundation/prd.md` (v1) + auto-researched codebase baseline.
> Edit-in-place; archive when superseded.
> Slices below are listed in dependency order. The "At a glance" table is the index.

## Milestone

**M-01: First reviewed comparison** — Status: open

- **Intent:** Deliver the first safe, caregiver-owned flow from recording a patient's context through reviewing an imported blood-test result to seeing a chronological comparison with notes. It tests whether the product makes consultation preparation easier without offering medical conclusions.
- **Source materials:** `context/foundation/prd.md` (v1)
- **Done when:** every F-NN and S-NN below is `done`.
- **Scope anchors:** FR-001–FR-007; US-01.

## Vision recap

Caregivers lose time assembling scattered blood and metabolic test results and explaining changes during medical consultations. MedLabTimeline keeps an organized result history and dated treatment or recommendation notes so a caregiver can see observed changes over time, while leaving medical interpretation and treatment decisions to a doctor.

## North star

**S-04: View an approved-result comparison with timeline notes** — this is the smallest end-to-end slice whose successful delivery would show that a reviewed result becomes useful consultation context rather than another isolated document.

> Here, the north star means the first complete user flow that shows whether the product works for its core purpose; it is placed as early as its prerequisites allow.

## At a glance

| ID | Change ID | Outcome (user can …) | Prerequisites | PRD refs | Status |
| --- | --- | --- | --- | --- | --- |
| F-01 | patient-data-access-contract | (foundation) patient-owned data access and approval boundaries are enforceable | — | FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007 | ready |
| S-01 | create-patient-profile | create a patient profile they alone can access | F-01 | FR-001 | proposed |
| S-02 | record-dated-timeline-note | save a dated note on their patient's timeline | S-01 | FR-004 | proposed |
| S-03 | review-imported-blood-result | add a supported blood-test PDF, correct extracted parameters, and approve them | S-01, F-01 | US-01, FR-002, FR-003 | blocked |
| S-04 | view-reviewed-result-comparison | see approved parameter changes beside dated timeline notes after approving a result | S-02, S-03 | US-01, FR-005, FR-006 | proposed |
| S-05 | correct-approved-result | detect and correct an incorrectly approved result | S-03 | FR-007 | proposed |

## Streams

Navigation aid — groups items that share a prerequisites chain. Canonical ordering still lives in the dependency graph below; this table is the proposed reading order across parallel tracks.

| Stream | Theme | Chain | Note |
| --- | --- | --- | --- |
| A | Patient history | `F-01` → `S-01` → `S-02` | Establishes the caregiver-owned context used by the first comparison. |
| B | Reviewed import | `S-03` → `S-05` | Can begin after `S-01`; surfaces import reliability before the comparison joins it. |
| C | Consultation comparison | `S-04` | Joins Streams A and B; this is the early user-feedback milestone. |

## Baseline

What's already in place in the codebase as of `2026-09-21` (auto-researched + user-confirmed). Foundations below assume these are present and do NOT re-scaffold them.

- **Frontend:** present — Astro, React, Tailwind, and existing pages/components (`package.json`, `src/pages/index.astro`).
- **Backend / API:** partial — authentication endpoints exist; product-domain handlers do not (`src/pages/api/auth/signin.ts`).
- **Data:** partial — Supabase server integration exists, without product schema, migrations, or queries (`src/lib/supabase.ts`, `supabase/config.toml`).
- **Auth:** present — Supabase cookie sessions and route protection are implemented (`src/lib/supabase.ts`, `src/middleware.ts`).
- **Deploy / infra:** present — Cloudflare Workers configuration, CI, and a deployed Worker exist (`wrangler.jsonc`, `.github/workflows/ci.yml`).
- **Observability:** partial — platform logs and `wrangler tail` are available; application-level instrumentation is absent (`wrangler.jsonc`, `context/deployment/deploy-plan.md`).

## Foundations

### F-01: Patient data access contract

- **Outcome:** (foundation) patient-owned records, documents, approval state, and access boundaries can be enforced before a caregiver-facing workflow stores data.
- **Change ID:** patient-data-access-contract
- **PRD refs:** FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007; Non-Functional Requirements; Access Control
- **Unlocks:** S-01, S-02, S-03, S-04, S-05
- **Prerequisites:** —
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** Which specific login method and detailed permissions will be used? — Owner: user. Block: no.
- **Risk:** This establishes only the shared access and approval boundary required by every data-bearing flow; extending it into a complete data layer before a user workflow would delay feedback.
- **Status:** ready

## Slices

### S-01: Create a patient profile

- **Outcome:** user can create a patient profile they alone can access.
- **Change ID:** create-patient-profile
- **PRD refs:** FR-001
- **Prerequisites:** F-01
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** It is the smallest caregiver-owned starting point; it must remain single-patient MVP scope rather than introducing sharing.
- **Status:** proposed

### S-02: Record a dated timeline note

- **Outcome:** user can save a dated note on their patient's timeline.
- **Change ID:** record-dated-timeline-note
- **PRD refs:** FR-004
- **Prerequisites:** S-01
- **Parallel with:** S-03
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Delivering the simple note before structured recommendations keeps the chronological context available without expanding the MVP.
- **Status:** proposed

### S-03: Review an imported blood-test result

- **Outcome:** user can add a supported blood-test PDF, correct extracted parameters, and approve them only after review.
- **Change ID:** review-imported-blood-result
- **PRD refs:** US-01, FR-002, FR-003
- **Prerequisites:** S-01, F-01
- **Parallel with:** S-02
- **Blockers:** —
- **Unknowns:**
  - Which parameters and blood-test result formats will be supported in the first flow? — Owner: user. Block: yes.
  - What acceptance criteria must US-01 satisfy? — Owner: user. Block: no.
- **Risk:** The first supported import must be narrow enough to make extraction reviewable; treating every laboratory format as supported would make reliability unverifiable.
- **Status:** blocked

### S-04: View an approved-result comparison with timeline notes

- **Outcome:** user can see approved parameter changes beside dated timeline notes after approving a result, or see a warning when comparison is not valid.
- **Change ID:** view-reviewed-result-comparison
- **PRD refs:** US-01, FR-005, FR-006
- **Prerequisites:** S-02, S-03
- **Parallel with:** S-05
- **Blockers:** —
- **Unknowns:** —
- **Risk:** This follows approved data and notes so the comparison is chronological context, not an unsupported medical conclusion.
- **Status:** proposed

### S-05: Correct an approved result

- **Outcome:** user can detect and correct an incorrectly approved result.
- **Change ID:** correct-approved-result
- **PRD refs:** FR-007
- **Prerequisites:** S-03
- **Parallel with:** S-04
- **Blockers:** —
- **Unknowns:** —
- **Risk:** It follows approval because it verifies the guardrail without adding a full change-history feature that is outside the MVP.
- **Status:** proposed

## Backlog Handoff

| Roadmap ID | Change ID | Suggested issue title | Ready for `/10x-plan` | Notes |
| --- | --- | --- | --- | --- |
| F-01 | patient-data-access-contract | Establish patient data access and approval boundaries | yes | Unlocks every caregiver data flow. |
| S-01 | create-patient-profile | Let a caregiver create a private patient profile | no | Requires F-01. |
| S-02 | record-dated-timeline-note | Let a caregiver record a dated timeline note | no | Requires S-01. |
| S-03 | review-imported-blood-result | Let a caregiver review and approve a supported imported result | no | Blocked by supported parameters and PDF formats. |
| S-04 | view-reviewed-result-comparison | Show approved changes with dated timeline notes | no | Requires S-02 and S-03. |
| S-05 | correct-approved-result | Let a caregiver correct an approved result | no | Requires S-03. |

## Open Roadmap Questions

1. **Which specific login method and detailed permissions will be used?** — Owner: user. Block: F-01.
2. **Which parameters and blood-test result formats will be supported in the first flow?** — Owner: user. Block: S-03, S-04, S-05.
3. **What document volume and usage frequency are expected?** — Owner: user. Block: roadmap-wide.
4. **What measurable outcome proves the primary success criterion?** — Owner: user. Block: roadmap-wide.
5. **What acceptance criteria must US-01 satisfy?** — Owner: user. Block: S-03, S-04.

## Parked

- **EEG support** — Why parked: PRD §Non-Goals limits the MVP to blood-test results.
- **Medical interpretation, treatment recommendations, or dose suggestions** — Why parked: PRD §Non-Goals reserves clinical decisions for a doctor.
- **Patient-profile sharing with other caregivers** — Why parked: PRD §Non-Goals defers sharing until after the first version.
- **Automatic extraction of medical recommendations from documents** — Why parked: PRD §Non-Goals uses manually added dated notes instead.
- **Universal laboratory, PDF, and parameter support** — Why parked: PRD §Non-Goals limits the first flow to a supported subset.

## Milestone History


## Done
