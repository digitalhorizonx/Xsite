# 12 — MVP Scope & Implementation Phases

Honesty rule: later-phase capability is never faked inside an earlier phase. Surfaces carry
explicit statuses: `Available`, `Simulated`, `Planned`, `Requires Integration`.

## Phase 1 — Product Foundation (this milestone)

**In scope (Available or Simulated, as labeled):**

- Application shell (portal navigation, light/dark theme, EN/AR-ready structure)
- Authentication-ready structure (session model + auth indirection; real IdP wiring later)
- Organization & business profile
- Xability connection model (status + approved-import model; live sync **Simulated**)
- Project creation
- Guided discovery
- Rules-based scope engine (website type detection, XApps routing detection)
- Rules-based pricing engine (centralized config; client quote + separate internal breakdown)
- Quote screen (full transparency: prices, deposit, monthly, assumptions, exclusions, validity, explanation)
- Proposal approval **mock boundary** (Simulated payments; clearly labeled)
- Workflow timeline (state machine–driven)
- Agent definitions (typed catalog of all 26 agents; runtime **Planned**)
- Provider adapter interfaces (typed; live adapters **Planned**)
- Audit event model
- Seed/demo data **clearly marked as demo**

**Phase 1.5 (fast-follow):** PostgreSQL persistence via Prisma, real auth provider, real audit
storage, contract/integration tests.

## Phase 2 — Delivery Orchestration

Artifact system (versioned storage) · task decomposition · provider selection engine (live) ·
coding-provider adapters (Claude Code, OpenAI Codex behind `CodingProvider`) · repository
integration · branch workflow · preview deployments · automated QA pipeline · client approvals
wired to real gates · payment provider integration (deposit/final real).

## Phase 3 — Production Operations

Domain & deployment management · analytics integrations · SEO/GEO operations · change-request
system (classification → approval → execution → usage metering) · monitoring · incidents ·
billing usage & overages · monthly reports.

## Phase 4 — Ecosystem Intelligence

Deeper Xability integration · shared XBrain business profile · cross-product recommendations ·
XApps routing handoff · XAuto workflow activation · XAI agent activation.

## Deferred (deliberately out of MVP)

Marketing landing page (`xsite.horizonx.site`, separate milestone) · regional pricing/currency
conversion/taxes/promotions/annual billing activation (schema exists) · enterprise custom
plans · client-website template library · mobile apps · public API for third parties.

## First implementation milestone (Phase 1 definition of done)

1. Monorepo with `@xsite/core` and `apps/web` building green (`pnpm build`, `pnpm test`,
   `pnpm typecheck`)
2. Pricing engine + scope engine + state machine + agent catalog implemented and unit-tested
3. Portal: dashboard, new-website guided discovery → live quote → proposal approval
   (simulated payment), project workspace with workflow timeline, approvals, agents view,
   organization/Xability screens — all on labeled demo data
4. Foundation docs (this `docs/` set) merged
5. CI: install + typecheck + test on PR

Acceptance: a reviewer can walk the demo journey from "new website request" to "quote
approved (simulated)" and see the exact transparent quote the pricing engine produced, with
no fake later-phase features.
