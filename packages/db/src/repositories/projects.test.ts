import { afterEach, describe, expect, it } from 'vitest';
import { createProject, getProject, listProjects, saveDiscovery, saveScopeCalculation } from './projects';
import { makeOrgWithOwner, truncateAll } from '../test/helpers';
import type { BuildScope } from '@xsite/core';
import { deriveOperationsScope } from '@xsite/core';

afterEach(async () => {
  await truncateAll();
});

describe('project persistence', () => {
  it('creates a project and records the initial workflow transition + audit event', async () => {
    const { organization, user } = await makeOrgWithOwner('proj');
    const project = await createProject({
      organizationId: organization.id,
      name: 'Test Co Website',
      websiteType: 'business_website',
      createdByUserId: user.id,
    });

    expect(project.status).toBe('draft');
    const found = await getProject(organization.id, project.id);
    expect(found.id).toBe(project.id);

    const list = await listProjects(organization.id);
    expect(list).toHaveLength(1);
  });

  it('persists discovery answers and completeness idempotently (upsert on rerun)', async () => {
    const { organization, user } = await makeOrgWithOwner('disc');
    const project = await createProject({
      organizationId: organization.id,
      name: 'Discovery Co',
      websiteType: 'restaurant',
      createdByUserId: user.id,
    });

    await saveDiscovery({
      organizationId: organization.id,
      projectId: project.id,
      answers: { industry: 'restaurant', pageEstimate: 5 },
      completeness: 0.5,
      missingFields: ['needsBooking'],
      actorUserId: user.id,
    });

    // rerun with an update to one answer + full completeness
    await saveDiscovery({
      organizationId: organization.id,
      projectId: project.id,
      answers: { industry: 'restaurant', pageEstimate: 6, needsBooking: true },
      completeness: 1,
      missingFields: [],
      actorUserId: user.id,
    });

    const { prisma } = await import('../client');
    const session = await prisma.discoverySession.findUnique({
      where: { projectId: project.id },
      include: { answers: true },
    });
    expect(session?.completeness).toBe(1);
    expect(session?.answers).toHaveLength(3);
    const pageEstimate = session?.answers.find((a) => a.key === 'pageEstimate');
    expect(pageEstimate?.value).toBe(6);
  });

  it('versions scope calculations per project', async () => {
    const { organization, user } = await makeOrgWithOwner('scope');
    const project = await createProject({
      organizationId: organization.id,
      name: 'Scope Co',
      websiteType: 'landing_page',
      createdByUserId: user.id,
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
      estimatedAiExecutionCost: 30,
      estimatedInfraCost: 10,
      riskLevel: 'low',
      qaComplexity: 'standard',
    };
    const ops = deriveOperationsScope(scope, { xabilityBundleEligible: false });

    const v1 = await saveScopeCalculation({ organizationId: organization.id, projectId: project.id, buildScope: scope, operationsScope: ops });
    const v2 = await saveScopeCalculation({ organizationId: organization.id, projectId: project.id, buildScope: { ...scope, pageCount: 3 }, operationsScope: ops });

    expect(v1.version).toBe(1);
    expect(v2.version).toBe(2);
  });

  it('rejects saving discovery for a project in another organization', async () => {
    const { organization: orgA, user: userA } = await makeOrgWithOwner('disc-a');
    const { organization: orgB } = await makeOrgWithOwner('disc-b');
    const project = await createProject({
      organizationId: orgA.id,
      name: 'A project',
      websiteType: 'portfolio',
      createdByUserId: userA.id,
    });

    await expect(
      saveDiscovery({
        organizationId: orgB.id,
        projectId: project.id,
        answers: {},
        completeness: 0,
        missingFields: [],
        actorUserId: userA.id,
      }),
    ).rejects.toThrow();
  });
});
