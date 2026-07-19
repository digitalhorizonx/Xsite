import { afterEach, describe, expect, it } from 'vitest';
import { createProject } from './projects';
import { persistQuote, recordApprovalDecision } from './quotes';
import { saveScopeCalculation } from './projects';
import { getWorkflowHistory, IllegalTransitionError, transitionProject } from './workflow';
import { makeOrgWithOwner, truncateAll } from '../test/helpers';
import { calculateQuote, deriveOperationsScope, type BuildScope } from '@xsite/core';
import { prisma } from '../client';

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
  estimatedAiExecutionCost: 30,
  estimatedInfraCost: 10,
  riskLevel: 'low',
  qaComplexity: 'standard',
};

describe('workflow transitions (real database, real @xsite/core state machine)', () => {
  it('rejects an illegal jump and leaves the project status untouched', async () => {
    const { organization, user } = await makeOrgWithOwner('wf');
    const project = await createProject({
      organizationId: organization.id,
      name: 'WF Co',
      websiteType: 'landing_page',
      createdByUserId: user.id,
    });

    await expect(
      transitionProject({
        organizationId: organization.id,
        projectId: project.id,
        toStatus: 'live',
        triggeredBy: { kind: 'user', id: user.id },
      }),
    ).rejects.toBeInstanceOf(IllegalTransitionError);

    const reloaded = await prisma.websiteProject.findUniqueOrThrow({ where: { id: project.id } });
    expect(reloaded.status).toBe('draft');
  });

  it('blocks awaiting_approval → awaiting_deposit until G1 is actually satisfied, then allows it', async () => {
    const { organization, user } = await makeOrgWithOwner('gate');
    const project = await createProject({
      organizationId: organization.id,
      name: 'Gate Co',
      websiteType: 'landing_page',
      createdByUserId: user.id,
    });
    await prisma.websiteProject.update({ where: { id: project.id }, data: { status: 'awaiting_approval' } });

    const operationsScope = deriveOperationsScope(scope, { xabilityBundleEligible: false });
    const scopeCalc = await saveScopeCalculation({
      organizationId: organization.id,
      projectId: project.id,
      buildScope: scope,
      operationsScope,
    });
    const result = calculateQuote(scope, operationsScope);
    const quote = await persistQuote({
      organizationId: organization.id,
      projectId: project.id,
      scopeCalculationId: scopeCalc.id,
      result,
      actorId: 'pricing',
    });

    // No gate satisfied yet — must be rejected.
    await expect(
      transitionProject({
        organizationId: organization.id,
        projectId: project.id,
        toStatus: 'awaiting_deposit',
        triggeredBy: { kind: 'user', id: user.id },
      }),
    ).rejects.toThrow(/client approves the proposal/i);

    // Client approves — this is what actually satisfies the gate.
    await recordApprovalDecision({
      organizationId: organization.id,
      projectId: project.id,
      quoteId: quote.id,
      gate: 'G1_proposal_approval',
      decision: 'approved',
      decidedByUserId: user.id,
    });

    const updated = await transitionProject({
      organizationId: organization.id,
      projectId: project.id,
      toStatus: 'awaiting_deposit',
      triggeredBy: { kind: 'user', id: user.id },
    });
    expect(updated.status).toBe('awaiting_deposit');

    const history = await getWorkflowHistory(organization.id, project.id);
    expect(history.some((h) => h.toStatus === 'awaiting_deposit')).toBe(true);
  });

  it('rejects transitioning a project that belongs to another organization', async () => {
    const { organization: orgA, user: userA } = await makeOrgWithOwner('tx-a');
    const { organization: orgB } = await makeOrgWithOwner('tx-b');
    const project = await createProject({
      organizationId: orgA.id,
      name: 'A project',
      websiteType: 'landing_page',
      createdByUserId: userA.id,
    });

    await expect(
      transitionProject({
        organizationId: orgB.id,
        projectId: project.id,
        toStatus: 'discovery',
        triggeredBy: { kind: 'user', id: userA.id },
      }),
    ).rejects.toThrow();
  });
});
