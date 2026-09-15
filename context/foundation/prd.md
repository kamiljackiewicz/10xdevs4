---
project: MedLabTimeline
version: 1
status: draft
created: 2026-09-15
context_type: greenfield
product_type: web-app
target_scale:
  users: small
  qps: low
  data_volume: small
timeline_budget:
  mvp_weeks: 4
  hard_deadline: 2026-11-04
  after_hours_only: false
---

## Vision & Problem Statement

The parent of a child with autism spectrum disorder or another condition requiring frequent blood and metabolic tests loses time when receiving new results and comparing them across periods. Preparing a history of changes for a medical consultation is difficult when documents are scattered and their interpretation is demanding.

The product combines an organized result history with a timeline of recorded recommendations and treatment to show observed parameter changes before and after treatment begins. It does not replace medical consultation or issue clinical recommendations.

## User & Persona

### Primary persona

The parent or caregiver of a child with autism spectrum disorder or another condition, maintaining one patient's history and preparing data for conversations with a doctor. The MVP focuses on one caregiver and one patient.

## Success Criteria

### Primary

- A caregiver imports one result PDF, verifies the extraction, saves selected parameters, and sees their changes against a manually recorded treatment or recommendation timeline.
# TODO: measurable primary success criterion — see Open Questions

### Secondary

- The application supports more parameters and laboratories.

### Guardrails

- Approved data must not be incorrectly approved without a way for the caregiver to detect and correct it.

## User Stories

### US-01: Import and compare a new result

- **Given** a caregiver is logged in, has access to a patient profile, and that profile contains earlier approved results and timeline events
- **When** they add a scan of a new result PDF, review and correct the extracted parameters, and approve them
- **Then** they see changes in selected parameters against earlier results and related recorded recommendations or treatment information

# TODO: acceptance criteria for US-01 — see Open Questions

## Functional Requirements

### Access and patient profile

- FR-001: Caregiver can create a patient profile. Priority: must-have
  > Socrates: Counter-argument considered: "profile sharing increases access complexity." Resolution: adding caregivers is deferred until after the MVP.

### Result import and verification

- FR-002: Caregiver can add a scanned PDF of a blood test result. Priority: must-have
  > Socrates: Counter-argument considered: "poor scans may produce unreadable extraction." Resolution: import remains, with mandatory manual review.
- FR-003: Caregiver can review and correct selected parameters extracted from a PDF before approving them. Priority: must-have
  > Socrates: Counter-argument considered: "manual correction lengthens the flow." Resolution: it remains because reliability is more important.

### History and comparison

- FR-004: Caregiver can save a dated note on a patient's timeline. Priority: must-have
  > Socrates: Counter-argument considered: "structured recommendation and treatment entries may be too heavy to start with." Resolution: the MVP starts with a simple dated note.
- FR-005: Caregiver can compare approved parameters with earlier results. Priority: must-have
  > Socrates: Counter-argument considered: "different units and laboratories can make comparison misleading." Resolution: comparison remains with a clear warning about non-comparable data.
- FR-006: Caregiver can view parameter changes together with related recorded timeline events. Priority: must-have
  > Socrates: Counter-argument considered: "the combination may look like a medical causal conclusion." Resolution: it remains solely as a chronological view, without conclusions.

### Data quality

- FR-007: Caregiver can detect and correct an approved result that was entered incorrectly. Priority: must-have
  > Socrates: Counter-argument considered: "change history increases scope." Resolution: correction remains, without change history in the MVP.

## Non-Functional Requirements

- Patient data and documents are accessible only to a logged-in caregiver with access to the profile.
- The caregiver sees continuous progress feedback when PDF extraction takes longer than two seconds.
- No value extracted from a document becomes an approved result before the caregiver can review and correct it.
- Results, notes, or documents deleted by the caregiver become unavailable in the patient profile.
- The application remains usable in current desktop browsers.

## Business Logic

The application compares approved results for the same parameter over time, warns when data from different laboratories or units is not comparable, and shows changes alongside chronologically recorded notes.

The rule uses caregiver-approved parameters from successive results and dated notes. Its output is either a comparison of changes or a warning that the data should not be compared. The caregiver sees the result after approving a new document's extraction.

## Access Control

A logged-in caregiver can access their own single-patient profile. The login method remains an open decision. Sharing a profile with other caregivers is out of scope for the MVP.

## Non-Goals

- The MVP does not support EEG because it focuses exclusively on blood-test results.
- The MVP does not medically interpret results or suggest treatment or doses because those decisions belong to a doctor.
- The MVP does not share a patient profile with other caregivers; sharing is deferred until after the first version.
- The MVP does not automatically extract medical recommendations from documents; dated notes are added to the timeline instead.
- The MVP does not guarantee support for every PDF format, laboratory, or parameter; broader support is a secondary goal.

## Open Questions

1. **Which specific login method and detailed permissions will be used?** — To be decided by the user before implementation. Block: no.
2. **Which parameters and blood-test result formats will be supported in the first flow?** — To be decided by the user before implementing import. Block: yes.
3. **What document volume and usage frequency are expected?** — To be decided before stack selection. Block: no.
4. **What measurable outcome proves the primary success criterion?** — To be decided by the user. Block: no.
5. **What acceptance criteria must US-01 satisfy?** — To be decided by the user. Block: no.
