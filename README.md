# XSite

**An AI-managed website delivery and operations platform.**
*From business brief to a live, managed, measurable website.*

XSite is a HorizonX product. It transforms a client's business requirements into a structured
brief, a recommended architecture, a transparent quotation, an approved delivery plan, a working
website, a managed deployment, and ongoing website operations (SEO, GEO, integrations,
monitoring, improvement).

XSite is **model-agnostic**: external coding agents, design tools, deployment providers, and
analytics platforms are replaceable execution engines behind provider adapters. They are never
the core architecture, the public identity, or a permanent dependency. The XSite workflow keeps
working when HorizonX changes the underlying coding model or provider.

XSite is **not** a website builder, a drop-service business, an agency dashboard, a wrapper
around any single AI vendor, a no-code clone, or an unaccountable autonomous system. Clients
interact with HorizonX and XSite; execution providers are internal implementation details.

---

## HorizonX ecosystem

| Product | Digitalization Index | Status |
|---|---|---|
| Xability — marketing operating system | 30% | Enabled |
| **XSite — website delivery & operations** | +30% (60% cumulative) | Enabled (this repo) |
| XApps — business applications | +20% (80%) | Planned |
| XAuto — automation | +10% (90%) | Planned |
| XAI — applied AI agents | +10% (100%) | Planned |

**XBrain** is the intelligence and orchestration layer connecting these products (not a sixth
percentage stage). When a client already uses Xability, XSite reuses approved business
information, branding, content, audience data, campaigns, and assets instead of asking again.

## Repository layout

```
xsite/
├── docs/                  # Engineering & product foundation (start here)
├── packages/
│   └── core/              # @xsite/core — domain model, pricing engine, scope engine,
│                          #   workflow state machine, agent catalog, provider interfaces,
│                          #   audit events. Pure TypeScript, fully unit-tested.
└── apps/
    └── web/               # @xsite/web — client portal (Next.js). Phase 1 application shell.
```

## Documentation index

| Doc | Contents |
|---|---|
| [docs/01-product-definition.md](docs/01-product-definition.md) | Product definition, positioning, business model |
| [docs/02-architecture.md](docs/02-architecture.md) | Architecture diagram, bounded contexts, repo & deployment strategy, domain convention |
| [docs/03-domain-model.md](docs/03-domain-model.md) | Entities and database model |
| [docs/04-pricing-engine.md](docs/04-pricing-engine.md) | Pricing model, formula, Xability bundle logic |
| [docs/05-agent-catalog.md](docs/05-agent-catalog.md) | The 26-agent operating system |
| [docs/06-workflows.md](docs/06-workflows.md) | Client journey, workflow state machine, approval gates |
| [docs/07-provider-abstraction.md](docs/07-provider-abstraction.md) | Provider adapters, selection, fallback, budgets |
| [docs/08-api-design.md](docs/08-api-design.md) | API boundaries |
| [docs/09-frontend-ia.md](docs/09-frontend-ia.md) | Portal information architecture |
| [docs/10-security-governance.md](docs/10-security-governance.md) | Security model, governance, hard prohibitions |
| [docs/11-testing-strategy.md](docs/11-testing-strategy.md) | Testing strategy |
| [docs/12-implementation-phases.md](docs/12-implementation-phases.md) | MVP scope, deferred scope, phases, first milestone |
| [docs/13-risks-assumptions-decisions.md](docs/13-risks-assumptions-decisions.md) | Risks, assumptions, open decisions |

## Development

Requires Node ≥ 22 and pnpm ≥ 10.

```bash
pnpm install
pnpm test        # unit tests (@xsite/core)
pnpm typecheck
pnpm dev         # portal at http://localhost:3000
```

All data visible in the Phase 1 portal is **demo data, clearly marked as demo**. Feature
surfaces are explicitly labeled `Available`, `Simulated`, `Planned`, or `Requires Integration` —
Phase 2–4 capabilities are never faked as working.

## Domains

| Domain | Purpose |
|---|---|
| `xsite.horizonx.site` | Reserved for the future XSite marketing landing page (separate milestone) |
| `xsite-app.horizonx.site` | The XSite application (this portal) |

This convention is documented in [docs/02-architecture.md](docs/02-architecture.md) and must not
be swapped.
