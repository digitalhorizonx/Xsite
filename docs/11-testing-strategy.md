# 11 — Testing Strategy

## Platform (this repo)

| Layer | What | Tooling | Gate |
|---|---|---|---|
| Domain unit tests | Pricing engine (formula, guardrails, bundle logic, explanation, internal/client separation), scope engine (type detection, XApps routing), state machine (legal/illegal transitions, gate enforcement), change-request classification | Vitest in `@xsite/core` | CI-blocking from Phase 1 |
| Contract tests | API request/response shapes vs shared types; no internal-breakdown leakage in client serializers | Vitest + type-level tests | Phase 1.5 (with persistence) |
| Integration tests | API + Postgres (tenancy scoping, idempotency, audit emission) | Vitest + test DB | Phase 1.5/2 |
| E2E | Discovery → quote → approval → (simulated) payment journey in the portal | Playwright | Phase 2 |
| Security tests | AuthZ matrix (role × endpoint), tenant isolation attempts, secret-leak scans | CI checks | Phase 2 |

Golden rules: the pricing engine is pure and deterministic — every pricing change ships with
updated golden-quote fixtures; the state machine test enumerates the full transition matrix so
illegal transitions fail loudly; a dedicated test asserts client-facing quote serialization
contains no internal-breakdown fields.

## Client websites (delivery pipeline, Phase 2)

Every delivered website passes the pipeline stages as hard gates: automated code review,
static analysis, unit tests, integration tests, E2E tests, accessibility tests, security
checks, performance checks, SEO checks, staging smoke, production smoke. Verdicts are recorded
per task (`validation_result`); the QA Agent cannot waive failures, and no provider output
merges without green validation. Test plans are versioned artifacts generated per project from
acceptance criteria.
