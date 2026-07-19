import { describe, expect, it } from 'vitest';
import { PRICING_CONFIG } from '../config/pricing.config';
import type { BuildScope, OperationsScope } from '../domain/types';
import { calculateQuote, FORBIDDEN_CLIENT_QUOTE_KEYS, recommendPlan } from './engine';

const baseScope: BuildScope = {
  websiteType: 'business_website',
  pageCount: 5,
  languageCount: 1,
  customUiLevel: 'standard',
  copywritingRequired: false,
  brandIdentityAvailable: true,
  cms: false,
  blog: false,
  ecommerce: false,
  productCount: 0,
  booking: false,
  paymentGateway: false,
  authentication: false,
  userRoles: false,
  dashboard: false,
  externalApiCount: 0,
  crmIntegration: false,
  erpIntegration: false,
  xabilityIntegration: false,
  metaPixel: false,
  googleAnalytics: false,
  googleTagManager: false,
  searchConsole: false,
  googleBusinessProfile: false,
  emailMarketing: false,
  whatsapp: false,
  maps: false,
  seoMigration: false,
  contentMigration: false,
  domainMigration: false,
  accessibilityLevel: 'standard',
  performanceTarget: 'standard',
  securityRequirement: 'standard',
  deliverySpeed: 'standard',
  estimatedAiExecutionCost: 60,
  estimatedInfraCost: 20,
  riskLevel: 'low',
  qaComplexity: 'standard',
};

const baseOps: OperationsScope = {
  hostingProfile: 'static',
  expectedMonthlyChangeRequests: 2,
  monthlyContentUpdates: 1,
  aiExecutionAllowance: 'basic',
  cmsOperations: false,
  ecommerceOperations: false,
  seoMonitoring: false,
  geoMonitoring: false,
  integrationMonitoring: false,
  uptimeRequirement: 'standard',
  supportPriority: 'standard',
  securityMaintenance: true,
  reporting: 'monthly',
  xabilityBundleEligible: false,
};

describe('pricing engine — build price', () => {
  it('prices a simple business website inside its guardrail band', () => {
    const { quote } = calculateQuote(baseScope, baseOps);
    expect(quote.buildPrice).toBeGreaterThanOrEqual(700);
    expect(quote.buildPrice).toBeLessThanOrEqual(1500);
    expect(quote.priceCategory).toBe('business');
    expect(quote.requiresCustomPricing).toBe(false);
  });

  it('prices a landing page inside 350–700', () => {
    const { quote } = calculateQuote(
      { ...baseScope, websiteType: 'landing_page', pageCount: 1 },
      baseOps,
    );
    expect(quote.buildPrice).toBeGreaterThanOrEqual(350);
    expect(quote.buildPrice).toBeLessThanOrEqual(700);
  });

  it('clamps an overloaded business site to the category cap', () => {
    const { quote, internal } = calculateQuote(
      {
        ...baseScope,
        pageCount: 20,
        languageCount: 3,
        cms: true,
        blog: true,
        booking: true,
        customUiLevel: 'premium',
        deliverySpeed: 'rush',
      },
      baseOps,
    );
    expect(internal.preClampSubtotal).toBeGreaterThan(1500);
    expect(quote.buildPrice).toBe(1500);
    expect(internal.clampedBy).toBe('guardrail_max');
    expect(quote.lineItems.some((li) => li.key === 'guardrail_max')).toBe(true);
  });

  it('lets e-commerce exceed the soft max (no hard cap)', () => {
    const { quote } = calculateQuote(
      {
        ...baseScope,
        websiteType: 'ecommerce',
        ecommerce: true,
        productCount: 400,
        pageCount: 15,
        paymentGateway: true,
        authentication: true,
        customUiLevel: 'premium',
        languageCount: 2,
        cms: true,
        deliverySpeed: 'rush',
        externalApiCount: 1,
      },
      baseOps,
    );
    expect(quote.buildPrice).toBeGreaterThanOrEqual(2000);
    // soft max: allowed above 5000 when scope justifies it
    expect(quote.lineItems.some((li) => li.key === 'guardrail_max')).toBe(false);
  });

  it('flags custom web applications for custom pricing', () => {
    const { quote } = calculateQuote({ ...baseScope, websiteType: 'custom_web_app' }, baseOps);
    expect(quote.requiresCustomPricing).toBe(true);
  });

  it('computes deposit and remaining from the configurable deposit percentage', () => {
    const { quote } = calculateQuote(baseScope, baseOps);
    expect(quote.depositAmount).toBe(Math.round(quote.buildPrice * PRICING_CONFIG.depositPct));
    expect(quote.depositAmount + quote.remainingAmount).toBe(quote.buildPrice);

    const customConfig = { ...PRICING_CONFIG, depositPct: 0.3 };
    const { quote: q30 } = calculateQuote(baseScope, baseOps, customConfig);
    expect(q30.depositAmount).toBe(Math.round(q30.buildPrice * 0.3));
  });

  it('keeps the minimum price at or above the guardrail minimum and margin floor', () => {
    const { quote, internal } = calculateQuote(baseScope, baseOps);
    expect(quote.minimumBuildPrice).toBeGreaterThanOrEqual(700);
    expect(quote.minimumBuildPrice).toBeGreaterThanOrEqual(internal.minimumFromMarginFloor);
    expect(quote.minimumBuildPrice).toBeLessThanOrEqual(quote.buildPrice);
  });

  it('is deterministic', () => {
    const a = calculateQuote(baseScope, baseOps);
    const b = calculateQuote(baseScope, baseOps);
    expect(a.quote).toEqual(b.quote);
    expect(a.internal).toEqual(b.internal);
  });
});

describe('pricing engine — client/internal separation', () => {
  it('never leaks internal cost fields into the client-facing quote', () => {
    const { quote } = calculateQuote(baseScope, baseOps);
    const serialized = JSON.stringify(quote);
    for (const key of FORBIDDEN_CLIENT_QUOTE_KEYS) {
      expect(serialized).not.toContain(`"${key}"`);
    }
    expect(serialized).not.toContain('margin');
  });

  it('keeps cost estimates and formula trace in the internal breakdown only', () => {
    const { internal } = calculateQuote(baseScope, baseOps);
    expect(internal.aiExecutionCostEstimate).toBe(60);
    expect(internal.formulaTrace.length).toBeGreaterThan(0);
  });

  it('produces a human-readable explanation and line items', () => {
    const { quote } = calculateQuote(baseScope, baseOps);
    expect(quote.explanation.length).toBeGreaterThan(2);
    expect(quote.lineItems[0]?.kind).toBe('base');
    expect(quote.assumptions.length).toBeGreaterThan(0);
    expect(quote.excludedScope.length).toBeGreaterThan(0);
  });
});

describe('pricing engine — monthly plans & bundle logic', () => {
  it('recommends Essential for a simple static site', () => {
    expect(recommendPlan(baseOps)).toBe('essential');
  });

  it('recommends Advanced for e-commerce operations', () => {
    const plan = recommendPlan({
      ...baseOps,
      hostingProfile: 'high_traffic',
      ecommerceOperations: true,
      uptimeRequirement: 'high',
      supportPriority: 'priority',
    });
    expect(plan).toBe('advanced');
  });

  it('applies the Xability bundle price and shows the saving', () => {
    const { quote } = calculateQuote(baseScope, { ...baseOps, xabilityBundleEligible: true });
    const plan = PRICING_CONFIG.plans[quote.monthly.plan];
    expect(quote.monthly.bundle).toBe('xability');
    expect(quote.monthly.price).toBe(plan.monthly.xability);
    expect(quote.monthly.bundleSaving).toBe(plan.monthly.standalone - plan.monthly.xability);
    expect(quote.monthly.bundleSaving).toBeGreaterThan(0);
  });

  it('uses standalone pricing when not bundle-eligible', () => {
    const { quote } = calculateQuote(baseScope, baseOps);
    expect(quote.monthly.bundle).toBe('standalone');
    expect(quote.monthly.bundleSaving).toBe(0);
  });

  it('matches the launch price table', () => {
    expect(PRICING_CONFIG.plans.essential.monthly).toEqual({ standalone: 79, xability: 49 });
    expect(PRICING_CONFIG.plans.growth.monthly).toEqual({ standalone: 149, xability: 99 });
    expect(PRICING_CONFIG.plans.advanced.monthly).toEqual({ standalone: 299, xability: 199 });
  });
});
