# 01 — Product Definition & Positioning

## Definition

XSite is a **model-agnostic, AI-operated website delivery and lifecycle-management platform**.
Its job is to transform a client's business requirements into:

1. A structured website brief
2. A recommended website architecture
3. A transparent build quotation
4. A deposit amount
5. A recurring monthly subscription
6. An approved delivery plan
7. A working website
8. A managed deployment
9. Ongoing operations: integrations, SEO, GEO, monitoring, improvement

XSite orchestrates external tools (coding agents such as Claude Code and OpenAI Codex,
design-generation tools, deployment providers, analytics platforms, SEO tools, and future AI
coding agents) as **replaceable execution engines** behind adapters. The workflow must continue
to work when HorizonX changes the underlying coding model or provider.

## Public positioning

**Primary:** "An AI-managed website delivery and operations platform."
**Supporting:** "From business brief to a live, managed, measurable website."

Never describe XSite publicly as: a drop-service business, an agency dashboard, a Claude
wrapper, a Codex wrapper, a no-code clone, a generic AI website generator, or an autonomous
system with no accountability. XSite does not compete with Claude Code, Codex, Webflow, Wix,
Framer, Lovable, Bolt, Replit, or any individual AI model — those are execution tools or
different categories. Clients interact with HorizonX and XSite; providers are internal
implementation details and must not appear in client-facing UI, quotes, or reports.

## Business model

Two charges per website:

1. **One-time build price** — calculated by the XBrain pricing engine from structured scope
   variables (guardrail ranges below).
2. **Recurring monthly operations subscription** — starts when the website goes live.

### Launch subscription pricing (centralized in `packages/core/src/config/pricing.config.ts`)

| Plan | Xability subscriber (bundle) | XSite-only |
|---|---|---|
| XSite Essential | $49/mo | $79/mo |
| XSite Growth | $99/mo | $149/mo |
| XSite Advanced | from $199/mo | from $299/mo |

### Build-price guardrails

| Website category | Range |
|---|---|
| Landing page | $350–$700 |
| Standard business website | $700–$1,500 |
| CMS / booking / directory / content platform | $1,500–$3,500 |
| E-commerce | $2,000–$5,000+ |
| Custom web platform | Custom quote |

These are guardrails, not arbitrary prices — XBrain calculates the quotation from the scope and
clamps into the guardrail band for the detected website category.

### Payment schedule (configurable)

- **50% deposit** after client approval of the proposal
- **50%** before production launch
- Monthly subscription starts when the website goes live

The deposit percentage is a configuration value, not a hardcoded constant. The pricing
configuration must also support (schema-ready, activation later): regional pricing, currency
conversion, taxes, promotional discounts, annual billing, Xability bundle discounts,
usage-based overages, and custom enterprise plans.

### Change-request fair usage (initial allowances, configurable)

| Plan | Included monthly change requests |
|---|---|
| Essential | Up to 3 small requests |
| Growth | Up to 8 small or medium requests |
| Advanced | Custom allowance and priority |

Request size classification (see `docs/06-workflows.md`): **small** (copy/image/style tweaks,
≤ ~2h equivalent, no new pages), **medium** (new section or page from existing patterns, minor
integration config), **major revision** (redesign of existing area), **new feature** (new
capability: booking, gated content, etc. — quoted as overage), **new project scope** (new
website or application — new quotation). Unused allowance does not roll over and never becomes
unlimited financial liability.

## Ecosystem context

HorizonX Digitalization Index: Xability 30% → XSite 60% → XApps 80% → XAuto 90% → XAI 100%.
XBrain is the connecting intelligence layer, not a sixth stage. Initially enabled: Xability and
XSite. The platform foundation must allow activating XApps, XAuto, and XAI later without
restructuring: bounded contexts, product-agnostic identity/organization/billing primitives, and
an ecosystem-connection model (see `docs/03-domain-model.md`).

Xability is the marketing operating system and primary source of social, brand, audience,
campaign, and content data. When a client already uses Xability, XSite imports **approved**
reusable business data through XBrain instead of re-asking.

XSite must detect when a request is really an application (complex ERP, CRM, multi-role
operational system, large internal dashboard, workflow-heavy SaaS, complex marketplace, custom
enterprise platform) and route it to **XApps** — while optionally still managing the public
website. This detection is implemented in the scope engine
(`packages/core/src/scope/engine.ts`).

## Honesty rules

- The initial pricing engine is **rules-based and explainable**. It is never presented as
  machine learning or autonomous AI.
- SEO/GEO operations never promise rankings, traffic, citations, or AI-answer placement.
- The Client Success Agent never claims to be human; it identifies itself as the XSite AI
  project manager / XBrain assistant, and avoids manipulative sales behavior.
- Phase 2–4 capabilities are surfaced with explicit statuses (`Available`, `Simulated`,
  `Planned`, `Requires Integration`) — never faked.
