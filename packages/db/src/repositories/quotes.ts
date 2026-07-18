import type { ClientQuote, GateKey, PriceCategory, QuoteResult } from '@xsite/core';
import { PRICING_CONFIG } from '@xsite/core';
import { prisma } from '../client';
import { requireProjectInOrg, requireQuoteInOrg } from '../tenancy';
import { clientQuoteToRow, internalBreakdownToRow, lineItemsToRows, rowToClientQuote } from '../mapping';
import { appendAuditEvent } from './audit';

export interface PersistQuoteInput {
  organizationId: string;
  projectId: string;
  scopeCalculationId: string;
  result: QuoteResult;
  actorId: string;
  actorKind?: 'user' | 'agent' | 'system';
}

/**
 * Persists BOTH the client-facing quote and the internal breakdown in one
 * transaction, but as two separate tables — `InternalCostBreakdown` is never
 * selected by the client-facing read path (`getClientQuote` below only ever
 * queries `Quote` + `QuoteLineItem`).
 */
export async function persistQuote(input: PersistQuoteInput) {
  await requireProjectInOrg(input.organizationId, input.projectId);

  const latest = await prisma.quote.findFirst({
    where: { projectId: input.projectId },
    orderBy: { version: 'desc' },
  });
  const version = (latest?.version ?? 0) + 1;

  return prisma.$transaction(async (tx) => {
    if (latest) {
      await tx.quote.update({ where: { id: latest.id }, data: { status: 'superseded' } });
    }

    const quote = await tx.quote.create({
      data: clientQuoteToRow(input.result.quote, {
        projectId: input.projectId,
        scopeCalculationId: input.scopeCalculationId,
        version,
      }),
    });

    await tx.quoteLineItem.createMany({
      data: lineItemsToRows(input.result.quote).map((li) => ({ ...li, quoteId: quote.id })),
    });

    await tx.internalCostBreakdown.create({
      data: internalBreakdownToRow(input.result.internal, quote.id),
    });

    await appendAuditEvent(
      {
        actor: { kind: input.actorKind ?? 'agent', id: input.actorId },
        organizationId: input.organizationId,
        projectId: input.projectId,
        action: 'quote.generated',
        subject: `quote:${quote.id}`,
        payload: { version, buildPrice: quote.buildPrice, currency: quote.currency },
      },
      tx,
    );

    return quote;
  });
}

/**
 * Client-facing read. Selects ONLY the Quote and QuoteLineItem tables —
 * InternalCostBreakdown is structurally unreachable from this function.
 */
export async function getClientQuote(organizationId: string, quoteId: string): Promise<ClientQuote> {
  const quote = await requireQuoteInOrg(organizationId, quoteId);
  const lineItems = await prisma.quoteLineItem.findMany({ where: { quoteId: quote.id } });
  const priceCategory: PriceCategory = PRICING_CONFIG.websiteCategory[quote.project.websiteType];
  return rowToClientQuote(quote, lineItems, quote.project.websiteType, priceCategory);
}

export async function getLatestClientQuote(
  organizationId: string,
  projectId: string,
): Promise<ClientQuote | null> {
  const project = await requireProjectInOrg(organizationId, projectId);
  const quote = await prisma.quote.findFirst({
    where: { projectId },
    orderBy: { version: 'desc' },
  });
  if (!quote) return null;
  const lineItems = await prisma.quoteLineItem.findMany({ where: { quoteId: quote.id } });
  const priceCategory: PriceCategory = PRICING_CONFIG.websiteCategory[project.websiteType];
  return rowToClientQuote(quote, lineItems, project.websiteType, priceCategory);
}

export interface RecordApprovalInput {
  organizationId: string;
  projectId: string;
  quoteId: string;
  gate: GateKey;
  decision: 'approved' | 'changes_requested';
  decidedByUserId: string;
  note?: string;
}

export async function recordApprovalDecision(input: RecordApprovalInput) {
  await requireProjectInOrg(input.organizationId, input.projectId);
  await requireQuoteInOrg(input.organizationId, input.quoteId);

  return prisma.$transaction(async (tx) => {
    const approval = await tx.proposalApproval.create({
      data: {
        quoteId: input.quoteId,
        gate: input.gate,
        decision: input.decision,
        decidedByUserId: input.decidedByUserId,
        decidedAt: new Date(),
        ...(input.note !== undefined ? { note: input.note } : {}),
      },
    });

    if (input.decision === 'approved') {
      await tx.approvalGate.upsert({
        where: { projectId_gate: { projectId: input.projectId, gate: input.gate } },
        create: {
          projectId: input.projectId,
          gate: input.gate,
          satisfied: true,
          satisfiedAt: new Date(),
          satisfiedByUserId: input.decidedByUserId,
        },
        update: { satisfied: true, satisfiedAt: new Date(), satisfiedByUserId: input.decidedByUserId },
      });
    }

    await appendAuditEvent(
      {
        actor: { kind: 'user', id: input.decidedByUserId },
        organizationId: input.organizationId,
        projectId: input.projectId,
        action: 'approval.decided',
        subject: `gate:${input.gate}`,
        payload: { decision: input.decision, quoteId: input.quoteId },
      },
      tx,
    );

    return approval;
  });
}

export async function getSatisfiedGates(organizationId: string, projectId: string): Promise<GateKey[]> {
  await requireProjectInOrg(organizationId, projectId);
  const rows = await prisma.approvalGate.findMany({ where: { projectId, satisfied: true } });
  return rows.map((r) => r.gate as GateKey);
}
