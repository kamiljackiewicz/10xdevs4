---
change_id: select-result-history-date
title: Wybór daty wyniku
status: impl_reviewed
created: 2026-11-13
updated: 2026-11-13
archived_at: null
---

## Notes

Wybór daty wynik

Selected as a small TDD scope: resolve the laboratory result history date and its source using collection date, report date, then manual date. Source contract: review-imported-blood-result, especially plan.md:156. Prepare an independent pure-domain change without PDF/OCR, database, API or UI integration; preserve the parent extraction gate.
