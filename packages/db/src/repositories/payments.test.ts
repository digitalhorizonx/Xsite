import { afterEach, describe, expect, it } from 'vitest';
import { MockPaymentProvider } from '@xsite/core';
import { createProject } from './projects';
import { createPaymentCheckout, listPayments, recordAndApplyPaymentWebhook } from './payments';
import { makeOrgWithOwner, truncateAll } from '../test/helpers';
import { prisma } from '../client';

afterEach(async () => {
  await truncateAll();
});

describe('payment persistence (real database, real MockPaymentProvider)', () => {
  it('creates a payment in pending status — never paid at checkout time', async () => {
    const { organization, user } = await makeOrgWithOwner('pay');
    const project = await createProject({
      organizationId: organization.id,
      name: 'Pay Co',
      websiteType: 'landing_page',
      createdByUserId: user.id,
    });

    const { paymentId, checkout } = await createPaymentCheckout({
      organizationId: organization.id,
      projectId: project.id,
      amount: 500,
      currency: 'USD',
      kind: 'deposit',
      customerEmail: user.email,
      returnUrl: 'https://example.com/return',
      provider: new MockPaymentProvider(),
      actorUserId: user.id,
    });

    expect(checkout.status).toBe('pending');
    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    expect(payment.status).toBe('pending');
  });

  it('only reaches "paid" through a verified webhook, and applies exactly once for duplicate deliveries', async () => {
    const { organization, user } = await makeOrgWithOwner('webhook');
    const project = await createProject({
      organizationId: organization.id,
      name: 'Webhook Co',
      websiteType: 'landing_page',
      createdByUserId: user.id,
    });
    const provider = new MockPaymentProvider();
    const { checkout } = await createPaymentCheckout({
      organizationId: organization.id,
      projectId: project.id,
      amount: 500,
      currency: 'USD',
      kind: 'deposit',
      customerEmail: user.email,
      returnUrl: 'https://example.com/return',
      provider,
      actorUserId: user.id,
    });

    const raw = {
      providerKey: 'mock',
      externalEventId: 'evt-once',
      eventType: 'mock.confirmed',
      rawBody: JSON.stringify({ paymentId: checkout.id, outcome: 'succeeded' }),
      headers: {},
    };
    const verified = await provider.verifyAndParseWebhook(raw);
    const first = await recordAndApplyPaymentWebhook(verified, raw.eventType);
    expect(first).toMatchObject({ previousStatus: 'pending', newStatus: 'paid', changed: true });

    // Redelivery of the identical event must violate the WebhookEvent unique
    // constraint rather than silently re-applying the status change.
    await expect(recordAndApplyPaymentWebhook(verified, raw.eventType)).rejects.toThrow(/unique constraint/i);

    const payments = await listPayments(organization.id, project.id);
    expect(payments).toHaveLength(1);
    expect(payments[0]?.status).toBe('paid');

    const attempts = await prisma.paymentAttempt.findMany({ where: { paymentId: payments[0]!.id } });
    // exactly 2: one from checkout creation (pending), one from the single applied webhook (paid)
    expect(attempts).toHaveLength(2);
  });

  it('rejects listing payments for a project belonging to another organization', async () => {
    const { organization: orgA, user: userA } = await makeOrgWithOwner('pay-a');
    const { organization: orgB } = await makeOrgWithOwner('pay-b');
    const project = await createProject({
      organizationId: orgA.id,
      name: 'A project',
      websiteType: 'landing_page',
      createdByUserId: userA.id,
    });

    await expect(listPayments(orgB.id, project.id)).rejects.toThrow();
  });

  it('a failed outcome resolves to failed, not paid', async () => {
    const { organization, user } = await makeOrgWithOwner('failpay');
    const project = await createProject({
      organizationId: organization.id,
      name: 'Fail Co',
      websiteType: 'landing_page',
      createdByUserId: user.id,
    });
    const provider = new MockPaymentProvider();
    const { checkout } = await createPaymentCheckout({
      organizationId: organization.id,
      projectId: project.id,
      amount: 500,
      currency: 'USD',
      kind: 'deposit',
      customerEmail: user.email,
      returnUrl: 'https://example.com/return',
      provider,
      actorUserId: user.id,
    });
    const verified = await provider.verifyAndParseWebhook({
      providerKey: 'mock',
      externalEventId: 'evt-fail',
      eventType: 'mock.confirmed',
      rawBody: JSON.stringify({ paymentId: checkout.id, outcome: 'failed' }),
      headers: {},
    });
    const result = await recordAndApplyPaymentWebhook(verified, 'mock.confirmed');
    expect(result?.newStatus).toBe('failed');
  });
});
