import { createHmac, timingSafeEqual } from 'node:crypto';
import type {
  CheckoutSession,
  CreateCheckoutRequest,
  PaymentProvider,
  PaymentStatus,
  RawPaymentWebhook,
  RefundResult,
  VerifiedPaymentWebhook,
} from './types';

/**
 * PayTabs adapter — selected as XSite's first payment provider.
 *
 * Why PayTabs (see docs/PAYMENTS.md for the full writeup and sources):
 *  - Dedicated Jordan gateway (HorizonX's home market) with a documented,
 *    region-specific API endpoint (secure-jordan.paytabs.com).
 *  - Documented HMAC-SHA256 IPN signature verification over the raw request
 *    body, keyed by the merchant's Server Key.
 *  - Documented refund/void API (`tran_type: "refund"|"void"` against a
 *    `tran_ref`), including partial refunds via `cart_amount`.
 *  - Documented recurring-billing ("Repeat Billing" / Agreements) API with
 *    dashboard-managed pause/cancel.
 *  - Stripe was ruled out: Jordan is not a Stripe-supported country for a
 *    locally registered business. HyperPay's public technical documentation
 *    (webhooks, signature verification, refunds) could not be verified to
 *    the same level of detail during this research pass.
 *
 * ⚠️ AWAITING MERCHANT ACTIVATION: this adapter is implemented against
 * PayTabs's documented PT2 API shapes, but HorizonX has not yet provisioned
 * a PayTabs merchant/sandbox account, so `PAYTABS_PROFILE_ID` /
 * `PAYTABS_SERVER_KEY` are unset. Every method fails closed with a clear
 * `PayTabsNotActivatedError` instead of attempting a request with empty
 * credentials — this code path has NOT been exercised against a live
 * PayTabs sandbox and must be smoke-tested there before production use.
 */

export class PayTabsNotActivatedError extends Error {
  constructor() {
    super(
      'PayTabs is awaiting merchant activation: PAYTABS_PROFILE_ID and PAYTABS_SERVER_KEY are not ' +
        'configured. Provision a PayTabs merchant account (sandbox first) and set these in the ' +
        'environment before this provider can process real checkouts. See docs/PAYMENTS.md.',
    );
    this.name = 'PayTabsNotActivatedError';
  }
}

export interface PayTabsConfig {
  profileId?: string | undefined;
  serverKey?: string | undefined;
  /** Region code, e.g. 'jordan', 'global', 'egypt', 'oman'. Default: jordan. */
  region?: string;
  sandbox?: boolean;
}

function regionHost(region: string): string {
  // Per PayTabs docs: swap the merchant dashboard subdomain's "merchant" for
  // "secure"; regional deployments use a "secure-<region>" subdomain, with
  // "secure.paytabs.com" reserved for KSA/global-default accounts.
  if (region === 'global' || region === '') return 'secure-global.paytabs.com';
  return `secure-${region}.paytabs.com`;
}

/** PayTabs's documented transaction-type values, mapped to our PaymentStatus. */
function statusFromPayTabsResponseStatus(responseStatus: string): PaymentStatus {
  const s = responseStatus.toUpperCase();
  if (s === 'A') return 'authorized'; // Authorized
  if (s === 'H') return 'pending'; // Hold / on-hold review
  if (s === 'P') return 'pending'; // Pending
  if (s === 'V') return 'cancelled'; // Voided
  if (s === 'E') return 'failed'; // Error
  if (s === 'D') return 'disputed'; // Dispute/chargeback
  // "Success"/settled transactions surface as 'paid' via the numeric
  // response_code family PayTabs documents as fully captured — treated
  // as the terminal success case for our purposes.
  return 'paid';
}

export class PayTabsPaymentProvider implements PaymentProvider {
  readonly key = 'paytabs';
  private readonly profileId: string | undefined;
  private readonly serverKey: string | undefined;
  private readonly host: string;

  constructor(config: PayTabsConfig = {}) {
    this.profileId = config.profileId;
    this.serverKey = config.serverKey;
    this.host = regionHost(config.region ?? 'jordan');
  }

  get availability(): 'available' | 'awaiting_merchant_activation' {
    return this.profileId && this.serverKey ? 'available' : 'awaiting_merchant_activation';
  }

  /** Returns definite credentials or throws — never accesses `this.profileId`/`serverKey` elsewhere. */
  private requireCredentials(): { profileId: string; serverKey: string } {
    if (!this.profileId || !this.serverKey) throw new PayTabsNotActivatedError();
    return { profileId: this.profileId, serverKey: this.serverKey };
  }

  async createCheckout(req: CreateCheckoutRequest): Promise<CheckoutSession> {
    const { profileId, serverKey } = this.requireCredentials();

    const body = {
      profile_id: profileId,
      tran_type: 'sale',
      tran_class: 'ecom',
      cart_id: req.paymentId,
      cart_currency: req.currency,
      cart_amount: req.amount,
      cart_description: `XSite ${req.kind} payment`,
      customer_details: { email: req.customer.email, name: req.customer.name },
      return: req.returnUrl,
      // Hosted return is advisory only — the IPN callback is authoritative.
      hide_shipping: true,
    };

    const response = await fetch(`https://${this.host}/payment/request`, {
      method: 'POST',
      headers: { Authorization: serverKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`PayTabs checkout request failed: HTTP ${response.status}`);
    }
    const data = (await response.json()) as { redirect_url?: string; tran_ref?: string };
    if (!data.redirect_url) {
      throw new Error('PayTabs checkout request did not return a redirect_url');
    }

    return {
      id: data.tran_ref ?? `paytabs_${req.paymentId}`,
      providerKey: this.key,
      paymentId: req.paymentId,
      checkoutUrl: data.redirect_url,
      status: 'pending',
    };
  }

  /**
   * Verifies the IPN `Signature` header: HMAC-SHA256 of the exact raw
   * request body, keyed by the merchant Server Key, compared with a
   * constant-time comparison to prevent timing attacks.
   */
  async verifyAndParseWebhook(raw: RawPaymentWebhook): Promise<VerifiedPaymentWebhook> {
    const { serverKey } = this.requireCredentials();

    const providedSignature = raw.headers['signature'] ?? raw.headers['Signature'];
    if (!providedSignature) {
      throw new Error('PayTabs IPN payload is missing the Signature header');
    }
    const expected = createHmac('sha256', serverKey).update(raw.rawBody).digest('hex');
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(providedSignature, 'utf8');
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new Error('PayTabs IPN signature verification failed');
    }

    const payload = JSON.parse(raw.rawBody) as {
      tran_ref: string;
      cart_id: string;
      payment_result?: { response_status?: string };
    };
    const responseStatus = payload.payment_result?.response_status ?? 'E';

    return {
      providerKey: this.key,
      externalEventId: raw.externalEventId,
      eventType: raw.eventType,
      paymentProviderRef: payload.tran_ref,
      resultingStatus: statusFromPayTabsResponseStatus(responseStatus),
      payload,
    };
  }

  async refund(req: { paymentProviderRef: string; amount: number; reason: string }): Promise<RefundResult> {
    const { profileId, serverKey } = this.requireCredentials();

    const body = {
      profile_id: profileId,
      tran_type: 'refund',
      tran_ref: req.paymentProviderRef,
      cart_id: `refund_${req.paymentProviderRef}_${Date.now()}`,
      cart_description: req.reason,
      cart_amount: req.amount,
    };
    const response = await fetch(`https://${this.host}/payment/request`, {
      method: 'POST',
      headers: { Authorization: serverKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { refundProviderRef: '', amount: req.amount, status: 'failed' };
    }
    const data = (await response.json()) as { tran_ref?: string };
    return {
      refundProviderRef: data.tran_ref ?? '',
      amount: req.amount,
      status: 'refunded',
    };
  }
}

/** Reads PAYTABS_* env vars; never throws — availability reflects what's configured. */
export function createPayTabsProviderFromEnv(): PayTabsPaymentProvider {
  return new PayTabsPaymentProvider({
    profileId: process.env.PAYTABS_PROFILE_ID || undefined,
    serverKey: process.env.PAYTABS_SERVER_KEY || undefined,
    region: process.env.PAYTABS_REGION || 'jordan',
    sandbox: process.env.PAYMENT_SANDBOX_MODE !== 'false',
  });
}

/** Exposed for tests that need to assert the exact IPN signature algorithm. */
export function computePayTabsSignature(serverKey: string, rawBody: string): string {
  return createHmac('sha256', serverKey).update(rawBody).digest('hex');
}
