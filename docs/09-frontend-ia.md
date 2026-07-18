# 09 — Frontend Information Architecture

The XSite portal is an **application portal, not a marketing landing page** (the landing page
is a separate future milestone on `xsite.horizonx.site`). It should feel like a guided digital
project manager, a transparent quotation system, a controlled delivery workspace, and a modern
website-operations cockpit — never like a developer dashboard, an unstructured chat, a generic
agency CRM, a collection of AI buttons, or a Claude/Codex clone.

Conversational UI is used only where it improves discovery or support. Scope, pricing,
approvals, tasks, billing, integrations, deployment, and incidents always use structured
interfaces. On every screen the client can see: what is happening, what is waiting, what is
approved, what costs money, what is included, what will happen next, and what can be reversed.

## Navigation model

```
Portal shell (sidebar + topbar, light/dark, EN/AR-ready, RTL-ready)
├── Dashboard                      — org-level: projects, pending actions, ecosystem status
├── Websites (Projects)
│   ├── New website request        — guided discovery wizard → scope → quote → proposal
│   └── [Project workspace]        — one website, tabbed:
│       ├── Overview               — status, stage timeline, pending gates, next steps
│       ├── Requirements           — brief, scope items, acceptance criteria (versioned)
│       ├── Sitemap & Pages        — structure, page specs
│       ├── Content                — content model, drafts
│       ├── Design                 — design system, tokens, components, previews
│       ├── Quote & Proposal       — quote breakdown, approvals, validity
│       ├── Build                  — tasks, validation results, staging preview
│       ├── Approvals              — all gates, decisions, history
│       ├── Integrations           — status/config/health per integration
│       ├── Domains & Deployments  — environments, deployment history, rollbacks
│       ├── SEO & GEO              — plans, checks, monitoring
│       ├── Analytics & Performance
│       ├── Security
│       ├── Requests               — change requests + fair-usage meter
│       ├── Billing                — build payments, subscription, usage, invoices
│       ├── Reports                — monthly reports, recommendations
│       └── Activity               — audit history, incident history
├── Approval center                — every pending decision across projects
├── Messages                       — Client Success Agent thread (clearly AI-identified)
├── Files & brand assets
├── Organization
│   ├── Business profile
│   ├── Xability connection       — status + approved-data imports
│   ├── Members
│   └── Billing & subscription
└── Settings                       — locale (EN/AR), theme, notifications
```

## UI principles

- **Status honesty:** every feature surface carries `Available` / `Simulated` / `Planned` /
  `Requires Integration` badges; demo data is explicitly labeled "Demo".
- **Money clarity:** anything that costs money (deposits, overages, new-scope requests) shows
  the amount and requires explicit approval before execution.
- **Accessibility:** semantic landmarks, keyboard navigability, WCAG-conscious contrast in
  both themes.
- **i18n readiness:** all strings routed through a message layer; layout tested with
  `dir="rtl"`; Arabic activation is a content task, not a refactor.
- **No provider branding:** client-facing UI never names Claude, Codex, or other execution
  vendors.
