# Payments

## Provider selection

Evaluated PayTabs, HyperPay, and Stripe against Jordan/MENA fit, recurring billing, webhooks,
refunds, and sandbox availability (research done via web search during this milestone; sources
below).

| Criterion | PayTabs | HyperPay | Stripe |
|---|---|---|---|
| Jordan support | Dedicated Jordan gateway page and region-specific API endpoint (`secure-jordan.paytabs.com`) | Covers Jordan (HQ in Riyadh; also UAE, Oman, Qatar, Iraq, Lebanon, Bahrain) per its marketing site | **Not supported** — Jordan is not a Stripe-supported country for a locally registered business |
| Recurring billing | Documented "Repeat Billing" (Agreements) API: tokenizes the card on a successful first payment, then debits on a merchant-defined schedule; dashboard-managed pause/cancel | Marketing site claims recurring billing support | N/A (ruled out) |
| Webhooks | Documented IPN with **HMAC-SHA256** signature over the raw request body, keyed by the merchant Server Key | Public docs found didn't go into signature-verification specifics | N/A |
| Refunds | Documented `tran_type: "refund"` against a `tran_ref`, with partial refunds via `cart_amount` | Not verified to the same depth | N/A |
| Sandbox | Profile ID + Server Key from the merchant dashboard's Developers page, same credentials pattern for sandbox and production | Not verified to the same depth | N/A |

**Decision: PayTabs.** Stripe is ruled out outright (see above). HyperPay's marketing claims are
plausible but its *public, freely accessible technical documentation* did not surface enough
implementation-level detail (exact signature algorithm, exact refund payload shape) to implement
against confidently without a live account; it remains a reasonable secondary candidate to
revisit once HorizonX has direct account-manager access to HyperPay's full technical docs.

Sources consulted: PayTabs's Jordan gateway page, Repeat Billing workflow docs, IPN
configuration and signature-verification docs, refund/void transaction docs, and the region
endpoint list (all under `paytabs.com`/`docs.paytabs.com`/`support.paytabs.com`); Stripe's
global-availability documentation; HyperPay's public site and integration guide.

## Architecture

```
@xsite/core/payments/types.ts     ← PaymentProvider, BillingProvider, CheckoutSession,
                                     PaymentIntent, Invoice, SubscriptionRecord,
                                     RawPaymentWebhook/VerifiedPaymentWebhook, RefundResult,
                                     PaymentReconciliationResult — no vendor name in this file
@xsite/core/payments/mock-provider.ts
                                   ← sandbox-only adapter, always availability: 'sandbox_only'
@xsite/core/payments/paytabs-provider.ts (exported via '@xsite/core/server' — Node-only,
                                     uses node:crypto — never import this from a Client Component)
                                   ← the real PayTabs adapter
apps/web/src/lib/payments/provider.ts
                                   ← selects the active provider from PAYMENT_PROVIDER
apps/web/src/app/api/v1/.../payments/route.ts
                                   ← creates a Payment row + checkout session (never marks paid)
apps/web/src/app/api/webhooks/payments/[provider]/route.ts
                                   ← the ONLY path to a final payment status
apps/web/src/app/pay/mock/page.tsx
                                   ← sandbox checkout screen (mock provider only)
```

### The browser return URL is never authoritative

`createCheckout` returns a `checkoutUrl` and a `pending` status — nothing else. The only way a
`Payment` reaches `paid`/`failed`/`refunded`/etc. is `POST /api/webhooks/payments/:provider`,
which verifies the payload (PayTabs: HMAC-SHA256 over the exact raw body, using
`node:crypto`'s `timingSafeEqual` for the comparison) before touching the database. Even the
**mock** provider's own sandbox page (`/pay/mock`) doesn't set status client-side — its buttons
POST to the same webhook endpoint a real provider's server-to-server callback would hit.

### Idempotent webhook processing

`WebhookEvent.externalEventId` has a unique database constraint. `recordAndApplyPaymentWebhook`
inserts the `WebhookEvent` row and updates the `Payment` in the same transaction; a redelivered
event (same `externalEventId`) fails the unique constraint, and the webhook route catches that
specific case and responds `{ received: true, duplicate: true }` rather than reprocessing or
erroring (which would make the provider retry indefinitely).

### Verified, live

During this milestone: created a real checkout via the HTTP API (started `pending`, confirmed
via a second request that it was still `pending`, never `paid`), sent the mock webhook (flipped
to `paid`, response showed `previousStatus`/`newStatus`/`changed`), redelivered the identical
event (`{ duplicate: true }`, no double-processing), and confirmed via `@xsite/db`'s test suite
that a failed outcome resolves to `failed` and that cross-tenant payment listing is rejected.

## PayTabs adapter status: awaiting merchant activation

No PayTabs merchant account exists yet. `PayTabsPaymentProvider.availability` is
`'awaiting_merchant_activation'` whenever `PAYTABS_PROFILE_ID`/`PAYTABS_SERVER_KEY` are unset
(they are, right now) — every method (`createCheckout`, `verifyAndParseWebhook`, `refund`) fails
closed with `PayTabsNotActivatedError` instead of attempting a request with empty credentials.
This is real, working code (11 unit tests cover the exact HMAC-SHA256 verification algorithm,
including rejecting a tampered payload and a wrong-key signature, using Node's real `crypto`
module with no network calls), but it has **not been exercised against a live PayTabs sandbox**.

### Required to activate

1. Register a PayTabs merchant account (<https://dashboard.paytabs.com>) with sandbox access.
2. From the dashboard's Developers → Key Management page, copy the **Profile ID** and
   **Server Key** into `PAYTABS_PROFILE_ID` / `PAYTABS_SERVER_KEY`.
3. Confirm the account's region matches `PAYTABS_REGION` (default `jordan` →
   `secure-jordan.paytabs.com`) — change it if the merchant account is registered under a
   different PayTabs region.
4. Configure IPN in the dashboard (Developers → Payment Notification) pointing at
   `https://xsite-app.horizonx.site/api/webhooks/payments/paytabs`. HTTPS is required — PayTabs
   sends an empty body over plain HTTP.
5. Set `PAYMENT_PROVIDER=paytabs` (from the default `mock`) once the above is done and smoke-
   tested in PayTabs's sandbox mode (`PAYMENT_SANDBOX_MODE=true`).
6. Only after a successful sandbox transaction end-to-end should `PAYMENT_SANDBOX_MODE` flip to
   `false` for production traffic — that is a deliberate account-level change on PayTabs's side,
   not just an env var flip on ours.

### Known limitations

- **Recurring billing** (the "Repeat Billing"/Agreements flow) requires a successful initial
  tokenized transaction before an Agreement can be created — this two-step flow is documented by
  PayTabs but has not been implemented or exercised in this codebase yet (only one-off
  deposit/final/overage payments are wired). The monthly XSite subscription therefore currently
  has no live recurring-charge path; it needs this Agreements integration before subscriptions
  can auto-renew. Flagged in `docs/PRODUCTION_CHECKLIST.md`.
- **Refund** partial-amount behavior (multiple partial refunds against one transaction) is
  implemented per the documented request shape but not tested against a live sandbox.
- HyperPay was not implemented as a fallback provider in this milestone — if PayTabs onboarding
  stalls, revisit HyperPay with direct account-manager documentation access.
