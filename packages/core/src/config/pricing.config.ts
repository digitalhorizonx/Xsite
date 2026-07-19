import type {
  AccessibilityLevel,
  BundleKind,
  CustomUiLevel,
  DeliverySpeed,
  PerformanceTarget,
  PlanKey,
  PriceCategory,
  RiskLevel,
  Tri,
  WebsiteType,
} from '../domain/types';

/**
 * Central pricing configuration for XSite.
 *
 * EVERY price, rate, multiplier, guardrail, and allowance lives here — never
 * hardcoded elsewhere. The schema is deliberately wider than what launch
 * activates: regional pricing, currency conversion, taxes, promotions, annual
 * billing, overages, and enterprise plans have first-class fields so enabling
 * them later is configuration, not restructuring.
 *
 * The client-facing quote must never expose margins, provider costs, or the
 * private formula internals derived from this file (see pricing engine).
 */

export interface GuardrailBand {
  min: number;
  max: number;
  /** When true, `max` is guidance ("from $X"), not a hard ceiling. */
  softMax: boolean;
}

export interface PlanConfig {
  /** Monthly price per bundle kind, in `currency`. */
  monthly: Record<BundleKind, number>;
  /** "Starting at" plans require custom review above thresholds. */
  startingAt: boolean;
  /** Included change requests per month by size. */
  includedRequests: { small: number; medium: number };
  customAllowance: boolean;
}

export interface PricingConfig {
  version: string;
  currency: string;
  /** Deposit share of the build price collected after proposal approval. */
  depositPct: number;
  quoteValidityDays: number;

  guardrails: Record<Exclude<PriceCategory, 'custom'>, GuardrailBand>;
  websiteCategory: Record<WebsiteType, PriceCategory>;

  build: {
    basePrice: Record<WebsiteType, number>;
    includedPages: Record<WebsiteType, number>;
    extraPageRate: number;
    /** Multiplier of base price per additional language beyond the first. */
    languageFactor: number;
    features: {
      cms: number;
      blog: number;
      booking: number;
      paymentGateway: number;
      authentication: number;
      userRoles: number;
      dashboard: number;
      crmIntegration: number;
      erpIntegration: number;
      xabilityIntegration: number;
      externalApiRate: number;
      ecommerceBase: number;
      /** Applied on top of ecommerceBase by catalog size. */
      productTiers: Array<{ upTo: number; amount: number }>;
      trackingIntegration: number; // Meta Pixel / GA4 / GTM / Search Console / GBP each
      emailMarketing: number;
      whatsapp: number;
      maps: number;
      seoMigration: number;
      contentMigration: number;
      domainMigration: number;
      copywritingPerPage: number;
      brandIdentityMissing: number;
    };
    qualityFactors: {
      customUiLevel: Record<CustomUiLevel, number>;
      accessibility: Record<AccessibilityLevel, number>;
      performance: Record<PerformanceTarget, number>;
      security: Record<Tri, number>;
    };
    rushFactor: Record<DeliverySpeed, number>;
    /** Internal-only: multiplies estimated execution+infra cost into the cost floor. */
    riskBuffer: Record<RiskLevel, number>;
    /** Internal-only: QA complexity cost added to the cost floor. */
    qaComplexityCost: { standard: number; complex: number };
    /** Minimum acceptable price as a share of the recommended price. */
    minimumRatio: number;
    /** Internal-only: cost floor multiplier ensuring a margin floor. */
    marginFloor: number;
  };

  plans: Record<PlanKey, PlanConfig>;

  overages: {
    smallRequest: number;
    mediumRequest: number;
    /** Per additional AI execution unit beyond plan allowance (Phase 3). */
    aiExecutionUnit: number;
  };

  /** Weeks, by price category — refined by the scope engine per project. */
  deliveryEstimateWeeks: Record<PriceCategory, { min: number; max: number }>;

  // -------------------------------------------------------------------------
  // Future-ready fields (schema present, not active at launch)
  // -------------------------------------------------------------------------
  regionalMultipliers: Record<string, number>;
  taxRates: Record<string, number>;
  promotions: Array<{ code: string; pct: number; validUntil: string }>;
  annualBilling: { enabled: boolean; discountPct: number };
  enterprise: { contactThresholdBuildPrice: number };
}

export const PRICING_CONFIG: PricingConfig = {
  version: '1.0.0',
  currency: 'USD',
  depositPct: 0.5,
  quoteValidityDays: 14,

  guardrails: {
    landing: { min: 350, max: 700, softMax: false },
    business: { min: 700, max: 1500, softMax: false },
    platform: { min: 1500, max: 3500, softMax: false },
    ecommerce: { min: 2000, max: 5000, softMax: true },
  },

  websiteCategory: {
    landing_page: 'landing',
    business_website: 'business',
    portfolio: 'business',
    restaurant: 'business',
    clinic: 'business',
    corporate: 'business',
    real_estate: 'platform',
    booking: 'platform',
    blog_content: 'platform',
    product_catalog: 'platform',
    ecommerce: 'ecommerce',
    membership: 'platform',
    custom_web_app: 'custom',
  },

  build: {
    basePrice: {
      landing_page: 400,
      business_website: 750,
      portfolio: 700,
      restaurant: 800,
      clinic: 850,
      corporate: 900,
      real_estate: 1500,
      booking: 1600,
      blog_content: 1500,
      product_catalog: 1550,
      ecommerce: 2100,
      membership: 1700,
      custom_web_app: 3000,
    },
    includedPages: {
      landing_page: 1,
      business_website: 5,
      portfolio: 5,
      restaurant: 5,
      clinic: 6,
      corporate: 7,
      real_estate: 8,
      booking: 6,
      blog_content: 8,
      product_catalog: 8,
      ecommerce: 8,
      membership: 8,
      custom_web_app: 10,
    },
    extraPageRate: 45,
    languageFactor: 0.2,
    features: {
      cms: 350,
      blog: 200,
      booking: 400,
      paymentGateway: 300,
      authentication: 350,
      userRoles: 250,
      dashboard: 450,
      crmIntegration: 250,
      erpIntegration: 600,
      xabilityIntegration: 150,
      externalApiRate: 200,
      ecommerceBase: 700,
      productTiers: [
        { upTo: 25, amount: 0 },
        { upTo: 100, amount: 200 },
        { upTo: 500, amount: 450 },
        { upTo: Number.POSITIVE_INFINITY, amount: 800 },
      ],
      trackingIntegration: 40,
      emailMarketing: 120,
      whatsapp: 60,
      maps: 60,
      seoMigration: 250,
      contentMigration: 200,
      domainMigration: 100,
      copywritingPerPage: 35,
      brandIdentityMissing: 250,
    },
    qualityFactors: {
      customUiLevel: { standard: 0, custom: 0.15, premium: 0.35 },
      accessibility: { standard: 0, enhanced: 0.05, wcag_aa: 0.12 },
      performance: { standard: 0, high: 0.05, strict: 0.12 },
      security: { standard: 0, elevated: 0.05, strict: 0.12 },
    },
    rushFactor: { standard: 0, expedited: 0.15, rush: 0.3 },
    riskBuffer: { low: 1.1, medium: 1.25, high: 1.5 },
    qaComplexityCost: { standard: 60, complex: 180 },
    minimumRatio: 0.85,
    marginFloor: 1.4,
  },

  plans: {
    essential: {
      monthly: { standalone: 79, xability: 49 },
      startingAt: false,
      includedRequests: { small: 3, medium: 0 },
      customAllowance: false,
    },
    growth: {
      monthly: { standalone: 149, xability: 99 },
      startingAt: false,
      includedRequests: { small: 8, medium: 8 },
      customAllowance: false,
    },
    advanced: {
      monthly: { standalone: 299, xability: 199 },
      startingAt: true,
      includedRequests: { small: 0, medium: 0 },
      customAllowance: true,
    },
  },

  overages: {
    smallRequest: 45,
    mediumRequest: 120,
    aiExecutionUnit: 5,
  },

  deliveryEstimateWeeks: {
    landing: { min: 1, max: 2 },
    business: { min: 2, max: 4 },
    platform: { min: 3, max: 6 },
    ecommerce: { min: 4, max: 8 },
    custom: { min: 6, max: 12 },
  },

  regionalMultipliers: {},
  taxRates: {},
  promotions: [],
  annualBilling: { enabled: false, discountPct: 0.1 },
  enterprise: { contactThresholdBuildPrice: 8000 },
};
