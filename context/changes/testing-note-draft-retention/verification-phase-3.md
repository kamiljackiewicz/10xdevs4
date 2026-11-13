# Phase 3 verification — 2026-11-13

## Independent sensitivity checks

Command for each temporary mutation: `npm run test:interaction -- -t 'JSON 500 preserves'`.

| Temporary production change | Observed result |
| --- | --- |
| Clear `body` in the failed-response path | Exit 1; four selected create/edit × PL/EN tests failed the body assertion: received empty text instead of the raw multiline draft. |
| Reset `event_date` to `2000-01-01` in the same path | Exit 1; four selected tests failed the date assertion: received `2000-01-01` instead of `2024-05-17`. |

The other 28 tests were excluded by the name filter during each mutation check. Original file bytes were saved before mutation and restored in `finally` after each attempt. No production changes remain.

`src/components/patient/TimelineNotes.tsx` SHA-256 before and after both checks:

```text
9deaa3b7750eccb8f3f2c77d7d5bc6c0d59168b95127792eb8787c56a82888dc
```

## Restored-code verification

| Command | Result |
| --- | --- |
| `npm run test:interaction` | PASS: 32 tests, exit 0 |
| `npm run test:unit` | PASS: 16 tests, exit 0 |
| `npm run lint` | PASS: Dashboard UI guard and ESLint, exit 0 |
| `npx astro check` | PASS: 54 files; 0 errors, warnings or hints; exit 0 |
| `npm run build` | PASS: server build completed, exit 0 |

The build retained the existing sitemap warning about the missing `site` option. Wrangler log output required elevated execution outside the filesystem sandbox.

## CI and documentation

Parsed `.github/workflows/ci.yml` and confirmed Node `22.23.2` in job `ci`, an unconditional `npm run test:interaction` immediately after `test:unit` and before Astro check, no per-step secrets or failure masking, and an unchanged `smoke` job compared with HEAD before this phase.

README and cookbook §6.1 reference the existing test file, actual `create / PL > JSON 500 preserves the draft and allows further editing` case, and working command. Frozen strategy §1–§5 is unchanged except for the permitted rollout status. Rollout 1 was marked complete after the local checks passed.

No remote GitHub Actions run or Cloud smoke verification was performed in this phase. No manual or visual gate is required by the plan. Canonical execution state remains in the plan's `Progress` section.
