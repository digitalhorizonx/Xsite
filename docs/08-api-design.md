# 08 — API Design

## Boundary

A **versioned, typed REST API** under `/api/v1`, mirroring bounded contexts. Phase 1 serves it
from Next.js route handlers backed by `@xsite/core` and demo repositories; the same contract is
extractable to a standalone service without client changes. All request/response shapes are
typed in `@xsite/core` and shared by server and portal — no duplicated DTOs.

Conventions: JSON; auth via session token (auth-provider-agnostic); every request resolves an
`organizationId` scope server-side (never trusted from the body); errors are
`{ error: { code, message, details? } }`; mutations are idempotent where retried (idempotency
keys on payments and approvals); list endpoints paginate.

## Resource map (Phase 1 surface)

| Area | Endpoints | Notes |
|---|---|---|
| Session | `GET /me` | User + memberships |
| Organizations | `GET/PATCH /organizations/:id` · `GET .../business-profile` · `PUT .../business-profile` | |
| Ecosystem | `GET /organizations/:id/connections` · `POST .../connections/xability/import` | Import only approved data; audited |
| Projects | `GET/POST /projects` · `GET /projects/:id` · `POST /projects/:id/transition` | Transition validates against the state machine + gates |
| Discovery | `GET/PUT /projects/:id/discovery` · `GET .../discovery/missing` | |
| Scope | `GET /projects/:id/scope` · `PUT .../scope` | Structured scope variables |
| Quotes | `POST /projects/:id/quotes` (calculate) · `GET .../quotes/latest` | Client-facing quote only; internal breakdown is **not** served by any client API |
| Proposals & approvals | `POST /projects/:id/approvals/:gate` · `GET /projects/:id/approvals` | Gate decisions (approve / request changes) |
| Payments | `POST /projects/:id/payments/:kind` | **Simulated** in Phase 1 (mock boundary, clearly labeled) |
| Artifacts | `GET /projects/:id/artifacts` · `GET /artifacts/:id` | Versioned, immutable |
| Tasks | `GET /projects/:id/tasks` | Read-only in Phase 1 |
| Agents | `GET /agents` · `GET /projects/:id/agent-runs` | Catalog + run history |
| Change requests | `GET/POST /projects/:id/change-requests` | Classification via engine; G7 approval for billable |
| Integrations | `GET /projects/:id/integrations` · `POST .../integrations/:category/connect` | Secrets never in responses |
| Billing | `GET /organizations/:id/subscriptions` · `GET .../invoices` · `GET .../usage` | |
| Reports & audit | `GET /projects/:id/reports` · `GET /projects/:id/audit` · `GET /organizations/:id/audit` | Audit is read-only, immutable |

## Later phases

Phase 2 adds task orchestration webhooks (provider callbacks with signature verification,
`processing_attempt` dedup), repository/deployment events, and preview URLs. Phase 3 adds
monitoring ingestion, incident endpoints, and report generation. Internal agent-to-agent
communication is **not** HTTP between microservices in early phases — it is the in-process
workflow engine consuming typed artifacts; the API above is the client/portal boundary.
