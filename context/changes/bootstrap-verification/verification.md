---
bootstrapped_at: 2026-09-16T10:14:22Z
starter_id: 10x-astro-starter
starter_name: "10x Astro Starter (Astro + Supabase + Cloudflare)"
project_name: med-lab-timeline
language_family: js
package_manager: npm
cwd_strategy: git-clone
bootstrapper_confidence: first-class
phase_3_status: ok
audit_command: "npm audit --json"
---

## Hand-off

```yaml
starter_id: 10x-astro-starter
package_manager: npm
project_name: med-lab-timeline
hints:
  language_family: js
  team_size: solo
  deployment_target: cloudflare-workers
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: first-class
  path_taken: standard
  quality_override: false
  self_check_answers: null
  has_auth: true
  has_payments: false
  has_realtime: false
  has_ai: true
  has_background_jobs: false
```

## Why this stack

MedLabTimeline is a small, low-traffic web application built by a solo developer with extensive React experience and a four-week MVP budget. The accepted standard starter combines Astro, React, TypeScript, Tailwind CSS, and Supabase, providing authentication while supporting the planned patient database and private PDF storage. AI-assisted extraction, mandatory manual approval, comparisons, and dated notes require application-specific implementation; the AI provider remains undecided. Private storage and database access policies must be configured and tested before using real patient data. Background jobs are not currently committed scope; validate extraction latency and runtime limits before deciding whether they are needed. The user approved Cloudflare Workers Free as the initial hosting plan, overriding the registry's outdated cloudflare-pages entry to match the current upstream starter's Workers deployment. This is a deployment override, not a quality-gate override. GitHub Actions will run checks and automatically deploy successful merges to main. Scaffolding confidence is first-class, not end-to-end verified. Free hosting does not imply free AI or database usage; validate service limits and processing costs before deployment.

## Pre-scaffold verification

| Signal | Value | Severity | Notes |
| --- | --- | --- | --- |
| npm package | not run | n/a | The starter command begins with `git clone`; no create-* npm package applies. |
| GitHub repo | not run | unavailable | `gh` CLI is not installed, so `pushed_at` could not be retrieved for `przeprogramowani/10x-astro-starter`. |

## Scaffold log

**Resolved invocation**: `git clone https://github.com/przeprogramowani/10x-astro-starter .bootstrap-scaffold && cd .bootstrap-scaffold && npm install`

**Strategy**: git-clone

**Exit code**: 0

**Files moved**: 22

**Conflicts (.scaffold siblings)**: `AGENTS.md.scaffold`

**.gitignore handling**: moved silently

**.bootstrap-scaffold cleanup**: deleted

**Notes**: the starter's cloned `.git/` directory was removed before the move; the existing repository history was preserved. `npm install` completed with engine warnings because local Node is v22.12.0 while several installed packages require newer Node 22 releases.

## Post-scaffold audit

**Tool**: `npm audit --json`

**Summary**: 0 CRITICAL, 0 HIGH, 0 MODERATE, 0 LOW

**Direct vs transitive**: 0/0/0/0 direct of total 0/0/0/0

**Raw output**:

```json
{
  "auditReportVersion": 2,
  "vulnerabilities": {},
  "metadata": {
    "vulnerabilities": {
      "info": 0,
      "low": 0,
      "moderate": 0,
      "high": 0,
      "critical": 0,
      "total": 0
    },
    "dependencies": {
      "prod": 377,
      "dev": 269,
      "optional": 167,
      "peer": 0,
      "peerOptional": 0,
      "total": 804
    }
  }
}
```

#### CRITICAL findings

None.

#### HIGH findings

None.

#### MODERATE findings

None.

#### LOW / INFO findings

None.

## Hints recorded but not acted on

| Hint | Value |
| --- | --- |
| bootstrapper_confidence | first-class |
| quality_override | false |
| path_taken | standard |
| self_check_answers | null |
| team_size | solo |
| deployment_target | cloudflare-workers |
| ci_provider | github-actions |
| ci_default_flow | auto-deploy-on-merge |
| has_auth | true |
| has_payments | false |
| has_realtime | false |
| has_ai | true |
| has_background_jobs | false |

## Next steps

Next: a future skill will set up agent context (CLAUDE.md, AGENTS.md). For now, your project is scaffolded and verified — happy hacking.

Useful manual steps in the meantime:

- Review `AGENTS.md.scaffold` and decide whether any starter instructions should be incorporated into your existing `AGENTS.md`.
- Upgrade Node to at least v22.22.3 before relying on ESLint and Astro tooling; the installed starter emitted engine warnings under v22.12.0.
- Configure Supabase RLS and storage policies before processing real patient data.
- Address audit findings per your project's risk tolerance; this run has none.
