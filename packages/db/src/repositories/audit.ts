import type { Prisma } from '@prisma/client';
import { redactPayload, type AuditActor } from '@xsite/core';
import { prisma } from '../client';

/**
 * Append-only audit trail, backed by the real database. There is
 * deliberately no `updateAuditEvent` or `deleteAuditEvent` export anywhere in
 * this package — audit rows are immutable by construction, not just by
 * convention.
 */
export interface AppendAuditEventInput {
  actor: AuditActor;
  organizationId: string;
  projectId?: string;
  action: string;
  subject: string;
  payload?: Record<string, unknown>;
}

type DbClient = typeof prisma | Prisma.TransactionClient;

/**
 * Accepts an optional transaction client. Callers inside a `prisma.$transaction`
 * block MUST pass their `tx` here — using the top-level `prisma` client instead
 * would insert against a connection that can't yet see uncommitted rows from
 * the same transaction (e.g. a project created earlier in that same
 * transaction), which fails the audit event's foreign key constraint.
 */
export async function appendAuditEvent(input: AppendAuditEventInput, client: DbClient = prisma) {
  return client.auditEvent.create({
    data: {
      organizationId: input.organizationId,
      ...(input.projectId !== undefined ? { projectId: input.projectId } : {}),
      actorKind: input.actor.kind,
      actorId: input.actor.id,
      action: input.action,
      subject: input.subject,
      payload: redactPayload(input.payload ?? {}) as Prisma.InputJsonValue,
    },
  });
}

export async function listAuditEvents(organizationId: string, filter?: { projectId?: string }) {
  return prisma.auditEvent.findMany({
    where: { organizationId, ...(filter?.projectId ? { projectId: filter.projectId } : {}) },
    orderBy: { at: 'desc' },
  });
}
