# 07 — Provider Abstraction (Tool Gateway)

**Implementation:** `packages/core/src/providers/` (typed adapter interfaces, selection policy,
registry types).

## Principle

XSite orchestrates external tools — coding agents, reasoning models, content models,
design/image generation, repositories, CI/CD, hosting, DNS, analytics, SEO, error monitoring,
performance monitoring, payments, email, messaging — as **replaceable execution engines**
behind a provider-independent gateway. Provider-specific logic never leaks into the core
domain: the domain requests capabilities (`CodingProvider.executeTask`), never vendors.
Initial coding providers are Claude Code and OpenAI Codex; both are internal implementation
details, invisible to clients, and removable without workflow changes.

## Adapter interfaces

| Interface | Capability |
|---|---|
| `CodingProvider` | Execute an isolated, branch-scoped coding task against acceptance criteria within cost/time budgets |
| `ReasoningProvider` | Structured analysis/synthesis (scope inference, decomposition support) |
| `ContentProvider` | Draft content against a content model and brand voice |
| `DesignProvider` | Design direction candidates, tokens, imagery |
| `RepositoryProvider` | Repos, branches, PRs, merges |
| `CiProvider` | Pipeline runs and check results |
| `DeploymentProvider` | Deploy/rollback per environment |
| `HostingProvider` | Runtime infrastructure profiles |
| `DnsProvider` | DNS records, verification, TLS |
| `AnalyticsProvider` | Analytics property setup and reads |
| `SeoProvider` | Crawls, index status, checks |
| `MonitoringProvider` | Uptime/error/performance signals |
| `PaymentProvider` | Charges, invoices, refunds (policy-gated) |
| `EmailProvider` / `MessagingProvider` | Client notifications |

Every adapter method takes a typed request containing `taskRef`, `budget`, `timeout`,
`securityClassification`, and returns a typed result with `status`, `artifacts`, `cost`,
`diagnostics`. Results are **validated** (schema + acceptance checks) before any downstream
use — raw provider output is never trusted, never merged, never deployed directly.

## Selection policy

`selectProvider(candidates, criteria)` scores registered providers on: task type fit, project
stack fit, complexity fit, cost, availability, context-size capacity, security classification
clearance, historical performance (from `ProviderPerformance`), latency, quality score, and
remaining budget. Weights are configuration. Selection decisions are audited (which provider,
why, score breakdown) so routing stays explainable.

## Resilience & governance

- **Fallback:** on hard failure of the selected provider, the next-ranked candidate takes the
  task (fresh branch, same acceptance criteria).
- **Retry:** bounded per-task retry with backoff (config), counted on the task record.
- **Circuit breaker:** consecutive failures open the breaker for a provider; it leaves the
  candidate pool until a probe succeeds.
- **Budgets & limits:** per-task, per-project, per-organization, and per-provider spend caps
  (`BudgetLimit`); execution halts (never overruns) at the cap and escalates. "Purchase
  unlimited provider usage" is impossible by construction.
- **Prompt & artifact versioning:** every prompt template and produced artifact is versioned;
  executions record the versions used.
- **Performance records:** every execution feeds `ProviderExecution` →
  `ProviderPerformance` roll-ups, which feed future selection.
- **Isolation:** providers run with least-privilege, task-scoped credentials (single repo,
  single branch); no provider sees platform secrets, other tenants, or client billing data.
