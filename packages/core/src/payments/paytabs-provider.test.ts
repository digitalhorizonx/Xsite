import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { computePayTabsSignature, PayTabsNotActivatedError, PayTabsPaymentProvider } from './paytabs-provider';

describe('PayTabsPaymentProvider — awaiting merchant activation', () => {
  it('reports awaiting_merchant_activation when no credentials are configured', () => {
    const provider = new PayTabsPaymentProvider({});
    expect(provider.availability).toBe('awaiting_merchant_activation');
  });

  it('fails closed on createCheckout instead of attempting a request with empty credentials', async () => {
    const provider = new PayTabsPaymentProvider({});
    await expect(
      provider.createCheckout({
        paymentId: 'p1',
        amount: 100,
        currency: 'USD',
        kind: 'deposit',
        customer: { organizationId: 'org1', email: 'a@b.com' },
        idempotencyKey: 'idem1',
        returnUrl: 'https://example.com/return',
      }),
    ).rejects.toBeInstanceOf(PayTabsNotActivatedError);
  });

  it('fails closed on webhook verification without credentials', async () => {
    const provider = new PayTabsPaymentProvider({});
    await expect(
      provider.verifyAndParseWebhook({
        providerKey: 'paytabs',
        externalEventId: 'evt1',
        eventType: 'payment.updated',
        rawBody: '{}',
        headers: {},
      }),
    ).rejects.toBeInstanceOf(PayTabsNotActivatedError);
  });

  it('fails closed on refund without credentials', async () => {
    const provider = new PayTabsPaymentProvider({});
    await expect(
      provider.refund({ paymentProviderRef: 'ref1', amount: 10, reason: 'test' }),
    ).rejects.toBeInstanceOf(PayTabsNotActivatedError);
  });

  it('reports available once credentials are present', () => {
    const provider = new PayTabsPaymentProvider({ profileId: 'p', serverKey: 's' });
    expect(provider.availability).toBe('available');
  });
});

describe('PayTabsPaymentProvider — IPN signature verification (real algorithm, no network)', () => {
  const serverKey = 'test-server-key';
  const provider = new PayTabsPaymentProvider({ profileId: 'profile123', serverKey });

  function sign(body: string) {
    return createHmac('sha256', serverKey).update(body).digest('hex');
  }

  it('accepts a correctly signed successful payment IPN', async () => {
    const body = JSON.stringify({
      tran_ref: 'TST2111100150559',
      cart_id: 'payment_abc',
      payment_result: { response_status: 'PAID_OK_NOT_A_REAL_CODE' },
    });
    const result = await provider.verifyAndParseWebhook({
      providerKey: 'paytabs',
      externalEventId: 'evt-1',
      eventType: 'payment.updated',
      rawBody: body,
      headers: { signature: sign(body) },
    });
    expect(result.paymentProviderRef).toBe('TST2111100150559');
    expect(result.resultingStatus).toBe('paid');
  });

  it('maps documented response_status codes to internal PaymentStatus', async () => {
    const cases: Array<[string, string]> = [
      ['A', 'authorized'],
      ['H', 'pending'],
      ['P', 'pending'],
      ['V', 'cancelled'],
      ['E', 'failed'],
      ['D', 'disputed'],
    ];
    for (const [code, expected] of cases) {
      const body = JSON.stringify({ tran_ref: 'r', cart_id: 'c', payment_result: { response_status: code } });
      const result = await provider.verifyAndParseWebhook({
        providerKey: 'paytabs',
        externalEventId: `evt-${code}`,
        eventType: 'payment.updated',
        rawBody: body,
        headers: { signature: sign(body) },
      });
      expect(result.resultingStatus).toBe(expected);
    }
  });

  it('rejects a tampered payload even with a technically-present signature header', async () => {
    const originalBody = JSON.stringify({ tran_ref: 'r1', cart_id: 'c1', payment_result: { response_status: 'A' } });
    const signature = sign(originalBody);
    const tamperedBody = JSON.stringify({ tran_ref: 'r1', cart_id: 'c1', payment_result: { response_status: 'PAID' } });

    await expect(
      provider.verifyAndParseWebhook({
        providerKey: 'paytabs',
        externalEventId: 'evt-tampered',
        eventType: 'payment.updated',
        rawBody: tamperedBody,
        headers: { signature },
      }),
    ).rejects.toThrow(/signature verification failed/i);
  });

  it('rejects a payload signed with the wrong key', async () => {
    const body = JSON.stringify({ tran_ref: 'r', cart_id: 'c', payment_result: { response_status: 'A' } });
    const wrongSignature = createHmac('sha256', 'not-the-real-key').update(body).digest('hex');

    await expect(
      provider.verifyAndParseWebhook({
        providerKey: 'paytabs',
        externalEventId: 'evt-wrong-key',
        eventType: 'payment.updated',
        rawBody: body,
        headers: { signature: wrongSignature },
      }),
    ).rejects.toThrow(/signature verification failed/i);
  });

  it('rejects a payload with no signature header at all', async () => {
    await expect(
      provider.verifyAndParseWebhook({
        providerKey: 'paytabs',
        externalEventId: 'evt-none',
        eventType: 'payment.updated',
        rawBody: '{}',
        headers: {},
      }),
    ).rejects.toThrow(/missing the signature header/i);
  });

  it('exports the exact signing function used by the adapter for test/dev tooling', () => {
    const body = '{"a":1}';
    expect(computePayTabsSignature(serverKey, body)).toBe(sign(body));
  });
});
