---
project: 10x-med-lab-timeline
approved_at: 2026-09-18
deployment_target: cloudflare-workers
status: deployed-pending-human-acceptance
---

# First deployment plan

## Scope and guardrail

Deploy the Astro SSR application to **Cloudflare Workers**, following
`context/foundation/infrastructure.md` and `context/foundation/tech-stack.md`.
This is a Workers deployment: do not use `wrangler pages deploy`.

No production deployment may run until the manual steps below are complete and a
human explicitly approves publication. Secrets must never be committed, included
in `wrangler.jsonc`, or supplied in chat.

## Phase 0 — Preflight (complete 2026-09-18)

- `npm run lint` completed successfully.
- `ASTRO_TELEMETRY_DISABLED=1 npm run build` completed successfully.
- `npx wrangler deploy --dry-run` completed successfully. It selected the built
  Worker configuration at `dist/server/wrangler.json`, confirmed the Worker
  deployment path, and reported the generated bindings `SESSION` (KV), `IMAGES`,
  and `ASSETS`.
- No Cloudflare resources, secrets, or deployments were changed in this phase.

## Phase 1 — First production deployment (complete 2026-09-18)

- Published Worker: `10x-astro-starter`
- Production URL: `https://10x-astro-starter.kamil-jack.workers.dev`
- Active version ID: `45425d70-1c4c-4a0f-8c9e-3d18a43f85d5`
- Cloudflare provisioned the adapter-required KV namespace
  `10x-astro-starter-session` for the `SESSION` binding.
- A production HTTP request to `/` returned `200`.
- `wrangler secret list` returned no secrets. Consequently, authentication
  verification and human acceptance remain blocked until `SUPABASE_URL` and
  `SUPABASE_KEY` are configured.

## Phase 2 — Supabase secrets (complete 2026-09-18)

- Configured Worker secrets: `SUPABASE_URL` and `SUPABASE_KEY`.
- Values were entered through Wrangler's masked interactive prompt and were not
  written to repository files.
- Cloudflare created secret-change versions. The active version is
  `b83dd608-3a97-4f5b-92a0-1b046e5d5948`.
- A human must still perform the production authentication acceptance test before
  the deployment is considered fully accepted.

## Phase 3 — Production acceptance (complete 2026-09-18)

- A human verified production sign-up, sign-in, access to `/dashboard`, sign-out,
  and the unauthenticated redirect from `/dashboard` to `/auth/signin`.
- Email confirmation was disabled in the production Supabase Email provider for
  this MVP test flow.
- Deployment accepted.

## Phase 4 — Worker naming correction (complete 2026-09-18)

- The approved production Worker name is `10x-med-lab-timeline`.
- The original `10x-astro-starter` Worker and its
  `10x-astro-starter-session` KV namespace were deleted after the replacement
  Worker was verified.
- New production URL: `https://10x-med-lab-timeline.kamil-jack.workers.dev`
- Active version ID: `1f49186f-1290-427f-9f13-b599edf8d1a8`.
- The new Worker has its own `10x-med-lab-timeline-session` KV namespace and
  both Supabase secrets. Its root route returned HTTP `200`.
- The name change creates a separate Worker and session store, so a human must
  repeat the production authentication acceptance test against the new URL.

## Ownership and sequence

| Step | Owner | Action | Completion evidence |
|---|---|---|---|
| 1 | Agent | Use `10x-med-lab-timeline` as the Worker and application name. | `wrangler.jsonc` and package metadata use the approved name. |
| 2 | Agent | Run validation. | `npm run lint` and `npm run build` succeed. |
| 3 | Human | Confirm the logged-in Cloudflare account is the intended production account. | Account confirmation. |
| 4 | Human | Create or select a production Supabase project; document its region and configure Auth, RLS, and private Storage before handling real data. | Project and safeguards confirmed. |
| 5 | Human | Add the two Worker secrets interactively. | Wrangler confirms both secrets. |
| 6 | Agent | Run a production deployment after explicit human approval. | Wrangler deployment URL and version ID. |
| 7 | Agent | Inspect the published deployment and logs. | `wrangler deployments list`; logs checked as needed. |
| 8 | Human | Verify sign-up, sign-in, sign-out, and protected `/dashboard` against the deployed site. | Human acceptance. |

## Manual accounts and services

- **Cloudflare:** production account access is required. The authenticated account
  must be confirmed by a human before its first publish.
- **Supabase:** use a dedicated production project, not the local Docker stack.
  Select a suitable region and configure Auth, database RLS, and private Storage
  policies before any real patient-related data is used.
- **GitHub:** existing CI remains unchanged and is out of scope for this first
  manual deployment.

## Required secrets

Only these existing server-side environment variable names are in scope:

```sh
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_KEY
```

Enter their values only at Wrangler's interactive prompt. Use the lowest-privilege
Supabase key the application needs. Never use a privileged service-role key in
client-side code, configuration, source control, or logs.

## Agent commands

### Preflight

```sh
npm run lint
npm run build
```

### Publish to Cloudflare Workers

```sh
npx wrangler deploy
```

This deploys the Worker configured by `wrangler.jsonc`. Do not substitute the
Cloudflare Pages command (`wrangler pages deploy`), which targets a different
platform and deployment model.

### Inspect and rollback

```sh
npx wrangler deployments list
npx wrangler tail
npx wrangler rollback <VERSION_ID>
```

A Worker rollback restores code only. It does not revert Supabase schema changes,
stored objects, or already-written application data.

## Explicit publication gate

Before `npx wrangler deploy`, the human must confirm that the production Supabase
project is ready, both secrets are set, and publication is approved. Until then,
the approved plan authorizes validation and configuration inspection only.
