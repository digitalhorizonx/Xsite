# Authentication

## Provider: Clerk

Clerk was chosen because it's already used elsewhere in the HorizonX ecosystem (per
`docs/13-risks-assumptions-decisions.md`), has first-class Next.js middleware support, and
includes Organizations as a built-in primitive.

## Architecture — auth vendor never touches the domain layer

```
@xsite/core/auth/types.ts      ← framework/vendor-agnostic: AuthenticatedUser,
                                  AuthenticatedOrganization, MembershipContext, MembershipRole,
                                  roleAtLeast(), requireRole(), UnauthenticatedError, ForbiddenError
apps/web/src/lib/auth/
  config.ts                    ← isClerkConfigured(): are real Clerk keys present?
  session.ts                   ← getMembershipContext()/requireMembershipContext(): resolves the
                                  verified Clerk session into our own users/organizations/
                                  organization_memberships rows (never trusts a client-supplied
                                  organizationId or role)
  request-context.ts           ← resolveMembershipContext(): adds a demo-mode bypass for local
                                  dev (see below) on top of session.ts
apps/web/middleware.ts          ← Clerk middleware; no-op pass-through when Clerk isn't configured
apps/web/src/app/api/webhooks/clerk/route.ts
                                ← svix-verified sync of Clerk user/org/membership events into
                                  @xsite/db
```

`@xsite/core` never imports `@clerk/nextjs` — only `apps/web` does. This keeps the domain
package portable to a different auth vendor later without touching pricing/scope/workflow code.

## Roles

| Role | Scope |
|---|---|
| `owner` | Full control of one organization |
| `admin` | Manage the organization short of ownership transfer |
| `member` | Standard client-side collaborator |
| `viewer` | Read-only |
| Platform admin (`users.isPlatformAdmin`) | Cross-organization access — every use is audited via `platform_admin.cross_tenant_access` (see `@xsite/db/tenancy.ts`) |

`requireRole(ctx, minimum)` (in `@xsite/core`) is the single place role comparisons happen.
Authorization is always resolved server-side from the verified session
(`getMembershipContext`/`requireMembershipContext`) — the UI hides buttons for roles that
can't use them, but that is UX polish, never the actual enforcement boundary. Every API route
that touches organization-scoped data calls `resolveMembershipContext(organizationId)` (or the
stricter `requireMembershipContext`) before doing anything else.

## Demo-mode bypass (development only)

Until a Clerk application exists, `resolveMembershipContext` (used by every `/api/v1/organizations/...`
route) falls back to resolving against a **real** membership row already in the database — no
identity is fabricated, the fallback just skips the "verify a Clerk session" step. This bypass is:

- Gated by `isDemoMode()` (`apps/web/src/lib/env.ts`), which is `false` whenever
  `NODE_ENV === 'production'` unless `DEMO_MODE=1` is explicitly (and wrongly) forced.
- Structurally blocked in a real production deployment anyway: `requireProductionEnv()` fails
  startup if `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` /
  `CLERK_WEBHOOK_SECRET` are unset, which they necessarily are until Clerk is configured.

This was verified end-to-end (see the PR description / final report): creating an organization,
project, discovery session, quote, approval, and workflow transition all through the real HTTP
API in this bypassed mode, then confirming a second organization gets a 404 trying to read or
write the first organization's data.

## What's implemented vs. what needs a Clerk account

**Implemented (real code, verified where it doesn't need live Clerk keys):**
sign-up/sign-in pages, protected middleware, protected API routes via
`resolveMembershipContext`/`requireMembershipContext`, `/unauthorized` page, webhook route with
real svix signature verification, idempotent user/org/membership sync, role model and
server-side enforcement.

**Requires a Clerk account (manual step — cannot be done in this session):**
1. Create a Clerk application at <https://dashboard.clerk.com>.
2. Enable **Organizations** in that application's settings.
3. Copy `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` into the deployment's
   environment variables.
4. In the Clerk application's **Webhooks** page, add an endpoint pointing at
   `https://xsite-app.horizonx.site/api/webhooks/clerk`, subscribe to `user.created`,
   `user.updated`, `organization.created`, `organization.updated`, and
   `organizationMembership.created`, then copy the resulting **Signing Secret** into
   `CLERK_WEBHOOK_SECRET`.
5. In Clerk's **Paths**/**Redirects** settings, set the allowed origins/redirect URLs to
   `https://xsite-app.horizonx.site` (and `http://localhost:3000` for local development).

Once those five steps are done, `isClerkConfigured()` flips to true automatically (it's a pure
function of the two key environment variables) and the app switches from demo mode to real
authentication with no code changes required.

## Known limitations

- Invitation flows (inviting a teammate into an existing organization) rely on Clerk's own
  Organization invitation UI/API — not yet wired into a custom XSite screen; Clerk's default
  flow works today, a branded flow is future work.
- The webhook sync assumes Clerk's default event payload shape; if HorizonX customizes Clerk's
  organization role names beyond the default admin/basic_member split, `organizationMembership.created`'s
  role-mapping heuristic in the webhook route will need updating.
