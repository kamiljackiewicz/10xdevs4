# Implementation review follow-ups

## Final verification — 2026-09-29

Commit `ad029b3` passed GitHub CI [36626468261](https://github.com/kamiljackiewicz/10xdevs4/actions/runs/36626468261), including the changed two-user Cloud integration suite, foreign update/upsert denial and persisted-byte checks, ID-generation/immutability/reclaim regression, and existing HTTP smoke. Both jobs succeeded and cleanup reported no failure. This supersedes the pending-CI notes below. Both F1 and F2 are FIXED and integration-verified.

## F1 — Retired patient namespace

- User selected Fix now and approved the exact trigger and migration to the same Supabase Cloud project.
- Add forward migration `20260929203000_patient_id_guard.sql`; never rewrite applied migrations.
- Enforce fresh server-assigned IDs on INSERT and immutable IDs on UPDATE for all ordinary writes, including administrative writes.
- Add a rollback-only temporary-table Cloud probe and two-user regression in the existing integration suite. Remove synthetic Storage files before retiring roots; verify another user cannot select the retired ID without deliberately creating orphan files.
- Document administrative restore constraints. Existing records remain unchanged.
- Verification: baseline Cloud probe failed with missing guard function (42883); after applying the sole pending migration, the rollback-only probe passed all four assertions. Cloud metadata confirms patients_guard_id is attached to public.patients. Lint, build, 13 unit tests and git diff --check pass. Existing patient rows were not modified.
- The two-user integration regression is added but has not run: its test-only credentials are held in GitHub. CI execution remains pending a user-authorized commit/push. No claim of completed end-to-end Storage reproduction.
- Decision: FIXED, with full integration verification pending CI.

## F2 — Foreign Storage overwrite

- User approved the exact F2 patch separately from F1.
- Owner replacement writes different synthetic bytes and verifies them by download.
- Foreign update and upsert must fail; owner download afterward must retain the updated bytes.
- Existing scoped cleanup remains unchanged; no SQL or Cloud configuration change in F2.
- Decision: FIXED in code. Lint, build, 13 unit tests and node --check pass. Modified Cloud integration execution remains pending CI; no claim that the new assertions have run against Storage yet.
