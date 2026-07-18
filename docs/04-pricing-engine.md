# 04 — XBrain Pricing Engine

**Implementation:** `packages/core/src/pricing/engine.ts` ·
**Configuration:** `packages/core/src/config/pricing.config.ts` ·
**Tests:** `packages/core/src/pricing/engine.test.ts`

## Principles

1. **Rules-based and explainable.** Version 1 is a deterministic rules engine. It is never
   presented as machine learning or autonomous AI. Every quote includes a human-readable
   explanation of how the price was calculated.
2. **Centralized configuration.** All prices, rates, multipliers, guardrails, the deposit
   percentage, and plan definitions live in one config module. No scattered hardcoded values.
   The config schema is ready for regional pricing, currency conversion, taxes, promotions,
   annual billing, bundle discounts, usage overages, and enterprise plans (fields exist;
   activation is later phases).
3. **Two outputs, two audiences.** The engine produces a **client-facing quote** and a
   **separate internal cost breakdown**. Internal margins, provider token costs, private cost
   formulas, model prompts, and infrastructure details are never in the client-facing object.
4. **Guardrails.** Computed build prices clamp into the guardrail band for the detected
   website category (landing $350–700, business $700–1,500, platform $1,500–3,500, e-commerce
   $2,000–5,000+, custom = custom quote). Guardrails are config, not magic numbers.

## Formula (v1)

### Build price

```
base            = basePrice[websiteType]
pages           = extraPageRate × billablePages(pageCount, includedPages[websiteType])
languages       = base × languageFactor × (languageCount − 1)
features        = Σ featureRate[f] for each enabled feature flag
                  (CMS, blog, e-commerce + product-count tiers, booking, payment gateway,
                   authentication, user roles, dashboard, external APIs, CRM, ERP,
                   integrations: Meta Pixel, GA4, GTM, Search Console, GBP, email marketing,
                   WhatsApp, maps; migrations: SEO, content, domain)
quality         = (base + pages + features) × Σ qualityFactors
                  (custom UI level, copywriting need, missing brand identity,
                   accessibility level, performance target, security requirement)
speed           = subtotal × rushFactor[deliverySpeed]
cost floor      = (estimatedAiExecutionCost + estimatedInfraCost) × riskBuffer(riskLevel)
                   + qaComplexityCost                                  → internal only
recommended     = clamp(round(subtotal + speed), guardrail[category])
minimum         = max(guardrail.min, recommended × minimumRatio, cost floor × marginFloor)
deposit         = recommended × depositPct        (default 0.5, configurable)
remaining       = recommended − deposit
```

Every additive/multiplicative step is emitted as a **quote line item** with a label, amount,
and reason — that list *is* the client-facing explanation. The cost floor, risk buffer, and
margin figures are emitted only into the internal breakdown.

### Monthly subscription

```
plan            = recommendPlan(scope)      // Essential | Growth | Advanced from operational load:
                                            // hosting profile, bandwidth, storage, build frequency,
                                            // change-request volume, content updates, AI allowance,
                                            // monitoring, backups, analytics, SEO/GEO monitoring,
                                            // integration monitoring, uptime, support priority,
                                            // CMS ops, e-commerce ops, security maintenance, reporting
monthly         = planPrice[plan][bundle]   // bundle = 'xability' | 'standalone'
bundleSaving    = planPrice[plan].standalone − planPrice[plan].xability   (when bundled)
overageRates    = config (per extra change request by size, per AI-execution unit)
```

Advanced is "starting at" — scope factors above its thresholds mark the quote
`requiresCustomPricing` for enterprise handling.

## Xability bundle logic

1. Bundle eligibility = organization has an `EcosystemConnection` to Xability with status
   `connected` **and** an active Xability subscription (asserted through XBrain, verified —
   never self-declared by the client UI).
2. Bundled prices come from the same central config table as standalone prices.
3. The quote shows the standalone price, the bundle price, and the saving explicitly.
4. If the Xability subscription lapses, the XSite subscription reprices to standalone at the
   next billing cycle with prior notification — never silently (governance rule: no silent
   billing modification).

## Quote contents (client-facing)

Recommended build price · minimum acceptable build price · deposit · remaining payment ·
monthly subscription (plan, price, bundle saving) · third-party costs (domain, paid tools —
pass-through, listed) · included scope · excluded scope · assumptions · risk level · delivery
estimate · quote validity date · line-item explanation.

## Never exposed

Internal model prompts · provider token details · internal margins · security-sensitive
infrastructure information · private cost formulas. These live only in
`QuoteInternalBreakdown` with a separate access policy.
