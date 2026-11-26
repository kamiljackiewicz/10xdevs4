# MedLabTimeline

MedLabTimeline helps a caregiver keep a private patient profile and a dated timeline of notes about treatment, recommendations, and medical consultations. Blood-test PDF import and parameter comparisons are planned extensions. The application does not interpret results, recommend treatment, or replace a doctor.

## Project status

[Live application](https://10x-med-lab-timeline.kamil-jack.workers.dev)

Implemented:

- Email/password registration, sign-in, sign-out, and protected dashboard routes.
- One private patient profile per caregiver, with creation, viewing, and editing.
- Timeline-note CRUD: create, view, edit, and delete dated notes, persisted in Supabase.
- Domain rules: valid calendar dates, notes cannot precede the patient's birth date, and newest-event-first ordering after reload. Future-dated notes are allowed.
- Polish and English interfaces, including validation and error messages.
- Owner-only access enforced through Supabase RLS, with automated isolation checks.
- Risk-based unit, interaction, HTTP smoke, and browser E2E tests, plus agent quality hooks and GitHub Actions CI.
- Structured server diagnostics for unexpected Auth-session and profile/timeline read failures, preserving existing HTTP responses and UI.

Planned: supported blood-test PDF import, caregiver review/correction before approval, comparisons of approved parameters alongside timeline notes, and correction of approved results. These features are not available in the current application. See the [roadmap](context/foundation/roadmap.md) and [GitHub issue backlog](https://github.com/kamiljackiewicz/10xdevs4/issues?q=is%3Aissue%20label%3Aroadmap).

## Try the application

Use synthetic information for a demonstration:

1. Register or sign in at the [live application](https://10x-med-lab-timeline.kamil-jack.workers.dev).
2. Open the profile, enter synthetic patient details and a birth date, and save. Reload to verify persistence; edit the profile to try validation and updates.
3. Open `/dashboard/timeline`. Add two notes with different event dates, save, and reload: the later event appears first regardless of insertion order.
4. Edit a note, then delete it. Try a date before the patient's birth date to see the domain validation.
5. Switch PL/EN and sign out. Opening `/dashboard` or `/dashboard/timeline` while signed out redirects to the sign-in page.

## Technology

- Astro, React, TypeScript, and Tailwind CSS
- Supabase Auth, PostgreSQL with RLS, and a private Storage access foundation
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

The project uses Supabase CLI v3. Database commands target the local stack by
default; pass `--remote` explicitly when inspecting or updating the linked Cloud
project. Hosted mutations also require explicit confirmation. See the
[CLI v3 migration guide](https://supabase.com/docs/guides/local-development/cli/migrating-to-v3).

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
npm run test:interaction
npx astro check
npm run build
npm run preview
BASE_URL=http://localhost:4321 npm run smoke
npm run test:supabase-access
npx playwright test
```

### Test coverage and evidence

| Layer               | What it verifies                                                                                     |
| ------------------- | ---------------------------------------------------------------------------------------------------- |
| Unit                | Profile/note validation, calendar dates, localization, safe diagnostics, and quality-hook behavior   |
| Interaction         | Note drafts survive failed saves; create/edit validation and pending controls in PL/EN               |
| HTTP smoke          | Authentication, profile persistence, timeline-note CRUD, request guards, and language selection      |
| Supabase access     | Owner isolation, RLS, profile uniqueness, and private Storage boundaries                             |
| Playwright E2E      | Signed-out redirect (R3), persisted timeline dates/order (R4), and keyboard validation recovery (R5) |
| Isolated SSR probes | Auth/read failure diagnostics before/after, privacy, expected-state silence, and preserved HTTP/UI   |

The risk register and test strategy are in [test-plan.md](context/foundation/test-plan.md). Browser evidence is recorded for [R4](tests/e2e/timeline-date-order.md) and [R5](tests/e2e/profile-keyboard.md). The [diagnostics verification](context/changes/report-auth-and-read-failures/verification.md) records the 34-case PL/EN before/after matrix and deliberate-break check.

`npm run test:interaction` runs the note-form interaction tests in jsdom without
Astro, a database, or secrets. The reference case in
[`tests/interaction/timeline-note-draft.test.tsx`](tests/interaction/timeline-note-draft.test.tsx)
is `create / PL > JSON 500 preserves the draft and allows further editing`.
The suite checks create/edit in PL/EN, failed saves, pending controls, and local
validation. It proves draft retention in an open form; it does not verify Astro
hydration, native date-picker behavior, or persistence after reload. See the
[test cookbook §6.1](context/foundation/test-plan.md#61-zachowanie-szkicu-po-błędzie)
for the pattern used to add another case.

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

### Browser E2E setup

Install Chromium once:

```bash
npx playwright install chromium
```

Set `E2E_USERNAME` and `E2E_PASSWORD` for a dedicated confirmed test account in ignored `.env.e2e`. The isolated-account specs also require `SUPABASE_URL` and `SUPABASE_TEST_SERVICE_ROLE_KEY` in ignored `.dev.vars`; the administrative key stays in the Node fixture and is never supplied to the browser. Temporary accounts and their profile/note data are cleaned up and checked for leftovers.

Stop any manually started local preview before running `npx playwright test`. Playwright builds the app and starts Workers preview on port 4321; `E2E_PORT` can override it. Tests use the approved remote Supabase project. Authentication state in `playwright/.auth/` is ignored by Git. See [test-stack.md](context/foundation/test-stack.md) for setup details.

## Deployment

The application is deployed as a [Cloudflare Worker](https://10x-med-lab-timeline.kamil-jack.workers.dev). The [2026-11-26 release record](context/deployment/2026-11-26-auth-read-diagnostics.md) contains its version, rollback target, and production HTTP/log-stream checks. Never add real credentials to the repository, `wrangler.jsonc`, or public issue discussions.

Local failure probes confirm safe diagnostic emission; production checks confirm normal requests reach the log stream. Production failure-event delivery, log retention, and alert delivery have not been verified.

Authentication uses Supabase cookies. The unused Astro session store is explicitly
disabled with `session: false` in `astro.config.mjs`, so the Cloudflare adapter does
not generate a `SESSION` KV binding for production or branch previews. Existing
Cloudflare KV namespaces are not deleted by this setting.

Before a production deployment, set the server-side secrets through Wrangler's interactive prompt:

```bash
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_KEY
npx wrangler deploy
```

Use `npx wrangler deploy` for this project; it is a Workers deployment, not a Cloudflare Pages deployment.

## Product and privacy boundaries

- The current release covers profiles and dated notes. Planned result import is limited to blood tests; EEG and universal laboratory support are outside its first scope.
- The timeline presents a chronological record, never medical conclusions. Comparability warnings belong to the planned result-comparison feature.
- Each caregiver accesses only their own single-patient profile in the MVP; profile sharing is deferred.
- Do not use real patient data until Supabase access policies, private Storage, data region, and retention decisions have been reviewed.

## Contributing

Read [Repository Guidelines](AGENTS.md) before making a change. The source product requirements and the current technical roadmap live in [`context/foundation/`](context/foundation/).

## License

MIT
