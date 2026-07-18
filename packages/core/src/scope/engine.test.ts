import { describe, expect, it } from 'vitest';
import type { BuildScope } from '../domain/types';
import {
  assessRouting,
  classifyChangeRequest,
  deriveOperationsScope,
  recommendWebsiteType,
  type DiscoveryAnswers,
} from './engine';

const answers: DiscoveryAnswers = {
  primaryGoal: 'present_business',
  industry: 'consulting',
  pageEstimate: 6,
  needsOnlinePayment: false,
  productCount: 0,
  needsBooking: false,
  needsMemberArea: false,
  contentPublishingFrequency: 'occasional',
  singleOffer: false,
};

const plainScope: BuildScope = {
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
  estimatedAiExecutionCost: 50,
  estimatedInfraCost: 15,
  riskLevel: 'low',
  qaComplexity: 'standard',
};

describe('website type recommendation', () => {
  it('recommends a business website for a general company', () => {
    expect(recommendWebsiteType(answers)).toBe('business_website');
  });
  it('recommends a landing page for a single-offer micro site', () => {
    expect(recommendWebsiteType({ ...answers, singleOffer: true, pageEstimate: 1 })).toBe('landing_page');
  });
  it('recommends e-commerce when selling with online payment', () => {
    expect(recommendWebsiteType({ ...answers, primaryGoal: 'sell_products', needsOnlinePayment: true })).toBe('ecommerce');
  });
  it('recommends a product catalog when selling without online payment', () => {
    expect(recommendWebsiteType({ ...answers, primaryGoal: 'sell_products' })).toBe('product_catalog');
  });
  it('recognizes industry-specific types', () => {
    expect(recommendWebsiteType({ ...answers, industry: 'Restaurant & Cafe' })).toBe('restaurant');
    expect(recommendWebsiteType({ ...answers, industry: 'Dental clinic' })).toBe('clinic');
    expect(recommendWebsiteType({ ...answers, industry: 'Real Estate brokerage' })).toBe('real_estate');
  });
  it('routes custom application requests to custom_web_app', () => {
    expect(recommendWebsiteType({ ...answers, primaryGoal: 'custom_application' })).toBe('custom_web_app');
  });
});

describe('XApps routing detection', () => {
  it('keeps a plain business website in XSite', () => {
    const r = assessRouting(plainScope);
    expect(r.route).toBe('xsite');
    expect(r.reasons).toHaveLength(0);
  });

  it('flags ERP integration as an XApps candidate', () => {
    const r = assessRouting({ ...plainScope, erpIntegration: true });
    expect(r.route).toBe('xapps_candidate');
    expect(r.reasons.length).toBeGreaterThan(0);
  });

  it('flags multi-role operational systems', () => {
    const r = assessRouting({ ...plainScope, userRoles: true, dashboard: true, externalApiCount: 3 });
    expect(r.route).toBe('xapps_candidate');
  });

  it('always leaves the public website manageable by XSite', () => {
    const r = assessRouting({ ...plainScope, erpIntegration: true });
    expect(r.websiteStillManagedByXsite).toBe(true);
  });
});

describe('operations profile derivation', () => {
  it('derives a heavier profile for e-commerce', () => {
    const ops = deriveOperationsScope(
      { ...plainScope, websiteType: 'ecommerce', ecommerce: true, paymentGateway: true },
      { xabilityBundleEligible: true },
    );
    expect(ops.hostingProfile).toBe('high_traffic');
    expect(ops.ecommerceOperations).toBe(true);
    expect(ops.uptimeRequirement).toBe('high');
    expect(ops.xabilityBundleEligible).toBe(true);
  });

  it('derives a light profile for a static business site', () => {
    const ops = deriveOperationsScope(plainScope, { xabilityBundleEligible: false });
    expect(ops.hostingProfile).toBe('static');
    expect(ops.aiExecutionAllowance).toBe('basic');
  });
});

describe('change-request classification (fair usage)', () => {
  it('includes small requests within the Essential allowance', () => {
    const v = classifyChangeRequest({ size: 'small', plan: 'essential', usedThisPeriod: { small: 2, medium: 0 } });
    expect(v.classification).toBe('included');
    expect(v.requiresApproval).toBe(false);
  });

  it('charges overage past the allowance and requires approval', () => {
    const v = classifyChangeRequest({ size: 'small', plan: 'essential', usedThisPeriod: { small: 3, medium: 0 } });
    expect(v.classification).toBe('overage');
    expect(v.overagePrice).toBeGreaterThan(0);
    expect(v.requiresApproval).toBe(true);
  });

  it('treats medium requests on Essential as overage (no medium allowance)', () => {
    const v = classifyChangeRequest({ size: 'medium', plan: 'essential', usedThisPeriod: { small: 0, medium: 0 } });
    expect(v.classification).toBe('overage');
  });

  it('includes medium requests on Growth within allowance', () => {
    const v = classifyChangeRequest({ size: 'medium', plan: 'growth', usedThisPeriod: { small: 0, medium: 4 } });
    expect(v.classification).toBe('included');
  });

  it('always requires approval and a fresh quote for new features and major revisions', () => {
    for (const size of ['new_feature', 'major_revision'] as const) {
      const v = classifyChangeRequest({ size, plan: 'growth', usedThisPeriod: { small: 0, medium: 0 } });
      expect(v.classification).toBe('overage');
      expect(v.requiresApproval).toBe(true);
    }
  });

  it('routes new project scope to a new quotation', () => {
    const v = classifyChangeRequest({ size: 'new_project_scope', plan: 'advanced', usedThisPeriod: { small: 0, medium: 0 } });
    expect(v.classification).toBe('new_project_scope');
  });
});
