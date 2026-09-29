# Patient data access contract

This contract applies to every patient-related feature in MedLabTimeline.
It establishes the MVP boundary before patient-profile UI, document import, results,
and notes are implemented.

## MVP access boundary

- Authentication uses the existing Supabase email/password flow.
- A caregiver owns at most one patient root in `public.patients`.
- Patient-profile sharing, roles, and delegated access are out of scope.
- Application code must continue to use the authenticated SSR client; it must not
  introduce a Supabase service-role key.

## Patient-owned data

- Every future patient-bound table must reference `public.patients.id`.
- The database assigns a fresh patient UUID on every insert, replacing any supplied
  ID, and rejects changes to that ID with `42501`. This also applies to administrative
  writes while triggers are enabled. A UUID default alone does not enforce this rule.
- Clients cannot deliberately reclaim a retired patient UUID and its Storage
  namespace. Administrative restoration with original IDs requires a separately
  reviewed procedure preserving original ownership and handling retained objects;
  never disable this guard in ordinary application or fixture code.
- Its row-level security policies must authorize the authenticated caregiver through
  the referenced patient row's `owner_id`, not through client-supplied ownership
  metadata.
- Future API routes must enforce authentication, but middleware protection alone is
  not a substitute for database RLS.

## Private documents

- Patient documents belong in the private `patient-documents` bucket.
- Object keys use `<patient-id>/<opaque-file-name>`; the first path segment is the
  `public.patients.id` used by Storage RLS policies.
- Upload, read, update, and deletion are allowed only for the owner of that patient.
- Do not create public URLs for patient documents. A later feature may use a
  short-lived signed URL only after it authorizes the caregiver.

## Review and approval

- S-03 must model imported values as unapproved on creation.
- Only an explicit caregiver review-and-approve transition may make a value usable
  by comparison features.
- No extraction, parser, API route, or background process may create an approved
  result directly.

## Deletion

- MVP deletion is permanent; there is no soft-delete or recovery workflow.
- A future deletion implementation must remove the Storage object through the
  Storage API as well as delete its application metadata or patient row. A database
  foreign-key cascade does not remove the underlying file.

## Scope handoff

- S-01 adds patient-profile fields and creation UI on top of `public.patients`.
- S-02 adds dated notes with patient ownership inherited from this contract.
- S-03 adds document metadata, upload, extraction review, and approval-state
  enforcement.
