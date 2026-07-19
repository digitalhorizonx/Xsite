import { prisma } from '../client';
import { appendAuditEvent } from './audit';
// Re-exported so callers can `import { roleAtLeast } from '@xsite/db'` without
// also depending on @xsite/core directly. The role hierarchy is defined ONCE,
// in @xsite/core/auth/types.ts — Prisma's generated MembershipRole enum uses
// the identical string literals ('owner'|'admin'|'member'|'viewer'), so it is
// structurally assignable without a cast.
export { roleAtLeast } from '@xsite/core';

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  country?: string;
  defaultLocale?: string;
  /** The user creating the organization becomes its owner. */
  ownerUserId: string;
}

export async function createOrganization(input: CreateOrganizationInput) {
  return prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name: input.name,
        slug: input.slug,
        ...(input.country !== undefined ? { country: input.country } : {}),
        ...(input.defaultLocale !== undefined ? { defaultLocale: input.defaultLocale } : {}),
      },
    });
    await tx.organizationMembership.create({
      data: { userId: input.ownerUserId, organizationId: organization.id, role: 'owner' },
    });
    await appendAuditEvent(
      {
        actor: { kind: 'user', id: input.ownerUserId },
        organizationId: organization.id,
        action: 'organization.created',
        subject: `organization:${organization.id}`,
        payload: { name: organization.name },
      },
      tx,
    );
    return organization;
  });
}

/** Every organization a user belongs to, with their role in each. */
export async function listOrganizationsForUser(userId: string) {
  const memberships = await prisma.organizationMembership.findMany({
    where: { userId },
    include: { organization: true },
    orderBy: { createdAt: 'asc' },
  });
  return memberships.map((m) => ({ organization: m.organization, role: m.role }));
}

/**
 * The membership row IS the authorization check: if this returns null, the
 * user has no standing in the organization and the caller must reject the
 * request (typically as 404, not 403, to avoid confirming the org exists).
 */
export async function getMembership(userId: string, organizationId: string) {
  return prisma.organizationMembership.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
  });
}

export async function requireMembership(userId: string, organizationId: string) {
  const membership = await getMembership(userId, organizationId);
  if (!membership) {
    throw new Error(`User ${userId} has no membership in organization ${organizationId}`);
  }
  return membership;
}

export async function upsertBusinessProfile(
  organizationId: string,
  data: { legalName: string; industry?: string; description?: string; languages?: string[] },
) {
  return prisma.businessProfile.upsert({
    where: { organizationId },
    create: { organizationId, ...data },
    update: data,
  });
}
