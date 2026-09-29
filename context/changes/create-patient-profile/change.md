---
change_id: create-patient-profile
title: Create a private patient profile
status: implementing
created: 2026-09-29
updated: 2026-09-29
archived_at: null
---

## Notes

Create a private single-patient profile for the authenticated caregiver, using the established patients ownership boundary.

Phase 1: the user confirmed PL/EN manual verification and reported `All smoke steps passed` for the Cloud-backed smoke test. The agent's local smoke attempt was blocked by the missing test-only secret; the successful rerun was confirmed by the user.

Phase 2: migration `20260929194000_patient_profile.sql` applied to the approved Supabase Cloud project. Post-migration metadata confirms RLS, all four owner policies, owner uniqueness and existing foreign key are preserved. `supabase/tests/patient_profile_contract.sql` passed against a temporary Cloud table with rollback, covering the deployed constraint, legacy-root completion and timestamp trigger without touching patient data. Full user-client isolation and HTTP lifecycle automation remain phase 3 work.

Phase 2 requirements correction: first and last names are both required; surname was omitted from the original requirement by mistake, not added as a scope extension. A persistent home action remains available after saving. The user confirmed phase 2 manual verification in both languages after the UI fixes. The updated 13 unit tests, lint, Astro check and build pass; full Cloud HTTP lifecycle verification remains in phase 3.

At the user's request, the two already-applied profile SQL files were consolidated into `20260929194000_patient_profile.sql`. Cloud migration history was repaired to retain that version and remove `20260929194100` from the applied list, without executing schema or patient-data changes. Migration list matches the repository, push dry-run reports no pending migrations, and temporary-table contract tests pass. Original SQL copies are recoverable from `/private/tmp/patient-migration-merge.Ur3riC/` and the previous Git index until restaging.
