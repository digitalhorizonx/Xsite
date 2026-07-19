# 13 — Risks, Assumptions & Open Decisions

## Risks

| # | Risk | Mitigation |
|---|---|---|
| 1 | Provider dependency drift — a coding provider changes pricing/API/quality | Adapter gateway, multi-provider from Phase 2, performance records, circuit breakers, fallback |
| 2 | Autonomy incidents — an agent takes a harmful action | Bounded permissions, policy gates, hard prohibitions, immutable audit, reversible-first mitigation, rollback |
| 3 | Underpricing complex builds with a v1 rules engine | Guardrail bands, minimum price + cost floor, risk buffer, `requiresCustomPricing` escape hatch, quote validity windows |
| 4 | Change-request liability — unlimited expectations on flat subscriptions | Fair-usage config, size classification, G7 approval before billable work, usage metering |
| 5 | Fake-progress temptation in demos | Status honesty rule (`Available/Simulated/Planned/Requires Integration`) enforced in UI components |
| 6 | Multi-tenancy leakage | Structural org scoping at data layer + authZ matrix tests |
| 7 | Scope creep into XApps territory | Scope engine routing detection + explicit "new project scope" classification |
| 8 | Legal exposure (IP, domains, SEO claims) | Ownership records, IP placeholders pending CLO review, hard prohibition on ranking guarantees |
| 9 | Payment/billing errors | Idempotent payment operations, config-only prices, no silent billing changes, audit |
| 10 | Xability data misuse | Approved-data-only imports, per-category consent, itemized audit |

## Assumptions

1. HorizonX operates the `horizonx.site` DNS zone and can create `xsite-app.horizonx.site`.
2. Launch pricing is USD; multi-currency is schema-ready but not activated.
3. Xability exposes (or will expose via XBrain) an API to verify subscription status and pull
   approved business data; until then the connection is honestly labeled Simulated.
4. Initial clients are MENA-region SMBs; Arabic/RTL readiness is required from the foundation.
5. Payment provider(s) for MENA (e.g. PayTabs/CliQ, per HorizonX practice) are selected in
   Phase 2; Phase 1 payment boundaries are simulated.
6. One repository per client website; HorizonX hosts by default with ownership terms recorded.

## Open decisions (need Abdelrhman / HorizonX sign-off)

| # | Decision | Default until decided |
|---|---|---|
| 1 | Persistence timing: adopt Postgres/Prisma in Phase 1.5 vs start of Phase 2 | Phase 1.5 |
| 2 | Auth vendor (Clerk is used elsewhere in HorizonX) | Clerk-compatible session indirection |
| 3 | Payment provider(s) for build payments + subscriptions in MENA | PayTabs/CliQ + card PSP |
| 4 | Hosting/deployment provider for client sites (Vercel-class vs HorizonX VPS fleet) | Adapter supports both; pick per cost review |
| 5 | Exact Advanced-plan overage rates and enterprise thresholds | Config placeholders |
| 6 | IP & domain-ownership legal terms | Placeholders in proposals; CLO review pre-launch |
| 7 | Whether the XSite marketing landing page milestone precedes or follows Phase 2 | After Phase 1 review |

## Decided in this foundation

- Domain convention: `xsite.horizonx.site` = future landing page; `xsite-app.horizonx.site` =
  application (documented in `docs/02-architecture.md`).
- Stack: TypeScript monorepo — `@xsite/core` pure domain + Next.js portal; Postgres when
  persistence lands; typed REST boundary.
- Repo: `digitalhorizonx/xsite` monorepo for the platform; client sites in per-project repos.
- Deposit default 50%, configurable; all pricing centralized in one config module.
