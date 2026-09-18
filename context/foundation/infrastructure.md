---
project: med-lab-timeline
researched_at: 2026-09-18
recommended_platform: Cloudflare Workers
runner_up: Netlify
context_type: mvp
tech_stack:
  language: TypeScript
  framework: Astro 7.3 + React 19
  runtime: Cloudflare Workers via @astrojs/cloudflare 14.3 and Wrangler 4.131
  data_services: Supabase (Auth, Postgres, private Storage)
---

## Recommendation

**Deploy on Cloudflare Workers.**

This is the direct deployment target already selected by the stack: the repository
uses `@astrojs/cloudflare`, a Worker entrypoint in `wrangler.jsonc`, and Wrangler.
It suits a low-traffic, one-region MVP while retaining Cloudflare's free allowance
(100,000 requests/day). Supabase remains the external provider for authentication,
Postgres, and private PDF storage; this avoids an unnecessary data migration and
keeps the initial hosting cost at zero. The decision reflects the developer's
Cloudflare familiarity, free-first preference, and lack of a confirmed persistent-
connection requirement.

Sources checked 2026-09-18: [Astro on Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/astro/), [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), and [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/).

## Platform Comparison

`Pass` means a strong fit for agent-driven MVP operations; `Partial` is usable
with a material trade-off. The persistent-connection answer was “not sure,” so no
candidate was hard-filtered on that axis. Cloudflare can support WebSockets if the
scope later requires them; Netlify and Vercel should not be chosen for that reason.

| Platform | CLI-first | Managed / serverless | Agent-readable docs | Scriptable deployment | MCP / integration | Result |
|---|---|---|---|---|---|---|
| Cloudflare Workers | Pass | Pass | Pass | Pass | Pass | 1 |
| Netlify | Pass | Pass | Pass | Pass | Pass | 2 |
| Vercel | Pass | Pass | Pass | Pass | Partial (MCP beta) | 3 |
| Render | Pass | Pass | Pass | Pass | Pass | Not shortlisted |
| Railway | Pass | Partial | Pass | Pass | Pass | Not shortlisted |
| Fly.io | Pass | Partial | Pass | Pass | Partial (MCP experimental) | Not shortlisted |

### Cloudflare Workers

The current Astro adapter is the repository's runtime and `wrangler deploy` is a
deterministic deployment path. `wrangler tail`, `wrangler deployments list`, and
`wrangler rollback` cover day-to-day observability and rollback. The Free plan's
10 ms CPU per invocation means Worker handlers must remain light; PDF extraction
and AI work must not be performed synchronously in a request handler. Cloudflare's
official MCP servers are available, but CLI is the initial operational interface.
Use Workers commands, not Pages commands, for this SSR target.

Sources: [Wrangler Workers commands](https://developers.cloudflare.com/workers/wrangler/commands/workers/), [rollbacks](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/), [MCP servers](https://developers.cloudflare.com/agents/model-context-protocol/cloudflare/servers-for-cloudflare/).

### Netlify

Netlify is a good Astro alternative with a first-class adapter and a permanent
Free plan. Its credit cap can stop service after exhaustion, and its Functions are
not a home for persistent processes or WebSockets. It is therefore a runner-up
only while the product remains request/response based.

Sources: [Astro deployment](https://docs.netlify.com/build/frameworks/framework-setup-guides/astro/), [credit-based Free plan](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/).

### Vercel

Vercel supports Astro SSR through its adapter and has capable CLI deployment and
logs. It ranks below Netlify because its free Hobby plan is limited to personal,
non-commercial use and its currently published WebSocket guidance is inconsistent.
Its official MCP is **beta** as checked 2026-09-18.

Sources: [Astro on Vercel](https://vercel.com/docs/frameworks/frontend/astro), [Hobby plan](https://vercel.com/docs/plans/hobby), [Vercel MCP](https://vercel.com/docs/agent-resources/vercel-mcp).

### Render

Render can run Astro SSR as a Web Service, but the Free service spins down after
15 minutes of inactivity and can take about a minute to wake. It is reasonable for
a static prototype, not for this authenticated application where responsiveness is
part of the user experience. Render's infrastructure MCP is GA; its documentation
MCP is **experimental** as checked 2026-09-18.

Source: [Deploy Astro on Render](https://render.com/docs/deploy-astro), [Free instances](https://render.com/docs/free).

### Railway

Railway has strong CLI and MCP support, but its normal deployment is a running
container and the $1/month Free credit is not a durable free production tier. An
Astro SSR deployment would require switching from the selected Cloudflare adapter
to a Node adapter and defining a server start command.

Sources: [Railway pricing](https://docs.railway.com/pricing/plans), [Railway MCP](https://docs.railway.com/ai/mcp-server).

### Fly.io

Fly.io supports persistent Node processes and WebSockets, but has no ongoing free
tier—only a trial—and adds container/Docker operational work. Its first-party MCP
server is **experimental** as checked 2026-09-18. It is a future option only if
durable processes become a confirmed requirement and a paid PaaS is acceptable.

Sources: [Astro on Fly.io](https://fly.io/docs/js/frameworks/astro/), [free trial](https://fly.io/docs/about/free-trial/), [MCP server](https://fly.io/docs/flyctl/mcp-server/).

### Shortlisted Platforms

#### 1. Cloudflare Workers (Recommended)

It matches the installed adapter, existing configuration, Cloudflare experience,
and free-first MVP constraint without changing the planned Supabase data layer.

#### 2. Netlify

It offers the smoothest conventional Astro alternative and a free plan, but is
weaker if persistent connections or long-running work enter scope.

#### 3. Vercel

It is technically capable for Astro SSR, but its Hobby-plan usage restriction and
beta MCP make it less suitable than the two options above.

## Anti-Bias Cross-Check: Cloudflare Workers

### Devil's Advocate — Weaknesses

1. The Workers Free CPU budget is 10 ms per invocation; synchronous PDF parsing
   or AI extraction in an SSR route can fail under realistic input sizes.
2. A Worker rollback restores code, not Supabase schema changes, Storage objects,
   or incorrect records already approved by a caregiver.
3. `SUPABASE_URL` and `SUPABASE_KEY` must be Worker secrets. Placing a privileged
   key in `wrangler.jsonc`, client code, a preview environment, or logs is a
   concrete patient-data exposure risk.
4. Workers and Pages have distinct deploy commands and configuration models. Using
   a Pages command for this Worker SSR application is an avoidable release failure.
5. Cloudflare's edge runtime does not determine where protected health data is
   stored or processed. Supabase region, retention, and applicable privacy duties
   must be chosen and reviewed before real patient data is introduced.

### Pre-Mortem — How This Could Fail

Six months later, the deployment decision is judged a failure because the team
treated a Worker request as a background job. A user uploaded a scanned PDF and
the route synchronously called the extraction provider, transformed pages, and
wrote results. Under ordinary documents, the handler exceeded its CPU or runtime
budget and failed intermittently; the UI showed a vague error instead of a safe
manual-review state. A hurried rollback restored a previous Worker version, but
did not reverse an incompatible Supabase migration or incorrect approved values.
To troubleshoot, a privileged Supabase key was copied into configuration or logs.
Meanwhile, preview and production environments shared the same Supabase project,
so test data and credentials crossed the boundary. Finally, the team assumed edge
hosting established appropriate handling for health-adjacent data without checking
the Supabase project region, access policies, retention, and legal obligations.
The platform did not cause these failures; unclear job boundaries, secret hygiene,
and data-governance assumptions did.

### Unknown Unknowns

- Current Wrangler can auto-detect Astro. Avoid old Workers Sites guidance; it is
  deprecated and does not describe this repository's adapter flow.
- WebSockets are supported, but shared durable connection state requires Durable
  Objects; it is out of scope until realtime is a confirmed requirement.
- Cloudflare MCP is available, but it is not required for MVP operations. A scoped
  token and auditable Wrangler CLI are the lower-risk default.
- `astro dev` is not a complete substitute for the Cloudflare runtime. Verify
  platform-specific behavior with the exact installed adapter and a preview before
  releasing.

## Operational Story

- **Preview deploys**: use a separate Cloudflare Worker/preview environment with a
  separate Supabase project or non-production credentials. Do not expose a preview
  carrying real patient data; protect any non-public preview with Cloudflare Access.
- **Secrets**: store `SUPABASE_URL` and `SUPABASE_KEY` with `wrangler secret put`.
  Use only the least-privileged server key required by the application; never
  commit secret values or place them in `wrangler.jsonc`. A human rotates the key
  in Supabase, updates the Worker secret, and redeploys.
- **Rollback**: run `npx wrangler deployments list`, then `npx wrangler rollback
  <VERSION_ID>`. A code rollback is immediate but does not undo Supabase data,
  schema migrations, or external side effects.
- **Approval**: a human approves the first production publish, secret rotation,
  Supabase project deletion, and destructive data actions. An agent may build,
  deploy to preview, inspect deployment state, and read logs using a scoped token.
- **Logs**: run `npx wrangler tail` for Worker logs and inspect GitHub Actions logs
  for CI. Use read-only access for production log inspection.

## Risk Register

| Risk | Source | Likelihood | Impact | Mitigation |
|---|---|---:|---:|---|
| PDF/AI work exceeds Worker request budget | Devil's advocate | M | H | Keep request handlers lightweight; validate extraction latency before choosing a job path; preserve mandatory manual approval. |
| Code rollback leaves incompatible data state | Devil's advocate | M | H | Review migrations separately, make them backward-compatible, and prepare a data-repair procedure before release. |
| Secret or privileged data leaks to client/config/logs | Devil's advocate | M | H | Use Worker secrets, least privilege, server-only env access, log redaction, and separate preview credentials. |
| Wrong Workers/Pages command is used | Research finding | L | M | Record `npx wrangler deploy` as the canonical command and validate it on a preview Worker first. |
| Supabase region or data controls are unsuitable | Pre-mortem | M | H | Select and document the Supabase region; review RLS, Storage policies, retention, and legal/privacy obligations before real data. |
| Realtime scope silently introduces stateful complexity | Unknown unknowns | L | M | Treat realtime as a new scope decision; evaluate Durable Objects only if a concrete feature requires it. |
| Free limit or runtime behavior differs from assumptions | Research finding | M | M | Monitor usage and test actual PDF/SSR routes before launch; set a spend/usage alert before upgrading. |

## Getting Started

1. Keep the existing Workers configuration and adapter (`@astrojs/cloudflare` and
   `wrangler.jsonc`); do not replace them with a Pages or Node adapter.
2. Validate the exact project build: `npm run lint && npm run build`.
3. Authenticate Wrangler interactively: `npx wrangler login`.
4. Add secrets interactively, without placing their values in files:
   `npx wrangler secret put SUPABASE_URL` and `npx wrangler secret put SUPABASE_KEY`.
5. Create a preview deployment and validate the authentication flow, then have a
   human approve the first production deployment with `npx wrangler deploy`.

## Out of Scope

- Docker image configuration
- CI/CD pipeline setup
- Production-scale multi-region HA, disaster recovery, and failover architecture
