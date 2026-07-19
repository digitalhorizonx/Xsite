import 'server-only';
import { MockPaymentProvider, type PaymentProvider } from '@xsite/core';

/**
 * Resolves the active PaymentProvider from PAYMENT_PROVIDER. Defaults to the
 * sandbox-safe mock — the real PayTabs adapter only activates when
 * explicitly selected AND its credentials are present (otherwise it fails
 * closed with PayTabsNotActivatedError; see docs/PAYMENTS.md).
 */
export async function getActivePaymentProvider(): Promise<PaymentProvider> {
  const selected = process.env.PAYMENT_PROVIDER || 'mock';
  if (selected === 'paytabs') {
    const { createPayTabsProviderFromEnv } = await import('@xsite/core/server');
    return createPayTabsProviderFromEnv();
  }
  return new MockPaymentProvider();
}
