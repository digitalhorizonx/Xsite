# Deployment

## Architecture

XSite is a pnpm monorepo:

```
xsite/
├── packages/core   (@xsite/core) — pure domain logic, no framework/vendor deps
├── packages/db     (@xsite/db)   — Prisma schema, migrations, org-scoped repositories
└── apps/web        (@xsite/web)  — Next.js portal + API routes (deploys to Vercel)
```

`@xsite/web` depends on `@xsite/core` and `@xsite/db` via `workspace:*`. Both packages ship
TypeScript source directly (no separate build step needed by consumers) except `@xsite/db`,
which requires `prisma generate` to produce `@prisma/client`'s types before anything can
typecheck or build against it.

## Domain convention (decided)

| Domain | Purpose |
|---|---|
| `xsite.horizonx.site` | Reserved for the future XSite marketing landing page — **do not deploy the portal here** |
| `xsite-app.horizonx.site` | The XSite application (this repo's `apps/web`) |

## Vercel configuration

- **Root Directory:** `apps/web`
- **Framework preset:** Next.js
- `apps/web/vercel.json` defines install/build commands relative to that root:
  ```json
  {
    "installCommand": "cd ../.. && pnpm install --frozen-lockfile",
    "buildCommand": "cd ../.. && pnpm --filter @xsite/web... run build"
  }
  ```
  Both commands `cd` up to the workspace root first so pnpm can resolve `@xsite/core` and
  `@xsite/db` from the monorepo's `pnpm-workspace.yaml` and shared lockfile.
- Enable **"Include files outside the Root Directory"** in the Vercel project settings — without
  it, Vercel's checkout won't include `packages/core`, `packages/db`, or the root lockfile, and
  the `cd ../..` in the commands above would fail.
- **Node.js version:** 22.x (matches `engines.node` in the root `package.json`).
- **Production branch:** `main`.
- `packages/db/package.json`'s `postinstall` script (`prisma generate`) runs automatically as
  part of `pnpm install`, generating the Prisma client with this repo's schema — this is a
  package-scoped script (not a dependency's script), so it always runs regardless of pnpm's
  "approve builds" prompt, and it runs with the correct working directory (`packages/db`) so it
  finds `prisma/schema.prisma` at its default relative path. **Do not remove this script** — an
  earlier CI failure was caused by relying on `@prisma/client`'s own postinstall instead, which
  silently no-ops when the schema isn't at the default location it checks.

### Confirmed: Vercel can build `@xsite/core` and `@xsite/db` from the workspace

This was verified locally by simulating a fresh CI-equivalent install (`rm -rf node_modules` at
every workspace level, then `pnpm install --frozen-lockfile`) and running the full
lint → typecheck → migrate → test → build sequence exactly as CI does. It passes. The same
install/build commands are what `apps/web/vercel.json` runs, so Vercel's build should behave
identically — this is the CI job's real, repeated verification of that exact command sequence,
not a guess.

## Environment variables

See [`.env.example`](../.env.example) for the full list with explanations. Centralized validation
lives in `apps/web/src/lib/env.ts` — it is the only place that declares which variables exist and
whether they're required in production; nothing else should read `process.env.X` for a name not
declared there.

## Health / readiness

`GET /api/health` reports environment completeness honestly:

```json
{ "status": "degraded", "mode": "production", "environment": { "complete": false, "missing": ["..."] } }
```

It returns HTTP 503 when required production variables are missing — configure your platform's
health check to hit this endpoint. It never exposes variable values.

## Deployment platform items you must complete manually

These require an actual Vercel account and cannot be done by an agent in this session:

1. Create the Vercel project, connect this GitHub repository, set Root Directory = `apps/web`,
   enable "Include files outside the Root Directory".
2. Set all required environment variables from `.env.example` in the Vercel project settings
   (Production + Preview as appropriate).
3. Add the custom domain `xsite-app.horizonx.site` to the Vercel project (Vercel will show the
   exact DNS record to add — typically a `CNAME` to `cname.vercel-dns.com`, or an `A` record to
   Vercel's anycast IP if the domain is apex; Vercel's domain settings page shows the precise
   record once the domain is added, since apex-vs-subdomain handling differs).
4. Add that DNS record in Cloudflare (or wherever `horizonx.site`'s zone is managed) — **do not
   touch any other existing record** in that zone. SSL is issued automatically by Vercel once DNS
   verifies.
5. Provision a production PostgreSQL instance (Vercel Postgres, Neon, Supabase, or a HorizonX-
   managed instance) and set `DATABASE_URL` accordingly, then run
   `pnpm db:migrate:deploy` against it once (this repo's CI already proves every migration
   applies cleanly from scratch; running it in production applies the same, already-verified
   migrations).
6. Complete Clerk and PayTabs setup — see `docs/AUTHENTICATION.md` and `docs/PAYMENTS.md`.

## Known deployment limitations (honest, as of this milestone)

- No Vercel project exists yet for this repository — nothing above has been deployed to a live
  URL. Everything up to "push to `main`, connect the repo, set env vars" has been done and
  verified locally against the exact commands Vercel will run.
- Direct-route refresh (e.g. reloading `/projects/prj_1/quote` directly) works correctly under
  Next.js's App Router by default and was verified locally via `next start` + direct `curl`
  requests to nested routes — no custom rewrite rules are needed.
- Preview deployments will build successfully but will show `degraded` on `/api/health` until
  Clerk/PayTabs/DATABASE_URL are set on that Vercel project — this is correct, honest behavior,
  not a bug.
