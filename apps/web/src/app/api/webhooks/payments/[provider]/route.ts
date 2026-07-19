import { NextResponse } from 'next/server';
import { MockPaymentProvider } from '@xsite/core';
import { recordAndApplyPaymentWebhook } from '@xsite/db';

/**
 * POST /api/webhooks/payments/:provider
 *
 * The ONLY path by which a Payment ever reaches a final status (paid,
 * failed, refunded, ...). Verifies the payload against the named
 * provider's real signature scheme (PayTabs: HMAC-SHA256 over the raw
 * body — see @xsite/core/server), then applies it idempotently: a
 * redelivered event (same externalEventId) hits the WebhookEvent table's
 * unique constraint and is treated as an already-processed no-op, not an
 * error and not a double-applied status change.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
): Promise<NextResponse> {
  const { provider: providerKey } = await params;
  const rawBody = await request.text();
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  let eventType = 'payment.updated';
  let externalEventId: string;
  try {
    const parsed = JSON.parse(rawBody) as { eventId?: string; eventType?: string };
    externalEventId = parsed.eventId ?? `${providerKey}-${Date.now()}`;
    eventType = parsed.eventType ?? eventType;
  } catch {
    return NextResponse.json({ error: { code: 'invalid_json', message: 'Webhook body must be valid JSON.' } }, { status: 400 });
  }

  try {
    const provider =
      providerKey === 'paytabs'
        ? (await import('@xsite/core/server')).createPayTabsProviderFromEnv()
        : new MockPaymentProvider();

    const verified = await provider.verifyAndParseWebhook({
      providerKey,
      externalEventId,
      eventType,
      rawBody,
      headers,
    });

    const result = await recordAndApplyPaymentWebhook(verified, eventType);
    return NextResponse.json({ received: true, applied: result });
  } catch (error) {
    // Duplicate delivery — the unique constraint on externalEventId means
    // this event was already processed; acknowledge it rather than erroring
    // (providers retry on any non-2xx response).
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error('Payment webhook processing failed:', error);
    return NextResponse.json({ error: { code: 'webhook_processing_failed', message: 'Could not process webhook.' } }, { status: 400 });
  }
}
