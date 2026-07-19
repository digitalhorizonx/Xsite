import type { BuildScope, OperationsScope, WebsiteType } from '@xsite/core';
import { prisma } from '../client';
import { requireProjectInOrg } from '../tenancy';
import { appendAuditEvent } from './audit';

export interface CreateProjectInput {
  organizationId: string;
  name: string;
  websiteType: WebsiteType;
  createdByUserId: string;
}

export async function createProject(input: CreateProjectInput) {
  return prisma.$transaction(async (tx) => {
    const project = await tx.websiteProject.create({
      data: {
        organizationId: input.organizationId,
        name: input.name,
        websiteType: input.websiteType,
        status: 'draft',
      },
    });
    await tx.workflowTransition.create({
      data: {
        projectId: project.id,
        fromStatus: 'draft',
        toStatus: 'draft',
        triggeredByKind: 'user',
        triggeredById: input.createdByUserId,
        reason: 'Project created',
      },
    });
    await appendAuditEvent(
      {
        actor: { kind: 'user', id: input.createdByUserId },
        organizationId: input.organizationId,
        projectId: project.id,
        action: 'project.created',
        subject: `project:${project.id}`,
        payload: { name: project.name, websiteType: project.websiteType },
      },
      tx,
    );
    return project;
  });
}

/** Organization-scoped list — never accepts a bare projectId lookup. */
export async function listProjects(organizationId: string) {
  return prisma.websiteProject.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getProject(organizationId: string, projectId: string) {
  return requireProjectInOrg(organizationId, projectId);
}

export interface SaveDiscoveryInput {
  organizationId: string;
  projectId: string;
  answers: Record<string, unknown>;
  completeness: number;
  missingFields: string[];
  actorUserId: string;
}

export async function saveDiscovery(input: SaveDiscoveryInput) {
  await requireProjectInOrg(input.organizationId, input.projectId);

  return prisma.$transaction(async (tx) => {
    const session = await tx.discoverySession.upsert({
      where: { projectId: input.projectId },
      create: {
        projectId: input.projectId,
        completeness: input.completeness,
        missingFields: input.missingFields,
      },
      update: {
        completeness: input.completeness,
        missingFields: input.missingFields,
      },
    });

    for (const [key, value] of Object.entries(input.answers)) {
      await tx.discoveryAnswer.upsert({
        where: { discoverySessionId_key: { discoverySessionId: session.id, key } },
        create: { discoverySessionId: session.id, key, value: value as never },
        update: { value: value as never },
      });
    }

    await appendAuditEvent(
      {
        actor: { kind: 'user', id: input.actorUserId },
        organizationId: input.organizationId,
        projectId: input.projectId,
        action: 'discovery.updated',
        subject: `discovery:${session.id}`,
        payload: { completeness: input.completeness },
      },
      tx,
    );

    return session;
  });
}

export interface SaveScopeCalculationInput {
  organizationId: string;
  projectId: string;
  buildScope: BuildScope;
  operationsScope: OperationsScope;
}

export async function saveScopeCalculation(input: SaveScopeCalculationInput) {
  await requireProjectInOrg(input.organizationId, input.projectId);

  const latest = await prisma.scopeCalculation.findFirst({
    where: { projectId: input.projectId },
    orderBy: { version: 'desc' },
  });
  const version = (latest?.version ?? 0) + 1;

  return prisma.scopeCalculation.create({
    data: {
      projectId: input.projectId,
      version,
      buildScope: input.buildScope as never,
      operationsScope: input.operationsScope as never,
    },
  });
}
