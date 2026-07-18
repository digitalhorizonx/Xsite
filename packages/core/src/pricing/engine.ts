import { PRICING_CONFIG, type PricingConfig } from '../config/pricing.config';
import type {
  BuildScope,
  BundleKind,
  OperationsScope,
  PlanKey,
  PriceCategory,
  RiskLevel,
} from '../domain/types';
import { PLAN_LABELS, WEBSITE_TYPE_LABELS } from '../domain/types';

/**
 * XBrain pricing engine — version 1.
 *
 * Rules-based, deterministic, and explainable. This engine is NOT machine
 * learning and must never be presented as autonomous AI: every number in the
 * client-facing quote traces to a labeled line item derived from the central
 * pricing configuration.
 *
 * It produces two separate objects:
 *  - `ClientQuote`        — safe to serialize to clients.
 *  - `InternalBreakdown`  — margins, cost estimates, formula trace. Stored
 *                           separately, NEVER sent through client-facing APIs.
 */

export interface QuoteLineItem {
  key: string;
  label: string;
  amount: number;
  kind: 'base' | 'addition' | 'multiplier' | 'adjustment';
  reason: string;
}

export interface MonthlyQuote {
  plan: PlanKey;
  planLabel: string;
  bundle: BundleKind;
  price: number;
  standalonePrice: number;
  bundleSaving: number;
  startingAt: boolean;
  includedRequests: { small: number; medium: number };
}

export interface ThirdPartyCost {
  label: string;
  estimate: string;
  note: string;
}

export interface ClientQuote {
  configVersion: string;
  currency: string;
  websiteType: BuildScope['websiteType'];
  websiteTypeLabel: string;
  priceCategory: PriceCategory;
  buildPrice: number;
  minimumBuildPrice: number;
  depositPct: number;
  depositAmount: number;
  remainingAmount: number;
  monthly: MonthlyQuote;
  thirdPartyCosts: ThirdPartyCost[];
  includedScope: string[];
  excludedScope: string[];
  assumptions: string[];
  riskLevel: RiskLevel;
  deliveryEstimateWeeks: { min: number; max: number };
  quoteValidityDays: number;
  lineItems: QuoteLineItem[];
  explanation: string[];
  requiresCustomPricing: boolean;
}

export interface InternalBreakdown {
  aiExecutionCostEstimate: number;
  infraCostEstimate: number;
  riskBufferFactor: number;
  qaComplexityCost: number;
  costFloor: number;
  minimumFromMarginFloor: number;
  preClampSubtotal: number;
  clampedBy: 'none' | 'guardrail_min' | 'guardrail_max';
  marginAtRecommended: number;
  formulaTrace: string[];
}

export interface QuoteResult {
  quote: ClientQuote;
  internal: InternalBreakdown;
}

const round = (n: number): number => Math.round(n);

function productTierAmount(config: PricingConfig, productCount: number): number {
  for (const tier of config.build.features.productTiers) {
    if (productCount <= tier.upTo) return tier.amount;
  }
  return 0;
}

export function recommendPlan(ops: OperationsScope): PlanKey {
  let load = 0;
  if (ops.hostingProfile === 'standard') load += 1;
  if (ops.hostingProfile === 'high_traffic') load += 3;
  if (ops.expectedMonthlyChangeRequests > 3) load += 1;
  if (ops.expectedMonthlyChangeRequests > 8) load += 2;
  if (ops.monthlyContentUpdates > 4) load += 1;
  if (ops.aiExecutionAllowance === 'standard') load += 1;
  if (ops.aiExecutionAllowance === 'extended') load += 2;
  if (ops.cmsOperations) load += 1;
  if (ops.ecommerceOperations) load += 3;
  if (ops.seoMonitoring) load += 1;
  if (ops.geoMonitoring) load += 1;
  if (ops.integrationMonitoring) load += 1;
  if (ops.uptimeRequirement === 'high') load += 2;
  if (ops.supportPriority === 'priority') load += 2;
  if (ops.reporting === 'weekly') load += 1;

  if (load >= 8) return 'advanced';
  if (load >= 3) return 'growth';
  return 'essential';
}

export function calculateQuote(
  scope: BuildScope,
  ops: OperationsScope,
  config: PricingConfig = PRICING_CONFIG,
): QuoteResult {
  const b = config.build;
  const f = b.features;
  const lineItems: QuoteLineItem[] = [];
  const trace: string[] = [];

  const category = config.websiteCategory[scope.websiteType];
  const typeLabel = WEBSITE_TYPE_LABELS[scope.websiteType];

  // --- Base ----------------------------------------------------------------
  const base = b.basePrice[scope.websiteType];
  lineItems.push({
    key: 'base',
    label: `${typeLabel} base`,
    amount: base,
    kind: 'base',
    reason: `Base build for a ${typeLabel.toLowerCase()} including ${b.includedPages[scope.websiteType]} page(s), project setup, and delivery management.`,
  });

  // --- Pages ---------------------------------------------------------------
  const extraPages = Math.max(0, scope.pageCount - b.includedPages[scope.websiteType]);
  const pagesAmount = extraPages * b.extraPageRate;
  if (pagesAmount > 0) {
    lineItems.push({
      key: 'pages',
      label: `${extraPages} additional page(s)`,
      amount: pagesAmount,
      kind: 'addition',
      reason: `${extraPages} page(s) beyond the ${b.includedPages[scope.websiteType]} included, at ${config.currency} ${b.extraPageRate} per page.`,
    });
  }

  // --- Languages -----------------------------------------------------------
  const extraLanguages = Math.max(0, scope.languageCount - 1);
  const languagesAmount = round(base * b.languageFactor * extraLanguages);
  if (languagesAmount > 0) {
    lineItems.push({
      key: 'languages',
      label: `${extraLanguages} additional language(s)`,
      amount: languagesAmount,
      kind: 'addition',
      reason: `Each additional language adds ${b.languageFactor * 100}% of the base price for translation-ready structure and localized content handling.`,
    });
  }

  // --- Feature flags -------------------------------------------------------
  const flag = (key: string, enabled: boolean, amount: number, label: string, reason: string) => {
    if (enabled && amount > 0) lineItems.push({ key, label, amount, kind: 'addition', reason });
  };

  flag('cms', scope.cms, f.cms, 'Content management system', 'Editable content areas with an admin editing workflow.');
  flag('blog', scope.blog, f.blog, 'Blog', 'Blog structure, listing, article templates, and categories.');
  if (scope.ecommerce) {
    const tier = productTierAmount(config, scope.productCount);
    lineItems.push({
      key: 'ecommerce',
      label: 'E-commerce',
      amount: f.ecommerceBase + tier,
      kind: 'addition',
      reason: `Product catalog, cart, and checkout flows${tier > 0 ? ` sized for up to ${scope.productCount} products` : ''}.`,
    });
  }
  flag('booking', scope.booking, f.booking, 'Booking', 'Booking flow, availability handling, and confirmations.');
  flag('paymentGateway', scope.paymentGateway, f.paymentGateway, 'Payment gateway', 'Payment provider integration with secure checkout.');
  flag('authentication', scope.authentication, f.authentication, 'User authentication', 'Account creation, login, and session handling.');
  flag('userRoles', scope.userRoles, f.userRoles, 'User roles', 'Role-based access for different user types.');
  flag('dashboard', scope.dashboard, f.dashboard, 'Dashboard', 'Authenticated dashboard area.');
  if (scope.externalApiCount > 0) {
    lineItems.push({
      key: 'externalApis',
      label: `${scope.externalApiCount} external API integration(s)`,
      amount: scope.externalApiCount * f.externalApiRate,
      kind: 'addition',
      reason: `Integration, error handling, and testing per external API (${config.currency} ${f.externalApiRate} each).`,
    });
  }
  flag('crm', scope.crmIntegration, f.crmIntegration, 'CRM integration', 'Lead/contact sync into your CRM.');
  flag('erp', scope.erpIntegration, f.erpIntegration, 'ERP integration', 'ERP connectivity with mapping and validation.');
  flag('xability', scope.xabilityIntegration, f.xabilityIntegration, 'Xability integration', 'Connection to your Xability marketing workspace for shared brand and content data.');

  const trackingCount = [
    scope.metaPixel,
    scope.googleAnalytics,
    scope.googleTagManager,
    scope.searchConsole,
    scope.googleBusinessProfile,
  ].filter(Boolean).length;
  if (trackingCount > 0) {
    lineItems.push({
      key: 'tracking',
      label: `${trackingCount} tracking & search integration(s)`,
      amount: trackingCount * f.trackingIntegration,
      kind: 'addition',
      reason: 'Setup and verification of analytics, tag management, pixel, and search integrations.',
    });
  }
  flag('emailMarketing', scope.emailMarketing, f.emailMarketing, 'Email marketing integration', 'Signup forms and audience sync with your email platform.');
  flag('whatsapp', scope.whatsapp, f.whatsapp, 'WhatsApp integration', 'WhatsApp contact entry points.');
  flag('maps', scope.maps, f.maps, 'Maps integration', 'Location maps and directions.');
  flag('seoMigration', scope.seoMigration, f.seoMigration, 'SEO migration', 'Redirect mapping and ranking-safe URL migration.');
  flag('contentMigration', scope.contentMigration, f.contentMigration, 'Content migration', 'Migration of existing content into the new structure.');
  flag('domainMigration', scope.domainMigration, f.domainMigration, 'Domain migration', 'Safe DNS cut-over of your existing domain.');
  flag(
    'copywriting',
    scope.copywritingRequired,
    round(scope.pageCount * f.copywritingPerPage),
    'Copywriting',
    `Professional copy drafted for ${scope.pageCount} page(s), delivered for your approval.`,
  );
  flag(
    'brandIdentity',
    !scope.brandIdentityAvailable,
    f.brandIdentityMissing,
    'Starter brand kit',
    'No existing brand identity was provided — includes logo refinement, palette, and typography foundations.',
  );

  const additive = lineItems.reduce((sum, li) => sum + li.amount, 0);
  trace.push(`additive subtotal = ${additive}`);

  // --- Quality multipliers -------------------------------------------------
  const q = b.qualityFactors;
  const qualityFactor =
    q.customUiLevel[scope.customUiLevel] +
    q.accessibility[scope.accessibilityLevel] +
    q.performance[scope.performanceTarget] +
    q.security[scope.securityRequirement];
  const qualityAmount = round(additive * qualityFactor);
  if (qualityAmount > 0) {
    const parts: string[] = [];
    if (q.customUiLevel[scope.customUiLevel] > 0) parts.push(`${scope.customUiLevel} UI design`);
    if (q.accessibility[scope.accessibilityLevel] > 0) parts.push(`${scope.accessibilityLevel === 'wcag_aa' ? 'WCAG AA accessibility' : 'enhanced accessibility'}`);
    if (q.performance[scope.performanceTarget] > 0) parts.push(`${scope.performanceTarget} performance target`);
    if (q.security[scope.securityRequirement] > 0) parts.push(`${scope.securityRequirement} security requirement`);
    lineItems.push({
      key: 'quality',
      label: 'Quality level',
      amount: qualityAmount,
      kind: 'multiplier',
      reason: `Raised quality bar: ${parts.join(', ')} (+${round(qualityFactor * 100)}%).`,
    });
  }

  // --- Delivery speed ------------------------------------------------------
  const rushFactor = b.rushFactor[scope.deliverySpeed];
  const rushAmount = round((additive + qualityAmount) * rushFactor);
  if (rushAmount > 0) {
    lineItems.push({
      key: 'rush',
      label: scope.deliverySpeed === 'rush' ? 'Rush delivery' : 'Expedited delivery',
      amount: rushAmount,
      kind: 'multiplier',
      reason: `Prioritized scheduling and parallel execution (+${round(rushFactor * 100)}%).`,
    });
  }

  const preClamp = additive + qualityAmount + rushAmount;
  trace.push(`pre-clamp subtotal = ${preClamp}`);

  // --- Internal cost floor (never client-facing) ---------------------------
  const riskBufferFactor = b.riskBuffer[scope.riskLevel];
  const qaCost = scope.qaComplexity === 'complex' ? b.qaComplexityCost.complex : b.qaComplexityCost.standard;
  const costFloor = round(
    (scope.estimatedAiExecutionCost + scope.estimatedInfraCost) * riskBufferFactor + qaCost,
  );
  trace.push(`cost floor = (${scope.estimatedAiExecutionCost} + ${scope.estimatedInfraCost}) × ${riskBufferFactor} + ${qaCost} = ${costFloor}`);

  // --- Guardrail clamp -----------------------------------------------------
  const requiresCustomPricing =
    category === 'custom' || preClamp >= config.enterprise.contactThresholdBuildPrice;

  let recommended = round(preClamp);
  let clampedBy: InternalBreakdown['clampedBy'] = 'none';
  if (category !== 'custom') {
    const rail = config.guardrails[category];
    if (recommended < rail.min) {
      recommended = rail.min;
      clampedBy = 'guardrail_min';
      lineItems.push({
        key: 'guardrail_min',
        label: 'Category minimum applied',
        amount: rail.min - round(preClamp),
        kind: 'adjustment',
        reason: `Adjusted to the minimum for this website category (${config.currency} ${rail.min}) to guarantee full delivery quality.`,
      });
    } else if (!rail.softMax && recommended > rail.max) {
      recommended = rail.max;
      clampedBy = 'guardrail_max';
      lineItems.push({
        key: 'guardrail_max',
        label: 'Category cap applied',
        amount: rail.max - round(preClamp),
        kind: 'adjustment',
        reason: `Capped at the standard maximum for this website category (${config.currency} ${rail.max}).`,
      });
    }
  }
  trace.push(`recommended (after clamp ${clampedBy}) = ${recommended}`);

  // --- Minimum acceptable price -------------------------------------------
  const minFromRatio = round(recommended * b.minimumRatio);
  const minFromMargin = round(costFloor * b.marginFloor);
  const railMin = category !== 'custom' ? config.guardrails[category].min : 0;
  const minimum = Math.max(railMin, minFromRatio, minFromMargin);
  trace.push(`minimum = max(rail ${railMin}, ratio ${minFromRatio}, marginFloor ${minFromMargin}) = ${minimum}`);

  // --- Payments ------------------------------------------------------------
  const deposit = round(recommended * config.depositPct);
  const remaining = recommended - deposit;

  // --- Monthly plan --------------------------------------------------------
  const planKey = recommendPlan(ops);
  const plan = config.plans[planKey];
  const bundle: BundleKind = ops.xabilityBundleEligible ? 'xability' : 'standalone';
  const monthlyPrice = plan.monthly[bundle];
  const monthly: MonthlyQuote = {
    plan: planKey,
    planLabel: PLAN_LABELS[planKey],
    bundle,
    price: monthlyPrice,
    standalonePrice: plan.monthly.standalone,
    bundleSaving: bundle === 'xability' ? plan.monthly.standalone - monthlyPrice : 0,
    startingAt: plan.startingAt,
    includedRequests: plan.includedRequests,
  };

  // --- Client-facing narrative --------------------------------------------
  const includedScope = lineItems
    .filter((li) => li.kind === 'base' || li.kind === 'addition')
    .map((li) => li.label);
  const excludedScope = [
    'Third-party subscription fees (domains, paid tools, ad spend)',
    'Features not listed in the included scope',
    'Content in languages beyond the quoted language count',
    scope.ecommerce ? 'Product photography' : 'Photography and custom illustration',
    'Ongoing work beyond the monthly plan allowance (quoted separately as change requests)',
  ];
  const assumptions = [
    'Business information and approvals are provided within agreed review windows.',
    scope.brandIdentityAvailable
      ? 'Existing brand identity assets are provided and usable.'
      : 'The starter brand kit produced during this project is approved before design begins.',
    'Scope changes during delivery are handled through the change-request process and may adjust price or timeline.',
    `Prices are in ${config.currency}; the quote is valid for ${config.quoteValidityDays} days.`,
    `The monthly subscription starts when the website goes live.`,
  ];
  const thirdPartyCosts: ThirdPartyCost[] = [
    { label: 'Domain registration', estimate: '~$10–40 / year', note: 'Paid to the registrar; the domain is registered under your ownership.' },
    ...(scope.paymentGateway
      ? [{ label: 'Payment gateway fees', estimate: 'per provider', note: 'Transaction fees charged by the payment provider.' }]
      : []),
    ...(scope.emailMarketing
      ? [{ label: 'Email marketing platform', estimate: 'per provider plan', note: 'Subscription billed by your email platform.' }]
      : []),
  ];

  const explanation = [
    `This quote was calculated by XSite's rules-based pricing engine (configuration v${config.version}) from the scope you approved — it is a transparent, itemized calculation, not a black box.`,
    `We start from the ${typeLabel.toLowerCase()} base price, add each scoped feature as a line item, then apply quality and delivery-speed adjustments.`,
    ...(clampedBy !== 'none'
      ? [`The result was adjusted to stay within our published range for this website category.`]
      : []),
    `The deposit is ${round(config.depositPct * 100)}% of the build price, payable after you approve the proposal; the remainder is due before production launch.`,
    `The ${monthly.planLabel} plan covers hosting, monitoring, maintenance, and your included change requests; it begins only when the website goes live.`,
    ...(monthly.bundleSaving > 0
      ? [`As an Xability subscriber you save ${config.currency} ${monthly.bundleSaving}/month on the plan price.`]
      : []),
    ...(requiresCustomPricing
      ? ['This project is at custom-quote scale, so the figures above are a guiding estimate pending a tailored proposal.']
      : []),
  ];

  const quote: ClientQuote = {
    configVersion: config.version,
    currency: config.currency,
    websiteType: scope.websiteType,
    websiteTypeLabel: typeLabel,
    priceCategory: category,
    buildPrice: recommended,
    minimumBuildPrice: minimum,
    depositPct: config.depositPct,
    depositAmount: deposit,
    remainingAmount: remaining,
    monthly,
    thirdPartyCosts,
    includedScope,
    excludedScope,
    assumptions,
    riskLevel: scope.riskLevel,
    deliveryEstimateWeeks: config.deliveryEstimateWeeks[category],
    quoteValidityDays: config.quoteValidityDays,
    lineItems,
    explanation,
    requiresCustomPricing,
  };

  const internal: InternalBreakdown = {
    aiExecutionCostEstimate: scope.estimatedAiExecutionCost,
    infraCostEstimate: scope.estimatedInfraCost,
    riskBufferFactor,
    qaComplexityCost: qaCost,
    costFloor,
    minimumFromMarginFloor: minFromMargin,
    preClampSubtotal: preClamp,
    clampedBy,
    marginAtRecommended: recommended - costFloor,
    formulaTrace: trace,
  };

  return { quote, internal };
}

/**
 * Keys that must never appear in a client-facing quote serialization.
 * Used by tests and API serializers as a defense-in-depth check.
 */
export const FORBIDDEN_CLIENT_QUOTE_KEYS = [
  'aiExecutionCostEstimate',
  'infraCostEstimate',
  'riskBufferFactor',
  'costFloor',
  'marginAtRecommended',
  'formulaTrace',
  'estimatedAiExecutionCost',
  'estimatedInfraCost',
] as const;
