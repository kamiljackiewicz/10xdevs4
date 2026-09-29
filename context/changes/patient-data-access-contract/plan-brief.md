# Patient data access contract — Plan brief

> Full plan: `context/changes/patient-data-access-contract/plan.md`

## What & Why

This change creates the database and Storage access boundary needed before the MVP
can store patient-related data. It prevents a signed-in caregiver from accessing
another caregiver's patient root or document objects, instead of relying only on a
protected browser route.

## Starting Point

The Astro app already has Supabase email/password sessions and `/dashboard`
protection. The repository has no product migrations, RLS policies, Storage bucket,
or database-isolation tests.

## Desired End State

Each authenticated caregiver can own exactly one minimal patient root. RLS and the
private `patient-documents` bucket enforce that boundary; two-user tests prove it.
Later roadmap slices can use the documented ownership and approval rules without
F-01 implementing their UI or workflows.

## Key Decisions Made

| Decision | Choice | Why |
| --- | --- | --- |
| Login | Existing email/password only | It is implemented and keeps this foundation focused. |
| Ownership | Database-enforced one patient per caregiver | UI alone cannot protect against API or direct client access. |
| Storage | Private bucket and policies now | S-03 inherits a secure file boundary. |
| Foundation schema | Patient root only | Results, notes, and document metadata belong to their slices. |
| Approval | Contract now; enforcement in S-03 | No result table is introduced prematurely. |
| Deletion | Permanent | Matches the MVP PRD and avoids an out-of-scope history layer. |
| Verification | Two-user local tests in CI | RLS requires behavioral proof, not only migration review. |

## Scope

**In scope:** a `patients` ownership root, RLS, private Storage policies, a shared
access contract, local two-user tests, and CI integration.

**Out of scope:** profile UI, PDF upload/extraction, results, notes, comparisons,
sharing, social login, service-role access, and real patient data.

## Architecture / Approach

Supabase migrations define `patients` and Storage policy rules using `auth.uid()`.
Every later patient-bound table will reference the root and use its owner for RLS.
Document object keys start with a patient UUID, enabling Storage policies to resolve
ownership without a public bucket or an application service-role key.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Ownership and Storage boundary | RLS-protected patient root and private bucket | Incorrect policy predicates could expose data. |
| 2. Shared domain contract | Durable rules for later slices | Accidental expansion into S-01 or S-03. |
| 3. Isolation verification and CI | Two-user proof and repeatable checks | CI must exercise local Supabase correctly. |

**Prerequisites:** Docker and Supabase CLI available for local verification; no
production project or credentials are required.

**Estimated effort:** approximately three focused phases.

## Open Risks & Assumptions

- Production Supabase region, retention, and privacy controls remain a separate
  human decision before using real patient data.
- Storage deletion requires a future explicit product workflow; database cascade
  cannot remove a Storage object.

## Success Criteria (Summary)

- A second authenticated user cannot access or modify another user's patient root
  or document object.
- The project applies the migration and executes the isolation proof in CI.
- Authentication smoke coverage, linting, and production build remain successful.
