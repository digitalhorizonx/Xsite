import { describe, expect, it } from 'vitest';
import { MockPaymentProvider } from './mock-provider';

describe('MockPaymentProvider', () => {
  const provider = new MockPaymentProvider();

  it('is always sandbox_only — never claims to be a real payment path', () => {
    expect(provider.availability).toBe('sandbox_only');
  });

  it('creates a pending checkout pointing at the mock confirmation screen', async () => {
    const session = await provider.createCheckout({
      paymentId: 'p1',
      amount: 500,
      currency: 'USD',
      kind: 'deposit',
      customer: { organizationId: 'org1', email: 'a@b.com' },
      idempotencyKey: 'idem1',
      returnUrl: 'https://example.com/return',
    });
    expect(session.status).toBe('pending');
    expect(session.checkoutUrl).toContain('/pay/mock');
  });

  it('only resolves to paid/failed via an explicit outcome, never automatically', async () => {
    const succeeded = await provider.verifyAndParseWebhook({
      providerKey: 'mock',
      externalEventId: 'evt-1',
      eventType: 'mock.confirmed',
      rawBody: JSON.stringify({ paymentId: 'p1', outcome: 'succeeded' }),
      headers: {},
    });
    expect(succeeded.resultingStatus).toBe('paid');

    const failed = await provider.verifyAndParseWebhook({
      providerKey: 'mock',
      externalEventId: 'evt-2',
      eventType: 'mock.confirmed',
      rawBody: JSON.stringify({ paymentId: 'p1', outcome: 'failed' }),
      headers: {},
    });
    expect(failed.resultingStatus).toBe('failed');
  });

  it('refunds deterministically for test scenarios', async () => {
    const result = await provider.refund({ paymentProviderRef: 'p1', amount: 100, reason: 'test' });
    expect(result.status).toBe('refunded');
    expect(result.amount).toBe(100);
  });
});
