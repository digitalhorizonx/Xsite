import { NextResponse } from 'next/server';
import { createPaymentCheckout, listPayments } from '@xsite/db';
import type { PaymentKind } from '@xsite/core';
import { resolveMembershipContext } from '@/lib/auth/request-context';
import { getActivePaymentProvider } from '@/lib/payments/provider';
import { toErrorResponse } from '@/lib/api-errors';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ organizationId: string; projectId: string }> },
): Promise<NextResponse> {
  try {
    const { organizationId, projectId } = await params;
    const ctx = await resolveMembershipContext(organizationId);
    const payments = await listPayments(ctx.organization.id, projectId);
    return NextResponse.json({ payments });
  } catch (error) {
    return toErrorResponse(error);
  }
}

interface CreatePaymentBody {
  quoteId?: string;
  amount: number;
  currency: string;
  kind: PaymentKind;
  returnUrl: string;
}

/** POST — creates a Payment + provider checkout session. Never marks it paid. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ organizationId: string; projectId: string }> },
): Promise<NextResponse> {
  try {
    const { organizationId, projectId } = await params;
    const ctx = await resolveMembershipContext(organizationId);
    const body = (await request.json()) as CreatePaymentBody;
    if (!body.amount || !body.currency || !body.kind || !body.returnUrl) {
      return NextResponse.json(
        { error: { code: 'invalid_body', message: 'amount, currency, kind, and returnUrl are required.' } },
        { status: 422 },
      );
    }

    const provider = await getActivePaymentProvider();
    const result = await createPaymentCheckout({
      organizationId: ctx.organization.id,
      projectId,
      ...(body.quoteId !== undefined ? { quoteId: body.quoteId } : {}),
      amount: body.amount,
      currency: body.currency,
      kind: body.kind,
      customerEmail: ctx.user.email,
      returnUrl: body.returnUrl,
      provider,
      actorUserId: ctx.user.id,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
