# Implementation review follow-ups

## F1 — Spinner overlaps the pending save label

- Decision: fix now, explicitly requested by the user on 2026-11-13.
- Status: completed and visually verified.
- Change: local `has-[>svg]:px-10` on the submit Button in `src/components/patient/PatientProfileView.tsx`; shared Button unchanged.
- Verification: lint, Astro check and build passed; native Chrome confirmed PL/EN idle/pending at 1440 × 1000 and 390 × 844.
- Evidence: `../evidence/f1/`; full record in `../reviews/impl-review.md`.
