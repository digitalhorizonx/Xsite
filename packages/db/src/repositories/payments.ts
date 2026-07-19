import type {
  CheckoutSession,
  PaymentKind,
  PaymentProvider,
  VerifiedPaymentWebhook,
} from '@xsite/core';
import { prisma } from '../client';
import { requireProjectInOrg } from '../tenancy';
import { appendAuditEvent } from './audit';

export interface CreateCheckoutInput {
  organizationId: string;
  projectId: string;
  quoteId?: string;
  amount: number;
  currency: string;
  kind: PaymentKind;
  customerEmail: string;
  returnUrl: string;
  provider: PaymentProvider;
  actorUserId: string;
}

/**
 * Creates a Payment row (status `created`) and a provider checkout session
 * in one call. The Payment only ever moves past `created`/`pending` via a
 * verified webhook (see `reconcilePaymentFromWebhook`) — never from this
 * function's return value, and never from a browser return-URL parameter.
 */
export async function createPaymentCheckout(
  input: CreateCheckoutInput,
): Promise<{ paymentId: string; checkout: CheckoutSession }> {
  await requireProjectInOrg(input.organizationId, input.projectId);

  const idempotencyKey = `${input.projectId}-${input.kind}-${Date.now()}`;
  const payment = await prisma.payment.create({
    data: {
      organizationId: input.organizationId,
      projectId: input.projectId,
      ...(input.quoteId !== undefined ? { quoteId: input.quoteId } : {}),
      kind: input.kind,
      amount: input.amount,
      currency: input.currency,
      providerKey: input.provider.key,
      idempotencyKey,
      status: 'created',
    },
  });

  const checkout = await input.provider.createCheckout({
    paymentId: payment.id,
    amount: input.amount,
    currency: input.currency,
    kind: input.kind,
    customer: { organizationId: input.organizationId, email: input.customerEmail },
    idempotencyKey,
    returnUrl: input.returnUrl,
  });

  await prisma.payment.update({ where: { id: payment.id }, data: { status: 'pending', providerRef: checkout.id } });
  await prisma.paymentAttempt.create({
    data: { paymentId: payment.id, providerRef: checkout.id, status: 'pending' },
  });
  await appendAuditEvent({
    actor: { kind: 'user', id: input.actorUserId },
    organizationId: input.organizationId,
    projectId: input.projectId,
    action: 'payment.checkout_created',
    subject: `payment:${payment.id}`,
    payload: { kind: input.kind, amount: input.amount, currency: input.currency, providerKey: input.provider.key },
  });

  return { paymentId: payment.id, checkout };
}

/**
 * Applies a VERIFIED webhook event to the corresponding Payment. Idempotent:
 * the WebhookEvent's externalEventId has a unique constraint, so a
 * redelivered event is recorded once and does not double-apply the status
 * change (the second insert throws a unique-constraint error, which the
 * caller should treat as a no-op success — see the webhook route).
 */
export async function recordAndApplyPaymentWebhook(verified: VerifiedPaymentWebhook, rawEventType: string) {
  return prisma.$transaction(async (tx) => {
    await tx.webhookEvent.create({
      data: {
        providerKey: verified.providerKey,
        eventType: rawEventType,
        externalEventId: verified.externalEventId,
        signatureValid: true,
        payload: verified.payload as never,
        status: 'processed',
        processedAt: new Date(),
      },
    });

    if (!verified.paymentProviderRef) return null;
    const payment = await tx.payment.findFirst({ where: { providerRef: verified.paymentProviderRef } });
    if (!payment) return null;

    const previousStatus = payment.status;
    const newStatus = verified.resultingStatus as typeof payment.status;
    await tx.payment.update({ where: { id: payment.id }, data: { status: newStatus } });
    await tx.paymentAttempt.create({
      data: { paymentId: payment.id, providerRef: verified.paymentProviderRef, status: newStatus, rawResponse: verified.payload as never },
    });
    await appendAuditEvent(
      {
        actor: { kind: 'system', id: `webhook:${verified.providerKey}` },
        organizationId: payment.organizationId,
        ...(payment.projectId ? { projectId: payment.projectId } : {}),
        action: 'payment.status_changed',
        subject: `payment:${payment.id}`,
        payload: { from: previousStatus, to: newStatus },
      },
      tx,
    );

    return { paymentId: payment.id, previousStatus, newStatus, changed: previousStatus !== newStatus };
  });
}

export async function listPayments(organizationId: string, projectId: string) {
  await requireProjectInOrg(organizationId, projectId);
  return prisma.payment.findMany({ where: { organizationId, projectId }, orderBy: { createdAt: 'desc' } });
}
