import { prisma } from './client';

/**
 * Server-side tenant scoping.
 *
 * This is the ONLY sanctioned way to check whether a project (and therefore
 * everything nested under it — discovery, scope, quotes, approvals, change
 * requests, payments) belongs to the calling organization. Every repository
 * function that takes a projectId funnels through `requireProjectInOrg`
 * first. There is no code path in this package that queries a
 * project-nested table by id alone, without an organizationId check — see
 * docs/MULTI_TENANCY.md.
 */
export class TenantAccessError extends Error {
  constructor(message = 'Resource does not belong to the requesting organization') {
    super(message);
    this.name = 'TenantAccessError';
  }
}

export class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

/**
 * Throws NotFoundError if the project doesn't exist, TenantAccessError if it
 * exists but belongs to a different organization. Never distinguishes the two
 * to the caller via status code beyond this (both should surface as 404 at
 * the API boundary) — this prevents leaking existence of other orgs' data.
 */
export async function requireProjectInOrg(organizationId: string, projectId: string) {
  const project = await prisma.websiteProject.findUnique({ where: { id: projectId } });
  if (!project) throw new NotFoundError(`Project ${projectId} not found`);
  if (project.organizationId !== organizationId) {
    throw new TenantAccessError(
      `Project ${projectId} does not belong to organization ${organizationId}`,
    );
  }
  return project;
}

export async function requireQuoteInOrg(organizationId: string, quoteId: string) {
  const quote = await prisma.quote.findUnique({ where: { id: quoteId }, include: { project: true } });
  if (!quote) throw new NotFoundError(`Quote ${quoteId} not found`);
  if (quote.project.organizationId !== organizationId) {
    throw new TenantAccessError(`Quote ${quoteId} does not belong to organization ${organizationId}`);
  }
  return quote;
}

/** Platform-admin cross-tenant access is a distinct, always-audited path. */
export interface PlatformAdminAccessContext {
  isPlatformAdmin: true;
  actorUserId: string;
  reason: string;
}

export async function requireProjectAsPlatformAdmin(
  ctx: PlatformAdminAccessContext,
  projectId: string,
) {
  const project = await prisma.websiteProject.findUnique({ where: { id: projectId } });
  if (!project) throw new NotFoundError(`Project ${projectId} not found`);
  await prisma.auditEvent.create({
    data: {
      organizationId: project.organizationId,
      projectId: project.id,
      actorKind: 'user',
      actorId: ctx.actorUserId,
      action: 'platform_admin.cross_tenant_access',
      subject: `project:${project.id}`,
      payload: { reason: ctx.reason },
    },
  });
  return project;
}
