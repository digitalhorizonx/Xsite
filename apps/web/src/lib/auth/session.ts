import 'server-only';
import type { MembershipContext } from '@xsite/core';
import { getMembership, prisma, requireMembership } from '@xsite/db';
import { isClerkConfigured } from './config';

/**
 * Resolves the authenticated MembershipContext for the current request,
 * server-side, from the verified Clerk session — never from a client-
 * supplied header or body field. `organizationId` is OUR OWN
 * organizations.id (e.g. from the route path); this function does not infer
 * it from Clerk's own active-organization state, because our `organizations`
 * rows are keyed by slug via the sync webhook and are not (yet) cross-
 * referenced to Clerk's internal org id — inferring one from the other here
 * would be a guess, not a verified fact.
 *
 * Returns null when there is no authenticated user (signed out, or Clerk not
 * configured in this environment) or the user has no membership in the
 * requested organization; callers MUST treat null as "no access", not as
 * "authenticated as nobody".
 */
export async function getMembershipContext(organizationId: string): Promise<MembershipContext | null> {
  if (!isClerkConfigured()) {
    // No Clerk keys configured in this environment — the portal runs
    // unauthenticated (Phase 1 demo behavior). Production startup refuses to
    // boot in this state (see requireProductionEnv in src/lib/env.ts).
    return null;
  }

  const { auth } = await import('@clerk/nextjs/server');
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return null;

  const user = await prisma.user.findUnique({ where: { authSubject: clerkUserId } });
  if (!user) return null; // Clerk session exists but the sync webhook hasn't landed yet — treat as unauthenticated, never guess.

  const membership = await getMembership(user.id, organizationId);
  if (!membership) return null;

  const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!organization) return null;

  return {
    user: { id: user.id, email: user.email, name: user.name ?? undefined, isPlatformAdmin: user.isPlatformAdmin },
    organization: { id: organization.id, name: organization.name, slug: organization.slug },
    role: membership.role,
  };
}

/** Throws UnauthenticatedError — use in API routes that require a signed-in member of `organizationId`. */
export async function requireMembershipContext(organizationId: string): Promise<MembershipContext> {
  const ctx = await getMembershipContext(organizationId);
  if (!ctx) {
    const { UnauthenticatedError } = await import('@xsite/core');
    throw new UnauthenticatedError();
  }
  // Re-validates directly against the DB — defense in depth beyond the ctx already resolved above.
  await requireMembership(ctx.user.id, organizationId);
  return ctx;
}
