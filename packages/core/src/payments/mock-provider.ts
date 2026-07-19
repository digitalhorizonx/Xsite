import type {
  CheckoutSession,
  CreateCheckoutRequest,
  PaymentProvider,
  RawPaymentWebhook,
  RefundResult,
  VerifiedPaymentWebhook,
} from './types';

/**
 * Sandbox-safe mock payment provider. Used for local development, CI, and
 * the demo portal. It NEVER represents itself as processing a real payment —
 * `availability` is always `sandbox_only`, and every checkout URL points at
 * the portal's own `/pay/mock` confirmation screen, which requires an
 * explicit human click to simulate success or failure. There is no path by
 * which this provider marks a payment `paid` without that explicit action.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly key = 'mock';
  readonly availability = 'sandbox_only' as const;

  async createCheckout(req: CreateCheckoutRequest): Promise<CheckoutSession> {
    return {
      id: `mock_checkout_${req.paymentId}`,
      providerKey: this.key,
      paymentId: req.paymentId,
      checkoutUrl: `/pay/mock?paymentId=${encodeURIComponent(req.paymentId)}&amount=${req.amount}&currency=${req.currency}`,
      status: 'pending',
    };
  }

  /**
   * Expects a payload shaped like `{ paymentId, outcome: 'succeeded' | 'failed' }`
   * — produced only by the portal's own mock confirmation action, never by
   * an external network caller (there is no real signature to verify here,
   * which is exactly why this provider must never be selected outside
   * sandbox/demo use).
   */
  async verifyAndParseWebhook(raw: RawPaymentWebhook): Promise<VerifiedPaymentWebhook> {
    const body = JSON.parse(raw.rawBody) as { paymentId: string; outcome: 'succeeded' | 'failed' };
    return {
      providerKey: this.key,
      externalEventId: raw.externalEventId,
      eventType: raw.eventType,
      paymentProviderRef: body.paymentId,
      resultingStatus: body.outcome === 'succeeded' ? 'paid' : 'failed',
      payload: body,
    };
  }

  async refund(req: { paymentProviderRef: string; amount: number; reason: string }): Promise<RefundResult> {
    return {
      refundProviderRef: `mock_refund_${req.paymentProviderRef}`,
      amount: req.amount,
      status: 'refunded',
    };
  }
}
