import 'server-only';
import type { MembershipContext } from '@xsite/core';
import { UnauthenticatedError } from '@xsite/core';
import { prisma } from '@xsite/db';
import { isDemoMode } from '@/lib/env';
import { requireMembershipContext } from './session';

/**
 * Resolves the request's MembershipContext for `organizationId`, with a
 * demo-mode bypass for local development and the seeded demo org — NEVER
 * reachable in production. `isDemoMode()` (src/lib/env.ts) is hardwired to
 * false whenever NODE_ENV === 'production' unless DEMO_MODE=1 is forced,
 * and production startup already refuses to boot without real Clerk keys
 * (requireProductionEnv) — so this bypass cannot silently ship live.
 *
 * The bypass still resolves against a REAL row in the database (the
 * organization's actual owner membership) rather than fabricating an
 * identity, so persisted data created through it is exactly as
 * tenant-scoped and auditable as an authenticated request would produce.
 */
export async function resolveMembershipContext(organizationId: string): Promise<MembershipContext> {
  if (!isDemoMode()) {
    return requireMembershipContext(organizationId);
  }

  const membership = await prisma.organizationMembership.findFirst({
    where: { organizationId },
    orderBy: { createdAt: 'asc' }, // the earliest membership is the org's original owner
    include: { user: true, organization: true },
  });
  if (!membership) {
    throw new UnauthenticatedError(`No membership found for organization ${organizationId} (demo mode)`);
  }

  return {
    user: {
      id: membership.user.id,
      email: membership.user.email,
      ...(membership.user.name ? { name: membership.user.name } : {}),
      isPlatformAdmin: membership.user.isPlatformAdmin,
    },
    organization: {
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
    },
    role: membership.role,
  };
}
