import { canTransition, PAUSABLE_STATUSES, type ProjectStatus } from '@xsite/core';
import { prisma } from '../client';
import { requireProjectInOrg } from '../tenancy';
import { getSatisfiedGates } from './quotes';
import { appendAuditEvent } from './audit';

export class IllegalTransitionError extends Error {
  constructor(
    public readonly reason: string,
    public readonly missingGates: string[],
  ) {
    super(reason);
    this.name = 'IllegalTransitionError';
  }
}

export interface TransitionInput {
  organizationId: string;
  projectId: string;
  toStatus: ProjectStatus;
  triggeredBy: { kind: 'user' | 'agent' | 'system'; id: string };
  reason?: string;
}

/**
 * The ONLY way project.status changes. Re-validates against the real
 * @xsite/core state machine (not just against whatever the caller asserts)
 * using gates actually recorded as satisfied in the database — an agent or
 * API route cannot move a project forward by skipping this function.
 */
export async function transitionProject(input: TransitionInput) {
  const project = await requireProjectInOrg(input.organizationId, input.projectId);
  const satisfiedGates = await getSatisfiedGates(input.organizationId, input.projectId);

  const fromStatus = project.status as ProjectStatus;
  const check = canTransition(fromStatus, input.toStatus, satisfiedGates);
  if (!check.allowed) {
    throw new IllegalTransitionError(check.reason, check.missingGates);
  }

  return prisma.$transaction(async (tx) => {
    const isPause = input.toStatus === 'paused';
    const isResume = fromStatus === 'paused' && PAUSABLE_STATUSES.includes(input.toStatus);

    const updated = await tx.websiteProject.update({
      where: { id: input.projectId },
      data: {
        status: input.toStatus,
        prePauseStatus: isPause ? fromStatus : isResume ? null : project.prePauseStatus,
      },
    });

    await tx.workflowTransition.create({
      data: {
        projectId: input.projectId,
        fromStatus,
        toStatus: input.toStatus,
        gatesSatisfied: satisfiedGates,
        triggeredByKind: input.triggeredBy.kind,
        triggeredById: input.triggeredBy.id,
        ...(input.reason !== undefined ? { reason: input.reason } : {}),
      },
    });

    await appendAuditEvent(
      {
        actor: input.triggeredBy,
        organizationId: input.organizationId,
        projectId: input.projectId,
        action: 'project.transitioned',
        subject: `project:${input.projectId}`,
        payload: { from: fromStatus, to: input.toStatus },
      },
      tx,
    );

    return updated;
  });
}

export async function getWorkflowHistory(organizationId: string, projectId: string) {
  await requireProjectInOrg(organizationId, projectId);
  return prisma.workflowTransition.findMany({ where: { projectId }, orderBy: { at: 'asc' } });
}
