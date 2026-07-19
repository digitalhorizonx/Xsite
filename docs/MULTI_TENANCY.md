# Multi-Tenancy

## Model

One user may belong to multiple organizations (`organization_memberships`, many-to-many between
`users` and `organizations`). Every tenant-owned row hangs off `organizationId` — directly
(`WebsiteProject`, `Subscription`, `Payment`, `AuditEvent`, `BusinessProfile`,
`EcosystemConnection`) or transitively through a project (`Quote`, `DiscoverySession`,
`ApprovalGate`, `ChangeRequest`, ...).

## Enforcement mechanism

`@xsite/db/tenancy.ts` exports `requireProjectInOrg(organizationId, projectId)` and
`requireQuoteInOrg(organizationId, quoteId)` — every repository function that accepts a
`projectId` or `quoteId` calls one of these **first**, before touching any other table. There is
no function anywhere in `@xsite/db` that queries a project-nested table by id alone.

- Project/quote exists but belongs to a different org → `TenantAccessError`.
- Project/quote doesn't exist at all → `NotFoundError`.

Both map to **HTTP 404** at the API boundary (`apps/web/src/lib/api-errors.ts`) — deliberately
not 403, because a 403 would itself confirm the resource exists in someone else's tenant.

At the HTTP layer, every `/api/v1/organizations/[organizationId]/...` route resolves
`organizationId` from the URL, then calls `resolveMembershipContext(organizationId)`
(`apps/web/src/lib/auth/request-context.ts`), which checks the caller's real, database-backed
membership row for that organization before any repository function runs. A client cannot widen
its access by sending a different `organizationId` in the body — every repository call uses the
`ctx.organization.id` resolved server-side, never a client-supplied value.

## Platform admin (cross-tenant) access

`users.isPlatformAdmin` is a separate, explicit flag. Every use of it is audited:
`requireProjectAsPlatformAdmin` (`@xsite/db/tenancy.ts`) writes a
`platform_admin.cross_tenant_access` audit event, including a required `reason`, before
returning the project. There is no implicit "admins see everything" code path — every
cross-tenant read goes through this one function and leaves a trail.

## Verified

- **Repository layer** (`packages/db/src/tenancy.test.ts`, 4 tests): cross-org project read
  rejected, cross-org quote read rejected (and confirms the client quote it does return has no
  internal-cost fields), nonexistent project returns `NotFoundError` not `TenantAccessError`,
  payment rows correctly scoped by `organizationId` at the query level.
- **HTTP API layer** (manual verification during this milestone, against the real running app
  and real Postgres): a second organization created through the actual `/api/v1/organizations`
  endpoint received `404` both reading (`GET .../quotes/latest`) and writing
  (`PUT .../discovery`) against the first organization's project, while the owning organization
  received `200` for the same reads. See the PR history / final report for the exact commands
  run and their output.
- **Payments** (`packages/db/src/repositories/payments.test.ts` — cross-tenant payment
  listing rejected).

## What isn't covered yet

- An automated HTTP-level test suite for `apps/web`'s API routes (the verification above was a
  manual curl walkthrough, not a committed test file) — `apps/web` currently has no test runner
  configured beyond the `@xsite/core`/`@xsite/db` suites. Adding one (likely Vitest against the
  route handler functions directly, avoiding the cost of spinning up a real HTTP server per test)
  is flagged as near-term follow-up work in `docs/PRODUCTION_CHECKLIST.md`.
