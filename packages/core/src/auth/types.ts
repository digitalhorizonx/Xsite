/**
 * Framework-agnostic authentication/authorization vocabulary.
 *
 * These types describe the shape of an authenticated request regardless of
 * which identity provider produced it (Clerk today; anything else later).
 * The concrete provider adapter (Clerk SDK calls, middleware, webhook
 * verification) lives in apps/web, which is allowed to depend on a specific
 * framework/vendor — @xsite/core never imports an auth vendor package.
 */

export type PlatformRole = 'platform_admin' | 'org_user';

export type MembershipRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface AuthenticatedUser {
  /** Our own users.id (never the raw provider subject beyond this mapping). */
  id: string;
  email: string;
  name?: string;
  isPlatformAdmin: boolean;
}

export interface AuthenticatedOrganization {
  id: string;
  name: string;
  slug: string;
}

/** The full authorization context resolved for one request. */
export interface MembershipContext {
  user: AuthenticatedUser;
  organization: AuthenticatedOrganization;
  role: MembershipRole;
}

const ROLE_ORDER: MembershipRole[] = ['viewer', 'member', 'admin', 'owner'];

export function roleAtLeast(role: MembershipRole, minimum: MembershipRole): boolean {
  return ROLE_ORDER.indexOf(role) >= ROLE_ORDER.indexOf(minimum);
}

export class UnauthenticatedError extends Error {
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'UnauthenticatedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Insufficient permissions for this action') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/**
 * Server-side authorization check. Never trust a client-supplied role or
 * organizationId — always resolve MembershipContext from the verified
 * session on the server (see apps/web/src/lib/auth/session.ts) and check
 * against it here. UI hiding of a button is not a substitute for this.
 */
export function requireRole(ctx: MembershipContext | null, minimum: MembershipRole): MembershipContext {
  if (!ctx) throw new UnauthenticatedError();
  if (!ctx.user.isPlatformAdmin && !roleAtLeast(ctx.role, minimum)) {
    throw new ForbiddenError(`Requires role '${minimum}' or higher; caller has '${ctx.role}'`);
  }
  return ctx;
}
