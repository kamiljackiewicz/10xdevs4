---
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
---

## Why this stack

MedLabTimeline is a small, low-traffic web application built by a solo developer with extensive React experience and a four-week MVP budget. The accepted standard starter combines Astro, React, TypeScript, Tailwind CSS, and Supabase, providing authentication while supporting the planned patient database and private PDF storage. AI-assisted extraction, mandatory manual approval, comparisons, and dated notes require application-specific implementation; the AI provider remains undecided. Private storage and database access policies must be configured and tested before using real patient data. Background jobs are not currently committed scope; validate extraction latency and runtime limits before deciding whether they are needed. The user approved Cloudflare Workers Free as the initial hosting plan, overriding the registry's outdated cloudflare-pages entry to match the current upstream starter's Workers deployment. This is a deployment override, not a quality-gate override. GitHub Actions will run checks and automatically deploy successful merges to main. Scaffolding confidence is first-class, not end-to-end verified. Free hosting does not imply free AI or database usage; validate service limits and processing costs before deployment.
