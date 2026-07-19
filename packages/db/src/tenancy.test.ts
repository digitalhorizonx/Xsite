import { afterEach, describe, expect, it } from 'vitest';
import { prisma } from './client';
import { NotFoundError, requireProjectInOrg, requireQuoteInOrg, TenantAccessError } from './tenancy';
import { createProject } from './repositories/projects';
import { persistQuote, getClientQuote } from './repositories/quotes';
import { saveScopeCalculation } from './repositories/projects';
import { calculateQuote, deriveOperationsScope, type BuildScope } from '@xsite/core';
import { makeOrgWithOwner, truncateAll } from './test/helpers';

afterEach(async () => {
  await truncateAll();
});

const scope: BuildScope = {
  websiteType: 'landing_page',
  pageCount: 1,
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
  estimatedAiExecutionCost: 40,
  estimatedInfraCost: 10,
  riskLevel: 'low',
  qaComplexity: 'standard',
};

describe('cross-tenant access is rejected (real database)', () => {
  it('rejects reading a project that belongs to a different organization', async () => {
    const { organization: orgA } = await makeOrgWithOwner('a');
    const { organization: orgB, user: userB } = await makeOrgWithOwner('b');
    const project = await createProject({
      organizationId: orgA.id,
      name: 'A-only project',
      websiteType: 'landing_page',
      createdByUserId: userB.id,
    });

    await expect(requireProjectInOrg(orgB.id, project.id)).rejects.toBeInstanceOf(TenantAccessError);
    // org A itself can read it fine
    await expect(requireProjectInOrg(orgA.id, project.id)).resolves.toMatchObject({ id: project.id });
  });

  it('returns NotFoundError (not a tenant error) for a nonexistent project', async () => {
    const { organization } = await makeOrgWithOwner('none');
    await expect(
      requireProjectInOrg(organization.id, '00000000-0000-0000-0000-000000000099'),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejects reading a quote that belongs to a different organization', async () => {
    const { organization: orgA, user: userA } = await makeOrgWithOwner('qa');
    const { organization: orgB } = await makeOrgWithOwner('qb');

    const project = await createProject({
      organizationId: orgA.id,
      name: 'A quote project',
      websiteType: 'landing_page',
      createdByUserId: userA.id,
    });
    const operationsScope = deriveOperationsScope(scope, { xabilityBundleEligible: false });
    const scopeCalc = await saveScopeCalculation({
      organizationId: orgA.id,
      projectId: project.id,
      buildScope: scope,
      operationsScope,
    });
    const result = calculateQuote(scope, operationsScope);
    const quote = await persistQuote({
      organizationId: orgA.id,
      projectId: project.id,
      scopeCalculationId: scopeCalc.id,
      result,
      actorId: 'pricing',
    });

    await expect(requireQuoteInOrg(orgB.id, quote.id)).rejects.toBeInstanceOf(TenantAccessError);
    await expect(getClientQuote(orgB.id, quote.id)).rejects.toBeInstanceOf(TenantAccessError);

    // org A can read its own quote and gets ONLY client-facing fields
    const clientQuote = await getClientQuote(orgA.id, quote.id);
    expect(clientQuote.buildPrice).toBeGreaterThan(0);
    expect(JSON.stringify(clientQuote)).not.toContain('costFloor');
    expect(JSON.stringify(clientQuote)).not.toContain('marginAtRecommended');
  });

  it('rejects payments/change-requests scoping via the same project guard (spot check)', async () => {
    const { organization: orgA, user: userA } = await makeOrgWithOwner('pay-a');
    const { organization: orgB } = await makeOrgWithOwner('pay-b');
    const project = await createProject({
      organizationId: orgA.id,
      name: 'Payment scoping project',
      websiteType: 'landing_page',
      createdByUserId: userA.id,
    });
    await prisma.payment.create({
      data: {
        organizationId: orgA.id,
        projectId: project.id,
        kind: 'deposit',
        amount: 100,
        currency: 'USD',
        providerKey: 'mock',
        idempotencyKey: `idem-${project.id}`,
      },
    });

    const orgBPayments = await prisma.payment.findMany({ where: { organizationId: orgB.id } });
    expect(orgBPayments).toHaveLength(0);
    const orgAPayments = await prisma.payment.findMany({ where: { organizationId: orgA.id } });
    expect(orgAPayments).toHaveLength(1);
  });
});
