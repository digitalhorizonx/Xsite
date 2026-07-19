import type { InternalBreakdown } from '@xsite/core';
import { prisma } from '../client';
import { requireQuoteInOrg } from '../tenancy';

/**
 * ⚠️ INTERNAL USE ONLY.
 *
 * Reads the InternalCostBreakdown table — margins, provider cost estimates,
 * risk buffers, formula trace. This module must NEVER be imported by
 * anything reachable from a client-facing API route or portal page. It
 * exists for the Pricing Agent's own reasoning and for internal HorizonX
 * reporting tooling only.
 *
 * `docs/security-guardrails.test.ts` (in apps/web) greps the web app source
 * tree for imports of this module and fails the build if one is found.
 */
export async function getInternalBreakdown(
  organizationId: string,
  quoteId: string,
): Promise<InternalBreakdown> {
  const quote = await requireQuoteInOrg(organizationId, quoteId);
  const row = await prisma.internalCostBreakdown.findUniqueOrThrow({ where: { quoteId: quote.id } });
  return {
    aiExecutionCostEstimate: row.aiExecutionCostEstimate,
    infraCostEstimate: row.infraCostEstimate,
    riskBufferFactor: row.riskBufferFactor,
    qaComplexityCost: row.qaComplexityCost,
    costFloor: row.costFloor,
    minimumFromMarginFloor: row.minimumFromMarginFloor,
    preClampSubtotal: row.preClampSubtotal,
    clampedBy: row.clampedBy as InternalBreakdown['clampedBy'],
    marginAtRecommended: row.marginAtRecommended,
    formulaTrace: row.formulaTrace,
  };
}
