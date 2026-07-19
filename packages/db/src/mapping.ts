import type { Prisma, Quote as QuoteRow, QuoteLineItem as QuoteLineItemRow } from '@prisma/client';
import {
  PLAN_LABELS,
  PRICING_CONFIG,
  WEBSITE_TYPE_LABELS,
  type ClientQuote,
  type InternalBreakdown,
} from '@xsite/core';

/**
 * Translation between @xsite/core's calculation output and the normalized DB
 * rows. Display-only fields that are pure functions of stored config
 * (website type label, plan label, included-requests allowance) are derived
 * at read time from @xsite/core rather than duplicated in the database — the
 * pricing config stays the single source of truth for those.
 */

export function clientQuoteToRow(
  quote: ClientQuote,
  ids: { projectId: string; scopeCalculationId: string; version: number },
): Prisma.QuoteCreateInput {
  return {
    project: { connect: { id: ids.projectId } },
    scopeCalculation: { connect: { id: ids.scopeCalculationId } },
    version: ids.version,
    configVersion: quote.configVersion,
    currency: quote.currency,
    thirdPartyCosts: quote.thirdPartyCosts as unknown as Prisma.InputJsonValue,
    buildPrice: quote.buildPrice,
    minimumBuildPrice: quote.minimumBuildPrice,
    depositPct: quote.depositPct,
    depositAmount: quote.depositAmount,
    remainingAmount: quote.remainingAmount,
    monthlyPlan: quote.monthly.plan,
    monthlyBundle: quote.monthly.bundle,
    monthlyPrice: quote.monthly.price,
    monthlyStandalonePrice: quote.monthly.standalonePrice,
    bundleSaving: quote.monthly.bundleSaving,
    includedScope: quote.includedScope,
    excludedScope: quote.excludedScope,
    assumptions: quote.assumptions,
    explanation: quote.explanation,
    riskLevel: quote.riskLevel,
    deliveryEstimateMinWeeks: quote.deliveryEstimateWeeks.min,
    deliveryEstimateMaxWeeks: quote.deliveryEstimateWeeks.max,
    quoteValidityDays: quote.quoteValidityDays,
    requiresCustomPricing: quote.requiresCustomPricing,
  };
}

export function internalBreakdownToRow(
  internal: InternalBreakdown,
  quoteId: string,
): Prisma.InternalCostBreakdownCreateInput {
  return {
    quote: { connect: { id: quoteId } },
    aiExecutionCostEstimate: internal.aiExecutionCostEstimate,
    infraCostEstimate: internal.infraCostEstimate,
    riskBufferFactor: internal.riskBufferFactor,
    qaComplexityCost: internal.qaComplexityCost,
    costFloor: internal.costFloor,
    minimumFromMarginFloor: internal.minimumFromMarginFloor,
    preClampSubtotal: internal.preClampSubtotal,
    clampedBy: internal.clampedBy,
    marginAtRecommended: internal.marginAtRecommended,
    formulaTrace: internal.formulaTrace,
  };
}

export function lineItemsToRows(
  quote: ClientQuote,
): Array<Omit<Prisma.QuoteLineItemCreateManyInput, 'quoteId'>> {
  return quote.lineItems.map((li) => ({
    key: li.key,
    label: li.label,
    amount: li.amount,
    kind: li.kind,
    reason: li.reason,
  }));
}

/**
 * Reconstructs the client-facing ClientQuote shape from persisted rows. This
 * function's input type structurally excludes any relation to
 * InternalCostBreakdown — there is no way to call it with internal-only data
 * by accident.
 */
export function rowToClientQuote(
  row: QuoteRow,
  lineItems: QuoteLineItemRow[],
  websiteType: ClientQuote['websiteType'],
  priceCategory: ClientQuote['priceCategory'],
): ClientQuote {
  const plan = PRICING_CONFIG.plans[row.monthlyPlan];
  return {
    configVersion: row.configVersion,
    currency: row.currency,
    websiteType,
    websiteTypeLabel: WEBSITE_TYPE_LABELS[websiteType],
    priceCategory,
    buildPrice: row.buildPrice,
    minimumBuildPrice: row.minimumBuildPrice,
    depositPct: row.depositPct,
    depositAmount: row.depositAmount,
    remainingAmount: row.remainingAmount,
    monthly: {
      plan: row.monthlyPlan,
      planLabel: PLAN_LABELS[row.monthlyPlan],
      bundle: row.monthlyBundle,
      price: row.monthlyPrice,
      standalonePrice: row.monthlyStandalonePrice,
      bundleSaving: row.bundleSaving,
      startingAt: plan.startingAt,
      includedRequests: plan.includedRequests,
    },
    thirdPartyCosts: row.thirdPartyCosts as unknown as ClientQuote['thirdPartyCosts'],
    includedScope: row.includedScope,
    excludedScope: row.excludedScope,
    assumptions: row.assumptions,
    riskLevel: row.riskLevel,
    deliveryEstimateWeeks: { min: row.deliveryEstimateMinWeeks, max: row.deliveryEstimateMaxWeeks },
    quoteValidityDays: row.quoteValidityDays,
    lineItems: lineItems.map((li) => ({
      key: li.key,
      label: li.label,
      amount: li.amount,
      kind: li.kind,
      reason: li.reason,
    })),
    explanation: row.explanation,
    requiresCustomPricing: row.requiresCustomPricing,
  };
}
