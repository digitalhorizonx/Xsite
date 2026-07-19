# Persistence

## Stack

PostgreSQL 16 via Prisma (`@xsite/db`). Chosen per `docs/02-architecture.md`'s original stack
decision — no deviation.

## Local setup

```bash
# 1. Postgres running locally (adjust to your OS/package manager)
sudo pg_ctlcluster 16 main start   # or: brew services start postgresql@16 / docker run postgres:16

# 2. Create the two databases this repo expects
createdb xsite_dev
createdb xsite_test

# 3. From the repo root
pnpm install                       # runs packages/db's postinstall → prisma generate
pnpm db:migrate:deploy             # applies migrations to $DATABASE_URL (defaults to xsite_dev
                                    # per packages/db/.env, which you create from the template
                                    # below — this file is gitignored)
pnpm db:seed                       # loads demo/dev fixtures — guarded against production
```

Create `packages/db/.env` (gitignored) with:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/xsite_dev"
```

## Migrations

Two migrations exist so far:

1. `20260718232401_init` — the full schema (users, organizations, memberships, business
   profiles, ecosystem/Xability connections, website projects, discovery, scope calculations,
   quotes + line items, the internal cost breakdown, proposal approvals, approval gates,
   workflow transitions, change requests, audit events, subscriptions, payments, payment
   attempts, webhook events).
2. `20260718232453_quote_full_fidelity` — adds `configVersion` and `thirdPartyCosts` to `Quote`
   so a persisted quote reproduces the exact `ClientQuote` object the pricing engine produced,
   not just its numeric fields.

Run `pnpm db:migrate:status` to check for drift between the schema and what's applied. CI runs
`prisma migrate deploy` (validates every migration applies cleanly from an empty database) and
`prisma migrate status` on every push — this has been the actual CI gate since this milestone,
not just a plan.

## Seed data

`packages/db/prisma/seed.ts` creates one demo organization ("Al Noor Consulting (Demo)"), its
owner user, a business profile, an Xability connection, one project, and a real quote calculated
by the actual pricing engine (not a hand-typed fixture). It refuses to run against a database
where `NODE_ENV=production` unless `FORCE_SEED=1` is explicitly set — seeding a live production
database is something a human must opt into deliberately, never a default.

## Transaction boundaries

Every multi-row write (`createOrganization`, `createProject`, `saveDiscovery`, `persistQuote`,
`recordApprovalDecision`, `transitionProject`, `createPaymentCheckout`'s status update,
`recordAndApplyPaymentWebhook`) runs inside `prisma.$transaction`. A real bug was caught and
fixed during this work: audit-event inserts inside a transaction were using the top-level Prisma
client instead of the transaction's client, causing a foreign-key race against rows not yet
committed by that same transaction — every repository function now threads the transaction
client through explicitly (see `appendAuditEvent`'s `client` parameter).

## Client quote / internal cost breakdown separation

`Quote` and `InternalCostBreakdown` are separate tables. `getClientQuote`/`getLatestClientQuote`
(`@xsite/db/repositories/quotes.ts`) query only `Quote` + `QuoteLineItem` — there is no code path
in those functions that can reach `InternalCostBreakdown`. The internal breakdown is read only
via `@xsite/db/repositories/internal-only.ts`, which is **not** re-exported from the package's
main entry point and has no subpath export in `package.json`, so it is structurally unreachable
from `apps/web` (Node's module resolution simply can't find it) until a future internal
reporting service explicitly adds a subpath export for it.

## Immutable audit log

`AuditEvent` rows are insert-only — `@xsite/db` exports no update or delete function for this
table. Every mutation across the domain (org/project creation, discovery updates, quote
generation, approvals, transitions, payment checkout/webhook events) appends one, with payloads
passed through `@xsite/core`'s `redactPayload()` first.
