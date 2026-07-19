# 05 — Agent Operating System

**Implementation:** `packages/core/src/agents/catalog.ts` (typed, seedable, unit-tested).

## Operating model

The standard fulfillment workflow runs **without HorizonX employees in the path** — but "no
employees" never means unrestricted autonomy. Every agent operates inside bounded permissions,
explicit policies, immutable audit logging, client approval gates, rollback capability, and
safe failure handling. Critical financial, legal, production, domain, data-deletion, and
security operations always pass policy gates and, where appropriate, client confirmation.

Agents do **not** coordinate through uncontrolled free-form messages. They exchange **typed,
versioned artifacts** through **structured workflow contracts**: an agent run consumes declared
input artifact kinds and produces declared output artifact kinds; the workflow engine wires
runs together according to the project state machine. Conversational text appears only at the
client boundary (discovery, support) — never as the inter-agent protocol.

Every agent definition carries eleven mandatory fields: responsibility, allowed inputs,
allowed outputs, permission boundaries, required tools, escalation conditions, retry policy,
timeout policy, audit events, approval requirements, failure behavior. The typed catalog is
the source of truth; the table below is the summary.

## Catalog (26 agents)

| # | Agent | Responsibility (summary) | Key permission boundary |
|---|---|---|---|
| 1 | Intake Agent | Receive a new request, create the project shell, detect returning clients and Xability connections | Cannot quote, price, or promise scope |
| 2 | Business Discovery Agent | Run guided discovery, import approved Xability data, identify missing information | Reads only approved ecosystem data; cannot invent business facts |
| 3 | Scope Analyst Agent | Convert discovery into structured scope variables; classify website type; detect XApps routing | Cannot change prices; flags — never hides — scope gaps |
| 4 | Solution Architect Agent | Propose site structure, stack profile, integration map, architecture decision artifact | Cannot select providers or start builds |
| 5 | Pricing Agent | Run the rules-based pricing engine; produce quote + internal breakdown | Cannot deviate from config/guardrails; cannot expose internal breakdown |
| 6 | Proposal Agent | Assemble scope+quote+timeline into the client proposal; manage validity | Cannot alter quote figures; proposal requires client approval gate |
| 7 | Brand & UX Agent | Design direction, design tokens, layout system from brand assets | Cannot publish or apply direction without client approval |
| 8 | Content Agent | Content structure, drafts, content model; reuse approved Xability content | Truthful content only; no fabricated claims/testimonials; client approval before publish |
| 9 | SEO & GEO Agent | Technical SEO plan, metadata, structured data, GEO readiness; ongoing monitoring | Never promises rankings/traffic/citations |
| 10 | Technical Build Orchestrator | Decompose approved scope into tasks with acceptance criteria, dependencies, budgets; create repo/branches | Cannot execute code changes itself; cannot skip validation stages |
| 11 | Coding Provider Agent | Execute one isolated task through a `CodingProvider` adapter on a task branch | Branch-scoped; budget-capped; output goes only to validation, never to production |
| 12 | Code Review Agent | Automated review of provider output vs acceptance criteria & standards | Cannot approve its own changes; cannot mark failed checks passed |
| 13 | QA Agent | Functional/integration/E2E test execution and verdicts | Cannot waive failing tests; failure → retry policy → escalation |
| 14 | Accessibility Agent | Accessibility checks against the project's declared level | Cannot lower the declared level |
| 15 | Security Agent | Dependency, secret-leak, and config security checks | Can block pipeline; cannot disable security controls |
| 16 | Performance Agent | Performance budgets and checks against target | Cannot waive budgets silently |
| 17 | Integration Agent | Configure/verify integrations (Pixel, GA4, GTM, Search Console, GBP, CRM, email, WhatsApp, maps, booking, payments, Xability) | Secrets by reference only; client confirmation for account-level connections |
| 18 | Deployment Agent | Staging/production deployments, rollbacks, deployment locks | Production deploy only with gate G5 satisfied (approval + final payment + validations green) |
| 19 | Domain & DNS Agent | Domain verification, DNS records, TLS | **Never transfers a domain without explicit client confirmation** |
| 20 | Analytics Agent | Analytics wiring, dashboards, data quality | Read/report only; no data sales/sharing beyond policy |
| 21 | Client Success Agent | Onboarding guidance, status explanations, reminders, reports, next-product recommendations, dissatisfaction detection | **Always identifies as AI**; no manipulative sales behavior; cannot approve on the client's behalf |
| 22 | Change Request Agent | Understand request → affected area → classification (included/overage/new scope) → estimate → acceptance criteria → approval if billable → isolated branch → provider → validation → preview → approval → deploy → record usage | Fair-usage limits enforced; billable work requires approval before execution |
| 23 | Website Operations Agent | Uptime/health monitoring, backups, routine maintenance, content ops | Cannot delete production resources; destructive ops require policy + confirmation |
| 24 | Billing & Usage Agent | Invoices, usage metering, overage calculation, subscription lifecycle | Prices only from config; **no silent billing changes**; refunds/credits above threshold escalate |
| 25 | Incident Response Agent | Detect incidents, open incident state, mitigate (rollback), communicate status | Mitigation limited to reversible actions; irreversible fixes require approval |
| 26 | Compliance & Audit Agent | Continuous policy conformance checks over the audit stream; retention rules; export/cancellation workflows | Read-only over other contexts; can freeze (flag) but not modify |

## Shared policies

- **Retry:** default max 2 retries with backoff for transient failures; never retry a failed
  *approval* or a *validation verdict*.
- **Timeout:** every run has a per-agent timeout; timeout → safe abort → audit event →
  escalation per the agent's escalation conditions.
- **Escalation targets:** another agent (e.g. QA → Incident Response), a client decision
  (approval request), or — exceptionally — a HorizonX platform operator queue. Escalation to
  humans is the exception path, not the normal flow.
- **Failure behavior:** fail safe and visible. No agent may fake success, fabricate a
  completed integration or deliverable, mark a failed test as passed, or bypass a required
  client approval. Failures produce audit events and leave the workflow in an explicit,
  recoverable state.
- **Audit:** every run emits `agent.run.started` / `agent.run.completed` / `agent.run.failed`
  / `agent.run.escalated` plus its declared domain events.
