import { NextResponse } from 'next/server';
import {
  assessRouting,
  calculateQuote,
  deriveOperationsScope,
  type BuildScope,
  type ClientQuote,
  type RoutingAssessment,
  WEBSITE_TYPES,
} from '@xsite/core';

/**
 * POST /api/v1/quotes/calculate
 *
 * Typed API boundary over the XBrain pricing engine. Returns ONLY the
 * client-facing quote plus the routing assessment. The internal breakdown
 * produced by the engine is intentionally discarded here — in later phases it
 * is persisted server-side with a separate access policy, and it must never
 * be serialized through client-facing endpoints.
 */

export interface CalculateQuoteRequest {
  scope: BuildScope;
  xabilityBundleEligible: boolean;
}

export interface CalculateQuoteResponse {
  quote: ClientQuote;
  routing: RoutingAssessment;
}

function isValidScope(scope: unknown): scope is BuildScope {
  if (typeof scope !== 'object' || scope === null) return false;
  const s = scope as Record<string, unknown>;
  return (
    typeof s.websiteType === 'string' &&
    (WEBSITE_TYPES as readonly string[]).includes(s.websiteType) &&
    typeof s.pageCount === 'number' &&
    s.pageCount >= 1 &&
    s.pageCount <= 500 &&
    typeof s.languageCount === 'number' &&
    s.languageCount >= 1 &&
    s.languageCount <= 10
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: Partial<CalculateQuoteRequest>;
  try {
    body = (await request.json()) as Partial<CalculateQuoteRequest>;
  } catch {
    return NextResponse.json(
      { error: { code: 'invalid_json', message: 'Request body must be valid JSON.' } },
      { status: 400 },
    );
  }

  if (!isValidScope(body.scope)) {
    return NextResponse.json(
      { error: { code: 'invalid_scope', message: 'A valid structured scope is required.' } },
      { status: 422 },
    );
  }

  const scope = body.scope;
  const ops = deriveOperationsScope(scope, {
    xabilityBundleEligible: body.xabilityBundleEligible === true,
  });
  const { quote } = calculateQuote(scope, ops);
  const routing = assessRouting(scope);

  const response: CalculateQuoteResponse = { quote, routing };
  return NextResponse.json(response);
}
