# Production Checklist

Status as of the Phase 1.5 production-readiness milestone. `✅` = done and verified in this
session; `⏳` = code complete, blocked on an external account/credential; `◻` = not started.

## Code & CI

- ✅ 87/87 automated tests passing (72 `@xsite/core` unit tests, 15 `@xsite/db` integration tests
  against a real Postgres instance)
- ✅ Typecheck clean across all three packages
- ✅ Lint clean (ESLint flat config, typescript-eslint recommended)
- ✅ Production build (`next build`) succeeds
- ✅ CI runs all of the above plus Prisma schema validation and migration deploy/status against a
  real `postgres:16` service container, on every push/PR
- ◻ Automated HTTP-level tests for `apps/web`'s API routes (currently verified manually via
  curl against a running instance — see `docs/MULTI_TENANCY.md` for the exact commands/results)

## Database

- ✅ Schema covers every entity this milestone required, with two real migrations
- ✅ Migrations verified to apply cleanly from an empty database (CI does this on every run)
- ✅ Seed script exists, is guarded against running on `NODE_ENV=production` without `FORCE_SEED=1`
- ⏳ **Production Postgres instance not yet provisioned** — `DATABASE_URL` must point at a real
  instance (Vercel Postgres, Neon, Supabase, or HorizonX-managed) before deploying

## Authentication

- ✅ Clerk architecture fully implemented (middleware, webhook sync, session resolution, roles,
  sign-in/up pages, protected routes) — see `docs/AUTHENTICATION.md`
- ⏳ **No Clerk application exists yet** — 5 manual dashboard steps required (documented in
  `docs/AUTHENTICATION.md`) before real sign-in works; until then the app runs in the
  demo-mode bypass, which is structurally blocked from reaching production
  (`requireProductionEnv()`)

## Payments

- ✅ Provider-independent architecture, mock provider, real PayTabs adapter (signature
  verification, checkout, refund) — see `docs/PAYMENTS.md`
- ✅ Webhook-authoritative status changes, idempotent duplicate handling — verified live
- ⏳ **No PayTabs merchant account exists yet** — the adapter fails closed
  (`PayTabsNotActivatedError`) until `PAYTABS_PROFILE_ID`/`PAYTABS_SERVER_KEY` are set; see the
  6-step activation checklist in `docs/PAYMENTS.md`
- ◻ **Recurring billing (subscriptions) is not implemented** — only one-off payments (deposit,
  final, overage) work today. The monthly XSite subscription has no live auto-renewal path yet;
  this is the top priority for the next payments milestone
- ◻ Real merchant-provided refund/dispute handling has not been exercised against a live sandbox

## Deployment

- ✅ `apps/web/vercel.json` and monorepo build configuration written and verified locally against
  the exact command sequence Vercel will run
- ✅ `/api/health` readiness endpoint
- ◻ **No Vercel project exists yet** — creating it, connecting the repo, and setting environment
  variables are manual steps (see `docs/DEPLOYMENT.md`)
- ◻ Custom domain `xsite-app.horizonx.site` not yet pointed at Vercel

## Multi-tenancy & security

- ✅ Org-scoped repository layer with no bare-id lookups anywhere in `@xsite/db`
- ✅ Cross-tenant access verified rejected at both the repository layer (automated tests) and the
  HTTP API layer (manual verification)
- ✅ Platform-admin cross-tenant access is a separate, always-audited path
- ✅ Client quote / internal cost breakdown physically separated (different tables, different
  module boundaries, verified no leakage in both tests and a live API response)
- ◻ No third-party security scan / penetration test has been run against this codebase

## Portal UI

- ⏳ The portal's rendered pages (`/`, `/projects`, `/projects/[id]`, `/organization`, etc.) still
  render the Phase 1 static demo fixtures (`apps/web/src/lib/demo-data.ts`). The persisted
  `/api/v1/...` API layer built in this milestone is real, tested, and verified working, but the
  pages have **not yet been rewired to call it** — that UI-layer reconnection (making each page a
  server component that fetches from the new API using the resolved membership context) is the
  next concrete task, not something this milestone claims to have finished.

## Rollback

- Platform (this repo/Vercel): standard Vercel immutable-deployment rollback (promote a previous
  deployment) — available once the Vercel project exists.
- Database: no destructive migration has been written; rolling back a migration would use
  Prisma's standard down-migration process (not yet needed).

## Confirmation

No fake production capability was introduced. Every "done" item above was either automatedly
tested (87 tests) or manually verified against a real, running instance with real Postgres and
inspected output (documented in the commit history and this milestone's final report). Every
item requiring an external account (Vercel, Clerk, PayTabs) is explicitly marked `⏳` with the
exact manual steps to complete it, not silently assumed or faked.
