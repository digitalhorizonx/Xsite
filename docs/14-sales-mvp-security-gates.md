# Sales MVP — Security, Privacy & Cost Gates

Every stage must pass its gate before production promotion.

## Gate S1 — Public intake
- Server-side validation and length limits.
- Honeypot and request-rate limiting before database work.
- No LLM/API call on form submission.
- No database/service-role credentials in browser bundles.
- Generic public errors; server logs do not print submitted PII.

## Gate S2 — Persistence
- Supabase/Postgres tables use RLS.
- No anonymous or authenticated browser policies in MVP.
- Service-role key is server-only and named without `NEXT_PUBLIC_`.
- Referential integrity and enum/check constraints enforced in SQL.
- Sales activity table provides an audit boundary.

## Gate S3 — Internal sales access
- `/sales` requires an HttpOnly signed session cookie.
- Session is SameSite=Strict and Secure in production.
- Login attempts are rate limited.
- Password comparison is timing-safe.
- API endpoints independently verify the cookie signature and expiry; middleware alone is not trusted.

## Gate S4 — AI / paid APIs
- Deterministic scoring, pricing ranges and solution templates are the default path (zero paid calls).
- LLM is opt-in only for high-value generative tasks such as refining a qualified solution/proposal.
- Never send API keys, internal credentials, payment data, or unnecessary customer PII to an LLM.
- Cache reusable AI output by input fingerprint before enabling any provider.
- Enforce per-action and per-day spend budgets before provider activation.

## Gate S5 — Payments
- MVP tracks receivables but never stores card data.
- Future gateway integrations must use hosted/tokenized checkout.
- Payment webhook signatures must be verified server-side and idempotently processed.

## Gate S6 — Production
- Secrets configured only in deployment environment.
- Database migration applied before application promotion.
- Typecheck, tests and production build pass.
- Smoke test public intake, admin auth, pipeline mutation, deal creation and payment collection.
- Scan runtime logs for errors without exposing PII.

## Layer boundaries
1. `app/*` — presentation and route handlers.
2. `lib/server/*` — auth, persistence, security infrastructure.
3. `lib/sales-intelligence.ts` — deterministic domain intelligence; no network dependency.
4. `lib/sales-types.ts` — domain contracts.
5. `supabase/migrations/*` — persistence schema and database security.

External providers (LLM, WhatsApp, search/lead providers, payments) must be adapters behind these boundaries, never imported directly into UI components.
