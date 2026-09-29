# S-03: Import, review, and approve laboratory results — Implementation plan

## Overview

Implement `review-imported-blood-result` as the first laboratory import and approval flow. Retain the existing change identifier, but use “laboratory results” in user-facing language because the agreed scope includes urine results.

This plan prepares data for S-04 comparison and S-05 correction. Those features remain separate.

## Current State Analysis

- The cookie-authenticated Supabase client preserves the existing owner access boundary.
- Mutation endpoints already check session, Origin, content type, and input; private responses use `private, no-store`.
- Home provides feature entry points; protected `/dashboard` routes are currently used for Profile and Timeline.
- Shared React form patterns provide pending states, accessible field errors, and PL/EN messages.
- Cloud integration tests use synthetic identities, with administrative credentials restricted to fixture setup and cleanup.
- There is no PDF library, OCR integration, result schema, or approval transition.
- Existing documentation assumes stored PDFs and blood-only imports. This plan supersedes those assumptions for S-03.

### OCR feasibility evidence (2026-09-30)

A local headless Chrome 154 experiment used PDF.js 6.3.289 and Tesseract.js 7.0.0 on macOS arm64, with locally served assets and external document requests blocked. These are evaluated versions, not dependencies already integrated into the application.

- ALAB, Synevo, and RED exposed readable native text. Diagnostyka exposed text with corrupted tested labels even through PDF.js; Biovis exposed no text on either page. Text length alone is therefore not a valid fallback decision.
- Using manually identified Biovis table and row regions at 300 dpi, all 30 result values matched; 86 of 90 checked value/unit/reference cells matched. Three reference limits lost decimal commas and one unit lost its micro symbol. Incorrect readings could have confidence scores around 90.
- Targeted 450-dpi cell retries recovered the three reference-limit commas, but still read the micro symbol as `u`. Higher resolution is useful, not a correctness guarantee.
- Full-page OCR took approximately 2–6 seconds per page on this machine. This is a small sample benchmark, not a performance promise. Automatic template recognition, complete five-template adapters, peak memory, slower/mobile devices, cancellation, and the ten-page limit were not validated by the experiment.

The finding supports assisted browser-only import with mandatory review. It does not establish production readiness or authorize automatic approval. No patient identifiers, filenames, result values, or source images from the experiment belong in repository fixtures.

## Desired End State

A logged-in caregiver selects a PDF from Home’s laboratory-results entry. The browser identifies the supported layout, extracts its rows, and displays an editable review beside the local document.

Structured drafts survive navigation and reload. After reload, selecting the same PDF restores the preview without overwriting saved edits. Approval explicitly confirms the reviewed selection and saves it atomically. Approved reports are readable and remain separate from drafts.

## What We’re NOT Doing

- External AI/OCR calls, server-side PDF processing, PDF uploads, or stored page images.
- Universal laboratory/template support, handwriting recognition, or batch imports.
- Medical interpretation, treatment suggestions, automatic unit conversion, or inferred missing results.
- Comparison charts, correction of approved values, revision history, or patient sharing.
- Production deployment or changes to archived documents.

## Implementation Approach

The browser owns the selected file, rendering, text extraction, OCR, and template parsing. The server accepts a strictly validated structured report; it does not accept PDF payloads.

PDF.js supplies page text and rendering. Tesseract.js supplies OCR in a browser worker; its documentation explicitly requires rendering PDFs into images first. Serve the OCR worker, WebAssembly, and language assets from the application’s own origin, avoiding default CDN dependencies. [PDF.js documentation](https://mozilla.github.io/pdf.js/getting_started/), [Tesseract.js PDF guidance](https://github.com/naptha/tesseract.js/blob/master/docs/faq.md), [local asset configuration](https://github.com/naptha/tesseract.js/blob/master/docs/local-installation.md)

Supabase stores private structured reports and parameter rows. Dedicated database operations enforce draft mutations and explicit approval; application endpoints use the existing authenticated client.

Phase 1 is the extraction feasibility gate: prove the actual browser pipeline and all five adapters before beginning database or application review-interface integration. The temporary research benchmark does not satisfy this gate. Keep the four-phase structure; introduce browser test infrastructure in Phase 1 and extend it for authenticated integration in later phases.

## Phase 1: Browser extraction and template coverage

### Changes Required

**Browser extraction module**

**Intent:** extract results while keeping the document on the caregiver’s device.

**Contract:**

- Introduce client-only PDF.js and Tesseract.js dependencies and reproducibly packaged, version-pinned assets.
- Accept one PDF up to **20,000,000 bytes** and **10 pages**. Validate before processing; never silently truncate.
- Support the supplied encrypted PDFs that open without a password. Reject password-required, corrupt, and unsupported files with an actionable message.
- Process pages sequentially, reusing one OCR worker and releasing page canvases after use.
- Prefer usable positioned PDF text; use OCR when text is missing, corrupted, or insufficient to recover the recognised table.
- Assess text usability against readable template anchors and table structure, not character count alone. Handle the supplied Diagnostyka and Biovis fallback cases explicitly without forcing OCR for every document from those providers.
- Use template-specific table regions and positioned OCR tokens to associate rows and columns. Support bounded, targeted higher-resolution retries for uncertain cells; begin evaluation at 300 dpi with 450-dpi retries based on the research. Do not escalate every page to higher resolution or silently alter a decimal/comparator/unit to make a result plausible.
- Supply Polish, English, and German OCR resources for the supported layouts.
- Provide stage/page progress and cancellation. Release workers, object URLs, and document buffers on completion, cancellation, or navigation.
- Keep PDFs, rendered pages, and complete OCR output out of persistent browser storage, application requests, and logs. Caching static OCR language assets is allowed.

**Template adapters and structured extraction**

**Intent:** preserve laboratory information accurately across five different layouts.

**Contract:**

- Add separate, versioned adapters for the supplied Diagnostyka, ALAB, Synevo, RED, and Biovis layouts.
- Recognise templates using provider and table structure together. Ambiguous or unsupported layouts produce an explicit error rather than guessed mappings.
- Extract current-result rows from every page, preserving source order, section, page reference, printed name/code, value text, unit, and reference text.
- Retain extraction provenance (native text, OCR, or manual entry) for reviewable fields and enough page/region information to find their source in the local preview. Every OCR-derived field starts unverified, regardless of confidence; confidence may prioritize attention but cannot verify a field or authorize approval.
- Represent numeric values using a decimal representation plus an optional comparator; retain textual values and original cell text.
- Preserve reference intervals, one-sided limits, and qualitative references. Keep Biovis “optimal range” annotations distinct from standard reference ranges.
- Keep previous-result columns distinct from current results. Never turn charts, section headings, or reference annotations into additional measurements.
- Preserve explicit printed abnormal markers when recoverable. Do not invent a flag from colour or a reference calculation.
- Emit review warnings for ambiguous cells, incomplete rows, unparsed table content, and date uncertainty.
- Include report and collection dates with their meanings. Never infer an event date from the filename.
- Map verified aliases to stable parameter identifiers while preserving printed labels. Unknown or ambiguous names remain unmapped; mapping must distinguish relevant specimen types and percentage versus absolute results.

**Verification corpus**

**Intent:** establish evidence for every supported template before integrating persistence.

**Contract:**

- Create synthetic fixtures representing the five layouts, including an image-only multipage case, with manually checked expected structured output.
- Keep original patient documents and identifying screenshots out of Git and CI artifacts.
- Use the original examples locally to verify layout fidelity and row coverage; do not upload their contents to Cloud test accounts.
- Browser extraction tests must execute the actual PDF/OCR path, not substitute pre-extracted text.
- Introduce Playwright and the `test:browser` command in this phase, with an isolated local extraction harness. No patient-data persistence or application import/review UI is required for this harness; later phases extend it against the built Workers preview.
- Include corrupt-but-nonempty native text, high-confidence OCR mistakes, lost decimal commas, micro-symbol ambiguity, and retry disagreement in the regression corpus. Use independently checked expected output; do not build expectations from the extractor's own output.
- Verify automatic row discovery and association, not just recognition within manually supplied row coordinates. Report row coverage and field correctness separately for each template. The blanket unverified state is not a substitute for specific ambiguity detection or corpus correctness.
- Exercise a synthetic ten-page OCR document, oversize page dimensions, cold/warm assets, cancellation during OCR/retries, and re-import after cancellation. Bound render allocations and retry work, prevent late results from a cancelled run, and release resources on all exit paths.
- Failure on a supplied template blocks completion of this phase; it does not justify dropping the template or silently switching to external processing.

### Success Criteria

#### Automated Verification

- Five-template browser fixtures account for every expected result row and verify values, units, reference annotations, and uncertainty warnings.
- Browser tests confirm local processing, file limits, cancellation, and absence of PDF/image/full-OCR payloads in network requests.
- Unit tests, lint, Astro check, and build pass.
- Browser stress tests verify bounded rendering, ten-page processing, cancellation without late results, and a successful subsequent import.

#### Manual Verification

- Local inspection of all five original examples confirms row coverage and reviews any extraction discrepancies.
- A recorded desktop and slower-device browser check reports cold/warm loading, extraction duration, memory observations and measurement limits, progress responsiveness, and cancellation; unsupported or untested device coverage is stated explicitly.

## Phase 2: Private structured drafts and atomic approval

### Changes Required

**Report and parameter data**

**Intent:** retain resumable drafts and approved results within the patient’s existing ownership boundary.

**Contract:**

- Add report and parameter tables. Every patient-bound row references the patient; parameter rows also belong to a report, with consistent patient/report ownership enforced.
- Report metadata includes original filename, file SHA-256, provider/template version, extracted patient identity needed for review, date fields and date basis, draft/approved status, timestamps, and a revision counter.
- Parameter records retain the extraction fields defined in Phase 1, their optional verified identity, review warnings, and selection for approval.
- Preserve field extraction provenance and source-region references in structured drafts. OCR confidence never substitutes for the explicit caregiver review confirmation required at approval.
- Store no PDF, page image, full-document OCR text, or Storage object reference.
- Use database-assigned immutable record identity and creation metadata.
- Enforce owner-only reads with RLS and cascade deletion when the owning patient is removed.
- Enforce uniqueness of file SHA-256 per patient. Identical imports return the existing report without replacing its contents or original filename.
- Drafts remain until approved or explicitly discarded. Approved reports are read-only in this slice.

**Draft and approval operations**

**Intent:** make review resumable while preventing accidental or partial approval.

**Contract:**

- Use narrowly granted transactional database functions for create, draft replacement, draft deletion, and approval. Revoke ordinary client table writes that could bypass these transitions.
- Functions independently verify authenticated patient ownership and use a fixed safe search path.
- Draft saves require the expected revision; stale writes return a conflict rather than overwriting another review.
- Approval atomically validates the final reviewed selection, saves it, and changes state. Require at least one selected valid result and an explicit review confirmation.
- Unresolved required fields must be corrected or the affected rows excluded. Missing units/ranges remain explicitly absent when the source does not provide them.
- After approval, retain only selected result rows as the report’s approved results.
- Missing or discrepant patient identity requires explicit caregiver confirmation. Re-evaluate against the current profile during approval; confirmation is invalidated when relevant identity data changes.
- Preserve valid calendar dates without timezone conversion. Use collection date, otherwise labelled report date, otherwise a manually supplied date.
- Approval replay of the same successful operation returns the existing outcome; stale or changed requests cannot modify an approved report.

**Public API**

**Intent:** expose a small structured-data interface following existing request controls.

**Contract:**

| Endpoint | Contract |
|---|---|
| `GET /api/lab-reports` | Owner’s paginated report summaries |
| `GET /api/lab-reports/[id]` | Owner’s report, rows, and revision |
| `POST /api/lab-reports` | Create a structured draft; return existing report for duplicate content |
| `PATCH /api/lab-reports/[id]` | Replace a draft’s structured contents using expected revision |
| `POST /api/lab-reports/[id]/approve` | Atomically approve the final reviewed selection |
| `DELETE /api/lab-reports/[id]` | Permanently discard a draft |

- Derive patient identity from the authenticated session, never a client-supplied owner.
- Require session, exact same Origin for mutations, and JSON for structured writes.
- Use 401/403/415/400 for existing request-control failures, indistinguishable 404 for missing/inaccessible records, and 409 for revision or state conflicts.
- Return `201` for creation, `200` for duplicate reopening/read/save/approval, and `204` for draft deletion.
- Return safe structured errors and `private, no-store`. Do not log filenames, result values, patient identity, or raw database errors.

### Success Criteria

#### Automated Verification

- Supabase Cloud tests verify owner isolation, immutable identity, duplicate handling, cascades, and denial of direct approval bypass.
- HTTP tests verify request controls, draft persistence, revision conflicts, atomic approval, and idempotent replay.
- Unit tests, lint, Astro check, and build pass.

## Phase 3: Import and review interface

### Changes Required

**Home entry and result pages**

**Intent:** make results a first-class feature alongside Profile and Timeline.

**Contract:**

- Add a laboratory-results action on Home.
- Use protected results, import, and report-detail pages under `/dashboard/results`; provide a clear return to Home.
- Distinguish loading errors, missing profile, empty history, drafts, and approved reports.
- List reports in pages of 50, using history date descending, then creation time and ID; undated drafts remain visible.
- Show original filename as text, not as a download link or a claim that the PDF is stored.

**Local preview and review**

**Intent:** enable a complete caregiver check without retaining the document.

**Contract:**

- Preview the selected local PDF beside editable results, with source-page navigation.
- Compute the file hash and check existing reports before expensive OCR. A renamed identical file reopens the existing draft or approved report.
- After reload, offer re-selection of the matching PDF to restore preview; verify the hash and preserve saved edits.
- Allow editing metadata and result fields, adding missed rows, excluding rows, and correcting or clearing suggested parameter mappings.
- Display the history-date basis, extraction warnings, standard ranges, and additional annotations distinctly.
- Mark OCR-derived fields as unverified regardless of confidence, and let the caregiver locate each field in the source preview. Explain that values, units, reference limits, dates, and completeness all require checking; do not display confidence as a probability of correctness or as a verified badge.
- Require explicit review confirmation and any patient-mismatch confirmation before approval.
- The existing review confirmation covers all included results, including high-confidence OCR fields; no automatic confidence threshold can bypass it. Changing reviewed content invalidates that confirmation.
- Persist the first extracted draft and subsequent valid structured edits through serialized, debounced saves. Show saving/saved/failed state; invalid edits remain visible locally.
- Approval submits the complete current selection atomically, so it does not depend on a pending autosave.
- On failed or ambiguous writes, preserve local edits and offer status reconciliation; do not automatically repeat mutations.
- On conflict, preserve local edits and offer reloading the newer server version without silently overwriting it.
- Warn before leaving with unsaved edits, including a language change. Saved drafts can resume in either language.
- Confirm permanent draft discard. Approved reports expose read-only details; correction belongs to S-05.
- Provide PL/EN labels, keyboard operation, accessible field errors and progress, and contrasting native date-picker icons.

### Success Criteria

#### Automated Verification

- Browser tests verify Home navigation, local preview, draft recovery, duplicate reopening, correction, exclusion, approval, and persisted results in PL/EN.
- Unit tests, lint, Astro check, and build pass.

#### Manual Verification

- Chrome review confirms keyboard usability, preview readability, date-picker contrast, progress/cancellation, and preservation of edits after failures.

## Phase 4: End-to-end verification and documentation

### Changes Required

**Verification and CI**

**Intent:** exercise the browser extraction path and the Cloud security boundary together.

**Contract:**

- Extend the Playwright browser tests and `test:browser` command introduced in Phase 1; retain existing Node unit tests, HTTP smoke, and Supabase Cloud isolation checks.
- Run browser tests against the built Workers preview using synthetic PDFs and synthetic authenticated users.
- Verify that browser network requests contain structured report data only and that import creates no Supabase Storage objects.
- Cover two-user isolation, duplicate races, stale saves, failed approval without partial writes, discarded drafts, session expiry, and cleanup after failure.
- Exercise malformed dates, comma decimals, comparators, qualitative results, mixed units, repeated headers, multipage continuation, and separate optimal-range annotations.
- Keep real-sample local verification separate from synthetic Cloud tests. Report unexecuted checks as unexecuted.

**Documentation**

**Intent:** make the accepted scope and processing boundary discoverable.

**Contract:**

- Update active product, roadmap, setup, and access-contract documentation to describe the five supported templates, urine inclusion, local processing, saved structured drafts, and filename provenance.
- Resolve the S-03 format/parameter blocker with these decisions.
- Explain that the existing private Storage bucket is not used by S-03; do not delete it or rewrite archived migrations.
- Document local asset preparation, browser verification, supported limits, and the difference between sample-template support and universal laboratory support.

### Success Criteria

#### Automated Verification

- Full synthetic browser, HTTP smoke, and Supabase Cloud suites pass and verify fixture cleanup.
- Final lint, unit tests, Astro check, and production build pass.

#### Manual Verification

- Final acceptance confirms all five original templates locally, both interface languages, and the documented no-PDF-upload behavior.

## Testing Strategy

Use three complementary layers:

- **Pure tests:** template row association, aliases, decimal/comparator handling, dates, references, and validation.
- **Browser tests:** actual PDF rendering/OCR, local-file lifecycle, progress, preview, review edits, reload, and network-payload inspection.
- **Cloud tests:** authenticated ownership, transactional draft/approval behavior, duplicate races, revision conflicts, and cleanup.

On the five supported sample layouts, every reported current-result row must be represented. A field must either match the checked source or be visibly unresolved; unflagged wrong associations and silent row loss fail acceptance. Manual correction remains available for imperfect later documents.

Measure coverage against independent expected row inventories, not the number of rows the extractor happened to return. A generic “OCR requires review” notice does not turn a known incorrect corpus field into a passing result: the field must match or carry a specific unresolved warning. Include high-confidence mistakes in tests so confidence-based auto-verification cannot be introduced accidentally. Do not claim all errors in future documents can be detected; mandatory caregiver review remains necessary for every included result.

## Performance Considerations

Load PDF/OCR code only on the import screen. Process one page at a time, cap rendered image dimensions, release intermediate images, and reuse the OCR worker. Show progress within two seconds and maintain a responsive cancellation control.

Measure cold asset loading and extraction duration separately on the five examples. Do not claim a universal extraction time before measuring it.

The research timing excludes real-world cold asset downloads and is not a mobile benchmark. A 2480 × 3509 RGBA canvas alone occupies about 35 MB before PDF decoding, OCR, and temporary copies; rendering a whole page at 450 dpi more than doubles that canvas allocation. Enforce pixel limits before allocation, prefer small-region retries, and release the worker after each import lifecycle. Record actual device/browser and distinguish measured peak memory from estimates or partial browser metrics. CPU throttling can supplement, but does not replace, a real slower-device check.

## Migration Notes

Use additive tables, constraints, RLS policies, and transactional functions; no backfill is required. Confirm the approved Supabase Cloud project before applying migrations during implementation.

Rolling back application code leaves the new structured data intact. No destructive down migration, production publication, or existing Storage cleanup is part of this plan.

## References

- PRD FR-002/FR-003 and roadmap S-03.
- `docs/reference/patient-data-access-contract.md` — ownership and explicit approval.
- `src/pages/api/timeline-notes/index.ts:16` — mutation request controls.
- `src/components/Welcome.astro:19` — Home feature navigation.
- [PDF.js](https://mozilla.github.io/pdf.js/getting_started/)
- [Tesseract.js browser API](https://github.com/naptha/tesseract.js/blob/master/docs/api.md)
- [Tesseract.js local assets](https://github.com/naptha/tesseract.js/blob/master/docs/local-installation.md)
- [Tesseract quality and table-segmentation guidance](https://tesseract-ocr.github.io/tessdoc/ImproveQuality.html)
- [Tesseract.js worker and asset performance](https://github.com/naptha/tesseract.js/blob/master/docs/performance.md)
- Local OCR feasibility experiment summarized in Current State Analysis; real patient artifacts remain outside the repository.

## Progress

### Phase 1: Browser extraction and template coverage

#### Automated

- [ ] 1.1 Five-template browser fixtures account for every expected result row and verify values, units, reference annotations, and uncertainty warnings.
- [ ] 1.2 Browser tests confirm local processing, file limits, cancellation, and absence of PDF/image/full-OCR payloads in network requests.
- [ ] 1.3 Unit tests, lint, Astro check, and build pass.
- [ ] 1.5 Browser stress tests verify bounded rendering, ten-page processing, cancellation without late results, and a successful subsequent import.

#### Manual

- [ ] 1.4 Local inspection of all five original examples confirms row coverage and reviews any extraction discrepancies.
- [ ] 1.6 A recorded desktop and slower-device browser check reports cold/warm loading, extraction duration, memory observations and measurement limits, progress responsiveness, and cancellation; unsupported or untested device coverage is stated explicitly.

### Phase 2: Private structured drafts and atomic approval

#### Automated

- [ ] 2.1 Supabase Cloud tests verify owner isolation, immutable identity, duplicate handling, cascades, and denial of direct approval bypass.
- [ ] 2.2 HTTP tests verify request controls, draft persistence, revision conflicts, atomic approval, and idempotent replay.
- [ ] 2.3 Unit tests, lint, Astro check, and build pass.

### Phase 3: Import and review interface

#### Automated

- [ ] 3.1 Browser tests verify Home navigation, local preview, draft recovery, duplicate reopening, correction, exclusion, approval, and persisted results in PL/EN.
- [ ] 3.2 Unit tests, lint, Astro check, and build pass.

#### Manual

- [ ] 3.3 Chrome review confirms keyboard usability, preview readability, date-picker contrast, progress/cancellation, and preservation of edits after failures.

### Phase 4: End-to-end verification and documentation

#### Automated

- [ ] 4.1 Full synthetic browser, HTTP smoke, and Supabase Cloud suites pass and verify fixture cleanup.
- [ ] 4.2 Final lint, unit tests, Astro check, and production build pass.

#### Manual

- [ ] 4.3 Final acceptance confirms all five original templates locally, both interface languages, and the documented no-PDF-upload behavior.
