# Test stack

## E2E

<!-- Written by /10x-e2e-setup. Re-run it to change this section; other skills only read it. -->

- runner: Playwright Test, @playwright/test 1.65.1
- config: playwright.config.ts
- single-spec command: npx playwright test tests/e2e/seed.spec.ts
- full-suite command: npx playwright test
- base URL: http://localhost:4321
- port: 4321 (detected from Astro preview CLI default; detected default 4321, override with E2E_PORT in .env.e2e)
- web server command: npm run build && npm run preview -- --port 4321; reuseExistingServer outside CI; ASTRO_PREVIEW_BACKGROUND=1 keeps Astro 7 in the foreground
- auth setup project: setup (tests/e2e/auth.setup.ts), credentials from E2E_USERNAME / E2E_PASSWORD in .env.e2e
- storageState: playwright/.auth/user.json (gitignored)
- seed: tests/e2e/seed.spec.ts — protects R3 browser subset: signed-out timeline navigation redirects to the sign-in form
- browser CLI: playwright-cli 0.1.25, command skill at .agents/skills/playwright-cli/SKILL.md; named session 10xdevs4
- updated: 2026-11-25

### Environment and verification

The user explicitly selected remote Supabase instead of the skill's local-only
default on 2026-11-25. Existing application configuration stays in ignored `.env`
(build) and `.dev.vars` (Cloudflare runtime). Dedicated E2E credentials belong in
ignored `.env.e2e`; never copy the service-role key into browser code or test
configuration. No CI workflow or agent rules were changed by this setup.

The seed risk was explicitly selected by the user because the existing test plan
assigns HTTP/RLS integration, rather than E2E, to R3. This seed covers only the
browser redirect and visible sign-in form; it does not prove cross-user isolation.
Other test-plan risks have no explicit E2E assignment, so the handoff is
`/10x-e2e` without a risk id.

Full cold-server verification passed with
`npx playwright test tests/e2e/seed.spec.ts`: 2 passed (setup + chromium seed).
The setup signs in through the real UI against remote Supabase and persists the
session; the seed explicitly uses an empty browser context. A dedicated confirmed
account was created after Supabase finished starting. Its credentials exist only
in ignored `.env.e2e`; preserve that file to reuse the account on subsequent runs.
No patient records or timeline notes were created. The authenticated account is
kept for later E2E runs, and the suite never signs it out globally.

The first auth run revealed a locator mismatch: the actual signed-in link is
`Otwórz profil`. The setup now asserts that observed accessible name. The initial
anonymous-only cold run also passed; it is supplementary evidence, not a
replacement for the full run with setup dependencies. The project's Stop hook
passed lint, unit tests, interaction tests and Astro check; Playwright's cold run
also completed the production build.

Stop any exploration preview and confirm port 4321 is free before acceptance;
otherwise reuseExistingServer could hide a stale build. Exploration used
`ASTRO_PREVIEW_BACKGROUND=1 npm run preview -- --port 4321` and the named browser
session was closed afterward. Vitest includes only `tests/interaction/**/*.test.tsx`
and Node unit tests include only `scripts/*.test.mjs`, so no runner exclusions
were needed. Playwright CLI created the empty `.playwright/` workspace marker;
`.playwright-cli/` was already ignored before its first call.
