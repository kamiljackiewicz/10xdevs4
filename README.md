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

Prerequisites: Node.js 22.23.2, npm, Docker, and the Supabase CLI.

```bash
git clone https://github.com/kamiljackiewicz/10xdevs4.git
cd 10xdevs4
npm install
```

For local development, start Supabase and create local-only environment files:

```bash
npx supabase start
npx supabase status -o env
```

Set the reported API URL and anonymous key in ignored `.env` and `.dev.vars` files:

```dotenv
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_KEY=<anon-key>
```

Then start the app:

```bash
npm run dev
```

Local Supabase services can be stopped with:

```bash
npx supabase stop
```

## Commands

```bash
npm run lint
npm run build
npm run preview
BASE_URL=http://localhost:4321 npm run smoke
```

`npm run smoke` verifies the authentication flow against a running local or preview application. It requires a reachable Supabase instance with email confirmation disabled for the test account flow.

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
