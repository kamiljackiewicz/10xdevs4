# MedLabTimeline

MedLabTimeline helps a caregiver organize a child's blood-test history and prepare for medical consultations. It is designed to show caregiver-reviewed parameter changes alongside dated notes about treatment or recommendations; it does not interpret results, recommend treatment, or replace a doctor.

## Project status

The application currently includes the project foundation: email/password authentication, protected routes, and a Cloudflare Workers deployment. The first product milestone is planned publicly in the [GitHub issue backlog](https://github.com/kamiljackiewicz/10xdevs4/issues?q=is%3Aissue%20label%3Aroadmap), including patient profiles, dated notes, reviewed PDF import, chronological comparisons, and correction of approved results.

The first end-to-end product flow is intentionally limited to a supported subset of blood-test PDFs and parameters. A caregiver must be able to review and correct extracted values before they become approved data.

## Technology

- Astro, React, TypeScript, and Tailwind CSS
- Supabase for authentication and planned private data storage
- Cloudflare Workers for deployment

## Get started

Prerequisites: Node.js 22.23.2, npm, access to the approved Supabase Cloud
project, and the Supabase CLI.

```bash
git clone https://github.com/kamiljackiewicz/10xdevs4.git
cd 10xdevs4
npm install
```

Log in and link the approved Cloud project:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
```

Set the Cloud project URL and publishable (or legacy anonymous) key in ignored
`.env` and `.dev.vars` files. Never commit either file:

```dotenv
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_KEY=<publishable-or-anon-key>
```

Then start the app:

```bash
npm run dev
```

## Commands

```bash
npm run lint
npm run test:unit
npx astro check
npm run build
npm run preview
BASE_URL=http://localhost:4321 npm run smoke
npm run test:supabase-access
```

`npm run smoke` verifies login/session/logout, anonymous denial, profile API
guards, creation, duplicate rejection, editing, persisted server-rendered values,
and PL/EN selection across navigation and reload. Run it against a local Workers
preview connected to the approved Supabase **Cloud** project, never local
Supabase or Docker. This HTTP test does not execute browser hydration or click
the form; both-language browser UX remains a manual review gate.

`npm run test:supabase-access` provisions two confirmed synthetic identities and
uses their authenticated clients to check profile persistence, owner-only access,
ownership-transfer denial, one-profile uniqueness and private Storage isolation.
Denied profile inserts/transfers must return RLS code `42501`; a second profile
for an owner must return `23505`. Hidden cross-user updates/deletes must affect
zero rows and leave the owner's values unchanged.

Both Cloud commands need environment variables `SUPABASE_URL`, `SUPABASE_KEY`
and `SUPABASE_TEST_SERVICE_ROLE_KEY`. CI reads the existing three GitHub repository
secrets; the test-only administrative key is used solely for synthetic account
setup and scoped cleanup, never application code or browser assets. Do not print
or commit it. If it exists only in GitHub, run Cloud verification there rather
than treating local lint/build success as a Cloud test pass.

Cleanup is attempted in `finally`, including after a failed request. Storage
objects are removed and verified before patient roots and users; if object
cleanup fails, retain their owners and report synthetic identifiers for manual
cleanup. Cleanup failures fail the test. CI runs the isolation command even if
HTTP smoke fails (unless the job is cancelled). Forced process termination cannot
guarantee cleanup; use any reported synthetic IDs to investigate leftovers.

## Deployment

The application is deployed as a Cloudflare Worker. Never add real credentials to the repository, `wrangler.jsonc`, or public issue discussions.

Before a production deployment, set the server-side secrets through Wrangler's interactive prompt:

```bash
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_KEY
npx wrangler deploy
```

Use `npx wrangler deploy` for this project; it is a Workers deployment, not a Cloudflare Pages deployment.

## Product and privacy boundaries

- The MVP covers blood-test results only; EEG and universal laboratory support are outside its first scope.
- The application presents a chronological record and comparability warnings, never medical conclusions.
- Each caregiver accesses only their own single-patient profile in the MVP; profile sharing is deferred.
- Do not use real patient data until Supabase access policies, private Storage, data region, and retention decisions have been reviewed.

## Contributing

Read [Repository Guidelines](AGENTS.md) before making a change. The source product requirements and the current technical roadmap live in [`context/foundation/`](context/foundation/).

## License

MIT
