import type {
  BuildScope,
  ChangeRequestClassification,
  ChangeRequestSize,
  OperationsScope,
  PlanKey,
  WebsiteType,
} from '../domain/types';
import { PRICING_CONFIG, type PricingConfig } from '../config/pricing.config';

/**
 * XBrain scope engine — rules-based analysis of a discovery result.
 *
 * Responsibilities:
 *  1. Recommend a website type from discovery answers.
 *  2. Detect when a request is really an application and should be routed to
 *     XApps later (XSite may still manage the public website).
 *  3. Derive a default operations profile from the build scope.
 *  4. Classify change requests against plan allowances (fair usage).
 */

// ---------------------------------------------------------------------------
// Discovery → website type
// ---------------------------------------------------------------------------

export interface DiscoveryAnswers {
  primaryGoal:
    | 'present_business'
    | 'generate_leads'
    | 'sell_products'
    | 'take_bookings'
    | 'publish_content'
    | 'showcase_work'
    | 'run_membership'
    | 'custom_application';
  industry: string;
  pageEstimate: number;
  needsOnlinePayment: boolean;
  productCount: number;
  needsBooking: boolean;
  needsMemberArea: boolean;
  contentPublishingFrequency: 'none' | 'occasional' | 'weekly' | 'daily';
  singleOffer: boolean;
}

export function recommendWebsiteType(a: DiscoveryAnswers): WebsiteType {
  if (a.primaryGoal === 'custom_application') return 'custom_web_app';
  if (a.primaryGoal === 'sell_products' && a.needsOnlinePayment) return 'ecommerce';
  if (a.primaryGoal === 'sell_products') return 'product_catalog';
  if (a.primaryGoal === 'run_membership' || a.needsMemberArea) return 'membership';
  if (a.primaryGoal === 'take_bookings' || a.needsBooking) return 'booking';
  if (a.primaryGoal === 'publish_content' || a.contentPublishingFrequency === 'daily') return 'blog_content';
  if (a.primaryGoal === 'showcase_work') return 'portfolio';

  const industry = a.industry.toLowerCase();
  if (industry.includes('restaurant') || industry.includes('cafe')) return 'restaurant';
  if (industry.includes('clinic') || industry.includes('dental') || industry.includes('medical')) return 'clinic';
  if (industry.includes('real estate') || industry.includes('property')) return 'real_estate';

  if (a.singleOffer && a.pageEstimate <= 2) return 'landing_page';
  if (a.pageEstimate >= 10) return 'corporate';
  return 'business_website';
}

// ---------------------------------------------------------------------------
// XApps routing detection
// ---------------------------------------------------------------------------

export interface RoutingAssessment {
  route: 'xsite' | 'xapps_candidate';
  /** Human-readable signals that triggered the assessment. */
  reasons: string[];
  /** XSite can still manage the public website even when the app goes to XApps. */
  websiteStillManagedByXsite: boolean;
}

/**
 * Detect requests that are really operational applications (ERP, CRM,
 * multi-role systems, workflow-heavy SaaS, complex marketplaces…) rather than
 * websites. These should be routed to XApps when it activates.
 */
export function assessRouting(scope: BuildScope): RoutingAssessment {
  const reasons: string[] = [];

  if (scope.erpIntegration) reasons.push('ERP-level integration requested');
  if (scope.websiteType === 'custom_web_app') reasons.push('Client asked for a custom web application');
  if (scope.userRoles && scope.dashboard && scope.externalApiCount >= 2) {
    reasons.push('Multi-role operational system signals: roles + dashboard + multiple external APIs');
  }
  if (scope.userRoles && scope.authentication && scope.crmIntegration && scope.erpIntegration) {
    reasons.push('Workflow-heavy internal system signals');
  }
  if (scope.ecommerce && scope.userRoles && scope.externalApiCount >= 3) {
    reasons.push('Marketplace-scale complexity');
  }

  const isCandidate = reasons.length > 0;
  return {
    route: isCandidate ? 'xapps_candidate' : 'xsite',
    reasons,
    websiteStillManagedByXsite: true,
  };
}

// ---------------------------------------------------------------------------
// Build scope → default operations profile
// ---------------------------------------------------------------------------

export function deriveOperationsScope(
  scope: BuildScope,
  opts: { xabilityBundleEligible: boolean },
): OperationsScope {
  const heavy = scope.ecommerce || scope.websiteType === 'custom_web_app';
  const moderate = scope.cms || scope.blog || scope.booking;
  return {
    hostingProfile: heavy ? 'high_traffic' : moderate ? 'standard' : 'static',
    expectedMonthlyChangeRequests: heavy ? 6 : moderate ? 4 : 2,
    monthlyContentUpdates: scope.cms || scope.blog ? 4 : 1,
    aiExecutionAllowance: heavy ? 'extended' : moderate ? 'standard' : 'basic',
    cmsOperations: scope.cms,
    ecommerceOperations: scope.ecommerce,
    seoMonitoring: true,
    geoMonitoring: true,
    integrationMonitoring:
      scope.crmIntegration ||
      scope.erpIntegration ||
      scope.paymentGateway ||
      scope.emailMarketing ||
      scope.externalApiCount > 0,
    uptimeRequirement: heavy ? 'high' : 'standard',
    supportPriority: heavy ? 'priority' : 'standard',
    securityMaintenance: true,
    reporting: 'monthly',
    xabilityBundleEligible: opts.xabilityBundleEligible,
  };
}

// ---------------------------------------------------------------------------
// Change-request classification (fair usage)
// ---------------------------------------------------------------------------

export interface ChangeRequestInput {
  size: ChangeRequestSize;
  plan: PlanKey;
  /** Requests already consumed this period, by size. */
  usedThisPeriod: { small: number; medium: number };
}

export interface ChangeRequestVerdict {
  classification: ChangeRequestClassification;
  /** Overage price when classification is 'overage'; 0 otherwise. */
  overagePrice: number;
  requiresApproval: boolean;
  explanation: string;
}

export function classifyChangeRequest(
  input: ChangeRequestInput,
  config: PricingConfig = PRICING_CONFIG,
): ChangeRequestVerdict {
  const plan = config.plans[input.plan];

  if (input.size === 'new_project_scope') {
    return {
      classification: 'new_project_scope',
      overagePrice: 0,
      requiresApproval: true,
      explanation: 'This request is a new project and needs its own scope and quotation.',
    };
  }
  if (input.size === 'major_revision' || input.size === 'new_feature') {
    return {
      classification: 'overage',
      overagePrice: 0, // quoted individually via the pricing engine
      requiresApproval: true,
      explanation:
        input.size === 'major_revision'
          ? 'Major revisions are quoted individually before any work starts.'
          : 'New features are quoted individually before any work starts.',
    };
  }

  if (plan.customAllowance) {
    return {
      classification: 'included',
      overagePrice: 0,
      requiresApproval: false,
      explanation: 'Covered by your plan’s custom allowance.',
    };
  }

  const allowance = plan.includedRequests[input.size];
  const used = input.usedThisPeriod[input.size];
  // Medium requests may also consume the shared medium allowance only; small
  // requests count against the small allowance.
  if (used < allowance) {
    return {
      classification: 'included',
      overagePrice: 0,
      requiresApproval: false,
      explanation: `Included in your plan (${used + 1} of ${allowance} ${input.size} requests this month).`,
    };
  }

  const overagePrice =
    input.size === 'small' ? config.overages.smallRequest : config.overages.mediumRequest;
  return {
    classification: 'overage',
    overagePrice,
    requiresApproval: true,
    explanation: `Your plan’s included ${input.size} requests for this month are used, so this is billed as an overage (${config.currency} ${overagePrice}) and needs your approval before work starts.`,
  };
}
