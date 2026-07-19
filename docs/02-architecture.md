# 02 — Product Architecture

## Shape

XSite is a **modular, multi-tenant SaaS** with clear bounded contexts, an agent operating
system with bounded permissions, and a provider-independent tool gateway. It is not one giant
service and not one giant agent.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS (browser)                               │
│        Client portal (xsite-app.horizonx.site) · future landing page         │
└───────────────────────────────────┬──────────────────────────────────────────┘
                                    │ typed HTTPS API (REST, versioned)
┌───────────────────────────────────▼──────────────────────────────────────────┐
│                          XSITE APPLICATION LAYER                             │
│  Identity · Organizations · Business Profiles · Projects · Discovery ·       │
│  Scope · Pricing · Proposals · Billing · Approvals · Requests ·              │
│  Notifications · Reports                                                     │
├──────────────────────────────────────────────────────────────────────────────┤
│                        XBRAIN ORCHESTRATION LAYER                            │
│  Workflow engine (state machines) · Agent runtime (26 bounded agents) ·      │
│  Pricing engine (rules-based, explainable) · Scope engine ·                  │
│  Ecosystem connections (Xability now; XApps/XAuto/XAI later)                 │
├──────────────────────────────────────────────────────────────────────────────┤
│                       PROVIDER GATEWAY (tool adapters)                       │
│  CodingProvider · ReasoningProvider · DesignProvider · DeploymentProvider ·  │
│  HostingProvider · AnalyticsProvider · SEOProvider · DNSProvider ·           │
│  PaymentProvider · EmailProvider · MessagingProvider                         │
│  (selection, fallback, retry, circuit breaker, budgets, validation)          │
├──────────────────────────────────────────────────────────────────────────────┤
│                          CROSS-CUTTING PLATFORM                              │
│  AuthN/AuthZ (least privilege) · Immutable audit log · Secret management ·   │
│  Job queue & background workers · Event bus · Object storage ·               │
│  Relational DB · Monitoring · Rate limits · Budget limits                    │
└──────────────────────────────────────────────────────────────────────────────┘
        │                    │                     │
   Claude Code /        Vercel / DNS /        Stripe / analytics /
   Codex / future       hosting / CI          SEO / email / …
   coding agents        providers             (all replaceable)
```

**Rule:** provider-specific logic never leaks above the gateway. The domain speaks in
capabilities (`CodingProvider.executeTask`), never in vendor names.

## Bounded contexts

Identity · Organizations · Business Profiles · HorizonX Ecosystem Connections · Projects ·
Discovery · Scope · Pricing · Proposals · Billing · Workflow · Agents · Providers · Artifacts ·
Approvals · Repositories · Deployments · Domains · Integrations · SEO · GEO · Analytics ·
Monitoring · Requests · Incidents · Notifications · Audit.

Each context owns its entities and exposes intent-named operations. Cross-context communication
happens through typed events and workflow contracts — not through shared tables or free-form
messages. Detailed entities per context: `docs/03-domain-model.md`.

## Technology stack (selected)

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | **Next.js (App Router) + React + TypeScript** | Accessible component architecture, responsive dashboard, server components for the portal, RTL-ready for Arabic/English, light + dark theme |
| Domain core | **`@xsite/core` pure TypeScript package** | Pricing/scope engines, state machines, agent catalog, and provider interfaces are framework-free and fully unit-testable; the same domain code runs in the API layer and (read-only) in the portal |
| API | **Typed REST boundary** (Next.js route handlers in Phase 1; extractable service later) | Versioned, JSON, mirrors bounded contexts |
| Database | **PostgreSQL** (relational) via Prisma when persistence lands in Phase 1.5/2 | Multi-tenant relational model, migrations as code |
| Jobs/queue | Postgres-backed queue first (e.g. pg-boss), broker later if justified | Event-driven workflows where justified, not by default |
| Object storage | S3-compatible | Artifacts, files, brand assets |
| Secrets | Managed secret store (per deployment platform) | Never in code, env files committed, or logs |

Aligned with the wider HorizonX stack (TypeScript/Node/Postgres) so the ecosystem shares
operational knowledge. Nothing was chosen for fashion; every piece is boring, typed, and
replaceable. Final hosting/deployment providers are confirmed per environment before Phase 2
delivery orchestration goes live.

## Repository strategy

- **This monorepo (`digitalhorizonx/xsite`)** — platform code: `docs/`, `packages/core`,
  `apps/web`, later `apps/api` (if extracted) and `packages/agents`, `packages/providers`.
- **Client website repositories** — one repository per client website, created by the
  Technical Build Orchestrator through the repository provider adapter, owned per the
  governance terms (`docs/10-security-governance.md`). Client code never lives in the platform
  monorepo.
- **Branch strategy (platform):** trunk-based; short-lived feature branches into `main` via PR
  with CI (typecheck, tests, lint).
- **Branch strategy (client sites):** `main` = production, `staging` = client review; every
  agent task executes on an isolated `task/<id>` branch; merges only after automated validation
  passes; production deploys only from `main` after client approval.

## Deployment strategy

| Environment | Purpose | Domain |
|---|---|---|
| Local | Development | localhost |
| Staging | Pre-production validation of the platform | `staging.xsite-app.horizonx.site` |
| Production | Client portal | `xsite-app.horizonx.site` |

**Domain convention (decided):**

- `xsite.horizonx.site` → reserved for the future XSite **marketing landing page** (separate
  milestone; not built in Phase 1).
- `xsite-app.horizonx.site` → the XSite **application**.

Chosen over `app.xsite.horizonx.site` to avoid a second-level wildcard/cert layer under
`xsite.horizonx.site` and to keep the landing-page domain untouched until that milestone.

Client websites deploy through `DeploymentProvider`/`HostingProvider` adapters to
per-project environments (preview → staging → production) with their own domains, entirely
separate from platform infrastructure. Rollback: platform via previous-build promotion; client
sites via immutable deployment history and one-step re-promotion (required by governance).

## Phase-1 footprint vs target

Phase 1 implements the portal shell + `@xsite/core` engines with in-memory demo data (clearly
marked), the typed API boundary shape, and mock approval/payment boundaries. Persistence,
queues, the agent runtime, and the live provider gateway land in Phases 1.5–3 per
`docs/12-implementation-phases.md`. Phase 1 never simulates Phases 2–4 as real — every surface
carries an explicit `Available` / `Simulated` / `Planned` / `Requires Integration` status.
