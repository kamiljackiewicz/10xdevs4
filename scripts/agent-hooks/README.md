# Codex quality hooks

Configured from `context/foundation/test-plan.md`, section **Quality Gates**, on
2026-11-25. Harness evidence: `.agents/.10x-cli-manifest.json` has `tool: codex`.
No existing project/user hooks or orphan scripts were found. Husky's existing
pre-commit configuration is unchanged.

## Gate placement

| Gate | Placement | Status / purpose |
| --- | --- | --- |
| ESLint | PostToolUse, changed JS/TS/Astro files only | Existing syntax/style/type-aware lint gate; never autofixes |
| Dashboard UI guard | PostToolUse, only edited dashboard contract targets | Existing three-file scope; no expanded scan |
| ESLint + dashboard guard | Stop, changed tracked/untracked files | Catches edits made through shell commands |
| Unit tests | Stop, `npm run test:unit` | Whole suite: original baseline 21 tests in under one second |
| Draft retention interaction tests | Stop, `npm run test:interaction` | Existing 32 tests, baseline about six seconds |
| Framework type check | Stop, local `astro check --config scripts/agent-hooks/astro.config.mjs` | Generates ignored framework types; isolates Vite cache per invocation |
| Production build | Explicit completion check / existing CI | `npm run build`; stays outside the agent loop |
| HTTP smoke + Cloud isolation | Existing preview / CI | Requires services, authentication and synthetic cleanup |
| Additional isolation/dates | Existing CI after test rollout phase 2 | Phase not started; not introduced here |
| Profile form / visual review | Existing CI/manual after phase 3 | Phase not started; not introduced here |
| Import corpus/review | Existing CI after phase 4 | Phase not started; not introduced here |

No explicit post-edit deferral exists. The plan excludes **“Wygenerowany kod”**
from new application tests; this change respects that exclusion. No override.

## Configuration and signals

`.codex/hooks.json` adds `PostToolUse` with matcher `^apply_patch$` (30 seconds)
and `Stop` (120 seconds). Both invoke `run.mjs` through the current git root.
Failures use exit 2 and stderr; successful Stop returns `{}`. The Stop retry
guard honors `stop_hook_active`, allowing one repair attempt.

Patch paths resolve relative to payload `cwd`. Foreign repositories are skipped;
linked worktrees share git common-directory identity. Session checkout entries
live under the OS temporary directory, hashed by repository/session, with no
document contents or secrets. Stop checks its checkout and registered sibling
checkouts. It conservatively checks all outstanding changes, including changes
predating this turn. Deleted files still trigger tests and type checking.

Checks have an internal total budget of 25/105 seconds, below their harness
timeouts. Missing tools and timed-out checks report failure. Commands use local
binaries and argument arrays; no payload text is evaluated as shell code. Node
and git are required; jq is not. Windows command execution is unverified.

The check-only Astro config imports the application's config and overrides only
Vite's cache directory. Each invocation receives a fresh OS temporary directory,
removed after success or failure. This prevents optimizer rename collisions
(`ENOTEMPTY`) with dev/build processes and other hook invocations without deleting
their cache or skipping framework sync/type checks. Regression assertions verify
distinct cache paths, the config argument, and cleanup on success and failure.

## Repeatable proof

`node --test scripts/agent-hooks.test.mjs` runs isolated disposable git repos and
worktrees through the real hook script and real git, with fast checker stubs.
It is automatically included by the existing `npm run test:unit` glob and CI;
no CI job or application tests were added.

Coverage includes clean/broken files, ignored extensions, missing files,
empty/malformed/non-patch payloads, multiple patch paths, renames, subdirectory
cwd, foreign repositories, sibling worktrees, configured command resolution,
shell-written lint errors, failed assertions, type errors, missing tools,
clean checkout with no checkers installed, and the Stop retry guard.

Sensitivity proof: disabling the retry guard in a temporary copy made the
corresponding assertion fail with exit 1 (expected 0, received 2). Repository
source was not mutated. The actual Stop command also passed on this repository.
Final validation includes lint, unit, interaction, Astro check and build. The
first sandboxed build could not write Wrangler's user log; the authorized rerun
passed. The pre-existing missing sitemap `site` warning remains.

## Activation and limits

Review/trust both definitions with `/hooks` in Codex CLI, or **Settings > Hooks**
in the desktop app. Reopen the session if necessary and confirm both definitions
are enabled in a trusted project. Live Stop feedback and post-edit lint feedback
were observed during the cache fix on 2026-11-25. Test lint/type failures and a shell-written lint error in
a disposable checkout after activation, and observe the agent repair them.

Reference: [official hook documentation](https://learn.chatgpt.com/docs/hooks),
checked 2026-11-25. Payload `tool_input.command`, stderr/exit-2 feedback, Stop
retry flag and timeout units agree with the supplied reference. The reference's
12-event count is stale; current documentation lists 15. Its minimal ESLint
example uses `--fix`; this implementation follows the skill's stricter no-fix
rule instead.

Hooks do not prove Astro hydration, native browser controls, routing, Supabase
RLS/ownership, saved data, or PDF/OCR behavior. Keep browser acceptance, HTTP
smoke and Cloud isolation checks for those surfaces. Production is unchanged.

Recommended git placement (not configured): retain Husky/lint-staged for staged
lint/format checks; consider unit/interaction before commit, and build plus
service-backed smoke/isolation before push when the environment is available.
