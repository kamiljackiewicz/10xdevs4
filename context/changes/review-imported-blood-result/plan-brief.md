# S-03: Import, review, and approve laboratory results — Plan Brief

> Full plan: [plan.md](plan.md)

## What & Why

Let a caregiver select a supported laboratory PDF, extract every reported parameter, review and correct the results, and approve selected entries for the patient’s history.

Support the five supplied templates: **Diagnostyka, ALAB, Synevo, RED Laboratories, and Biovis**. The scope covers those layouts, including multipage and image-only documents; it does not promise every report produced by those laboratories.

## Starting Point

The application already has authentication, a single owner-controlled patient profile, dated notes, PL/EN interfaces, and Supabase Cloud verification. Extraction, result storage, and approval do not yet exist.

A local Chrome experiment supports feasibility, not production readiness: targeted Biovis OCR matched 30/30 result values and 86/90 checked value/unit/reference cells. Some reference commas and a unit symbol were misread despite high confidence. Full five-template adapters and slower-device behavior remain unverified.

## Desired End State

The caregiver will enter the import flow from Home, compare extracted rows against a local PDF preview, resume saved drafts, and see an approved report after saving.

## Key Decisions Made

| Area | Decision |
|---|---|
| Coverage | Extract every reported parameter in all five supplied templates, including numeric and textual results. |
| Processing | No external AI/OCR processor. PDF reading and OCR run in the browser. |
| OCR review | Every OCR field remains unverified until caregiver review; confidence never authorizes approval. |
| Retention | Keep structured drafts/results and original filename; never upload or persist the PDF. |
| Drafts | Save unapproved structured drafts privately until approved or discarded. |
| History date | Collection date first; report date as labelled fallback; manual entry when both are absent. |
| Duplicates | Identical file contents reopen the existing report for the same patient, even after renaming. |
| Incomplete extraction | Allow correction, addition of missing rows, and exclusion of unresolved rows. |
| Parameter identity | Preserve printed names and units; suggest only verified aliases; no automatic unit conversion. |
| Limits | One PDF at a time, maximum 10 pages and 20 MB (20,000,000 bytes). |
| Patient mismatch | Show discrepancies and require explicit confirmation before approval. |
| Navigation | Import and results are accessible from Home; Profile remains for personal details. |

## Scope

**In scope:** five supplied layouts, every reported parameter, browser extraction, local preview, private structured drafts, correction before approval, duplicate reopening, and PL/EN review.

**Out of scope:** external processing, PDF retention, universal template support, batch imports, medical interpretation, unit conversion, comparisons, correction after approval, and production deployment.

## Architecture / Approach

Use PDF.js for usable positioned text and Tesseract.js for template-region OCR with bounded targeted retries. Diagnostyka and Biovis need fallback in the supplied samples; ALAB, Synevo, and RED expose readable text. Send only structured data to authenticated application endpoints and Supabase Cloud.

## Phases at a Glance

| Phase | Deliverable | Main risk |
|---|---|---|
| 1 | Extraction prototype, browser tests, five-template and resource-limit verification | Missing rows or confidently wrong fields |
| 2 | Private drafts and atomic approval | Bypassing approval or losing concurrent edits |
| 3 | Complete PL/EN import/review interface | Lost review work or misleading preview |
| 4 | Browser, HTTP, Cloud, and documentation verification | Tests missing actual browser behavior |

**Prerequisites:** existing S-01/F-01 functionality, approved Supabase Cloud test access, and local access to the supplied examples.

**Estimated effort:** four implementation phases; complete Phase 1's extraction gate before database/UI integration or estimating the remaining work. The research benchmark does not complete this phase.

## Open Risks & Assumptions

- Higher-resolution retries recovered sampled decimal commas but not the micro symbol; confidence is not proof of correctness.
- Support is bounded to the supplied layouts. Require independently checked row coverage, source-linked review, ten-page/cancellation tests, and a recorded slower-device check; mobile performance is not yet established.

## Success Criteria (Summary)

- All five templates produce reviewable parameters; approved data survives reload.
- Another user cannot access the patient’s drafts or results.
- PDF contents never leave the device.

## References

- PRD FR-002/FR-003, roadmap S-03, and `docs/reference/patient-data-access-contract.md`.
- [Full implementation plan](plan.md), including verification criteria and progress.
