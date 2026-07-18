/**
 * Provider-independent payment & billing architecture.
 *
 * Mirrors the required type/state list from docs/PAYMENTS.md. No provider
 * name (PayTabs, HyperPay, ...) appears in this file — the domain and the
 * workflow engine talk to `PaymentProvider`/`BillingProvider`, never to a
 * vendor SDK directly. Concrete adapters live behind these interfaces (see
 * apps/web's payments provider registry once wired).
 *
 * CRITICAL: the browser return/redirect URL is NEVER authoritative for
 * payment state. Only a verified, idempotently-processed webhook may move a
 * Payment from `pending`/`requires_action` into `paid`/`failed`/etc. — see
 * `PaymentWebhookHandler` below and docs/PAYMENTS.md.
 */

export type PaymentKind = 'deposit' | 'final' | 'subscription' | 'overage' | 'refund';

export type PaymentStatus =
  | 'created'
  | 'pending'
  | 'requires_action'
  | 'authorized'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'partially_refunded'
  | 'disputed';

export type SubscriptionStatus = 'incomplete' | 'trialing' | 'active' | 'past_due' | 'paused' | 'cancelled';

export interface PaymentCustomer {
  organizationId: string;
  email: string;
  name?: string;
  /** Provider's own customer/token reference, once created. */
  providerCustomerRef?: string;
}

export interface CheckoutSession {
  id: string;
  providerKey: string;
  paymentId: string;
  /** Where to send the customer to pay. */
  checkoutUrl: string;
  status: PaymentStatus;
  expiresAt?: string;
}

export interface PaymentIntent {
  id: string;
  providerKey: string;
  amount: number;
  currency: string;
  kind: PaymentKind;
  status: PaymentStatus;
  idempotencyKey: string;
}

export interface Invoice {
  id: string;
  organizationId: string;
  amount: number;
  currency: string;
  kind: PaymentKind;
  status: PaymentStatus;
  issuedAt: string;
}

export interface SubscriptionRecord {
  id: string;
  organizationId: string;
  projectId: string;
  providerKey: string;
  providerRef?: string;
  status: SubscriptionStatus;
  amount: number;
  currency: string;
  currentPeriodEnd?: string;
}

/** Raw provider webhook payload, pre-verification. */
export interface RawPaymentWebhook {
  providerKey: string;
  /** Provider's own event id — used as the idempotency key. */
  externalEventId: string;
  eventType: string;
  /** Exact bytes received, needed to recompute the signature. */
  rawBody: string;
  headers: Record<string, string>;
}

export interface VerifiedPaymentWebhook {
  providerKey: string;
  externalEventId: string;
  eventType: string;
  paymentProviderRef?: string;
  subscriptionProviderRef?: string;
  resultingStatus: PaymentStatus | SubscriptionStatus;
  payload: Record<string, unknown>;
}

export interface RefundResult {
  refundProviderRef: string;
  amount: number;
  status: Extract<PaymentStatus, 'refunded' | 'partially_refunded' | 'failed'>;
}

export interface PaymentReconciliationResult {
  paymentId: string;
  previousStatus: PaymentStatus;
  newStatus: PaymentStatus;
  changed: boolean;
  source: 'webhook' | 'manual_reconciliation';
}

export type ProviderAvailability = 'available' | 'sandbox_only' | 'awaiting_merchant_activation';

export interface CreateCheckoutRequest {
  paymentId: string;
  amount: number;
  currency: string;
  kind: PaymentKind;
  customer: PaymentCustomer;
  idempotencyKey: string;
  returnUrl: string;
  /** Only for kind === 'subscription': sets up recurring billing. */
  recurring?: { intervalDays: number };
}

/**
 * A payment provider adapter. Implementations MUST NOT fabricate a "paid"
 * result — `createCheckout` only ever returns a redirect target and a
 * non-final status; the only path to a final status is
 * `verifyAndParseWebhook` on a real, signature-verified callback.
 */
export interface PaymentProvider {
  readonly key: string;
  readonly availability: ProviderAvailability;
  createCheckout(req: CreateCheckoutRequest): Promise<CheckoutSession>;
  verifyAndParseWebhook(raw: RawPaymentWebhook): Promise<VerifiedPaymentWebhook>;
  refund(req: { paymentProviderRef: string; amount: number; reason: string }): Promise<RefundResult>;
}

export interface BillingProvider {
  readonly key: string;
  readonly availability: ProviderAvailability;
  createSubscription(req: {
    customer: PaymentCustomer;
    amount: number;
    currency: string;
    intervalDays: number;
    idempotencyKey: string;
  }): Promise<SubscriptionRecord>;
  cancelSubscription(providerRef: string): Promise<void>;
  pauseSubscription(providerRef: string): Promise<void>;
}
