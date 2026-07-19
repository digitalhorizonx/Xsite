import { NextResponse } from 'next/server';
import { persistQuote, saveScopeCalculation } from '@xsite/db';
import { calculateQuote, deriveOperationsScope, type BuildScope } from '@xsite/core';
import { resolveMembershipContext } from '@/lib/auth/request-context';
import { toErrorResponse } from '@/lib/api-errors';

/**
 * POST .../quotes — calculates a fresh quote from a submitted scope and
 * PERSISTS it (client-facing Quote + internal breakdown, in one
 * transaction — see @xsite/db/repositories/quotes.ts). This is the
 * persisted replacement for the Phase 1 demo wizard, which only ever held
 * the calculated quote in React state.
 *
 * Returns ONLY the client-facing quote — the internal breakdown is written
 * to its own table and is never read back through this or any other
 * client-facing route.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ organizationId: string; projectId: string }> },
): Promise<NextResponse> {
  try {
    const { organizationId, projectId } = await params;
    const ctx = await resolveMembershipContext(organizationId);
    const body = (await request.json()) as { scope: BuildScope; xabilityBundleEligible: boolean };

    const operationsScope = deriveOperationsScope(body.scope, {
      xabilityBundleEligible: body.xabilityBundleEligible === true,
    });
    const scopeCalculation = await saveScopeCalculation({
      organizationId: ctx.organization.id,
      projectId,
      buildScope: body.scope,
      operationsScope,
    });
    const result = calculateQuote(body.scope, operationsScope);
    const quoteRow = await persistQuote({
      organizationId: ctx.organization.id,
      projectId,
      scopeCalculationId: scopeCalculation.id,
      result,
      actorId: ctx.user.id,
      actorKind: 'user',
    });

    return NextResponse.json({ quote: result.quote, quoteId: quoteRow.id }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
