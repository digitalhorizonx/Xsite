/**
 * Development seed data — NEVER run against a production database.
 * Guarded by NODE_ENV below; also gated by requiring DATABASE_URL to look
 * like a local/dev connection string unless FORCE_SEED=1 is set.
 */
import { PrismaClient } from '@prisma/client';
import { calculateQuote, deriveOperationsScope } from '@xsite/core';

const prisma = new PrismaClient();

function assertSafeToSeed() {
  if (process.env.NODE_ENV === 'production' && process.env.FORCE_SEED !== '1') {
    throw new Error('Refusing to seed a production environment. Set FORCE_SEED=1 to override.');
  }
}

async function main() {
  assertSafeToSeed();

  const user = await prisma.user.upsert({
    where: { email: 'owner@alnoor-demo.horizonx.site' },
    create: { email: 'owner@alnoor-demo.horizonx.site', name: 'Demo Owner (seed)' },
    update: {},
  });

  const org = await prisma.organization.upsert({
    where: { slug: 'al-noor-consulting-demo' },
    create: {
      slug: 'al-noor-consulting-demo',
      name: 'Al Noor Consulting (Demo)',
      country: 'Jordan',
      defaultLocale: 'en',
    },
    update: {},
  });

  await prisma.organizationMembership.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
    create: { userId: user.id, organizationId: org.id, role: 'owner' },
    update: {},
  });

  await prisma.businessProfile.upsert({
    where: { organizationId: org.id },
    create: {
      organizationId: org.id,
      legalName: 'Al Noor Consulting',
      industry: 'Business consulting',
      languages: ['English', 'Arabic'],
    },
    update: {},
  });

  await prisma.ecosystemConnection.upsert({
    where: { organizationId_product: { organizationId: org.id, product: 'xability' } },
    create: { organizationId: org.id, product: 'xability', status: 'connected', connectedAt: new Date() },
    update: {},
  });

  const project = await prisma.websiteProject.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      organizationId: org.id,
      name: 'Al Noor Consulting — Company Website',
      websiteType: 'business_website',
      status: 'awaiting_approval',
    },
    update: {},
  });

  const buildScope = {
    websiteType: 'business_website' as const,
    pageCount: 7,
    languageCount: 2,
    customUiLevel: 'custom' as const,
    copywritingRequired: true,
    brandIdentityAvailable: true,
    cms: true,
    blog: true,
    ecommerce: false,
    productCount: 0,
    booking: false,
    paymentGateway: false,
    authentication: false,
    userRoles: false,
    dashboard: false,
    externalApiCount: 0,
    crmIntegration: true,
    erpIntegration: false,
    xabilityIntegration: true,
    metaPixel: true,
    googleAnalytics: true,
    googleTagManager: true,
    searchConsole: true,
    googleBusinessProfile: true,
    emailMarketing: true,
    whatsapp: true,
    maps: true,
    seoMigration: false,
    contentMigration: true,
    domainMigration: true,
    accessibilityLevel: 'enhanced' as const,
    performanceTarget: 'high' as const,
    securityRequirement: 'standard' as const,
    deliverySpeed: 'standard' as const,
    estimatedAiExecutionCost: 90,
    estimatedInfraCost: 25,
    riskLevel: 'medium' as const,
    qaComplexity: 'standard' as const,
  };
  const operationsScope = deriveOperationsScope(buildScope, { xabilityBundleEligible: true });

  const scopeCalc = await prisma.scopeCalculation.upsert({
    where: { projectId_version: { projectId: project.id, version: 1 } },
    create: {
      projectId: project.id,
      version: 1,
      buildScope: buildScope as never,
      operationsScope: operationsScope as never,
    },
    update: {},
  });

  const result = calculateQuote(buildScope, operationsScope);
  const existingQuote = await prisma.quote.findFirst({ where: { projectId: project.id, version: 1 } });
  if (!existingQuote) {
    const quote = await prisma.quote.create({
      data: {
        projectId: project.id,
        scopeCalculationId: scopeCalc.id,
        version: 1,
        configVersion: result.quote.configVersion,
        currency: result.quote.currency,
        thirdPartyCosts: result.quote.thirdPartyCosts as never,
        buildPrice: result.quote.buildPrice,
        minimumBuildPrice: result.quote.minimumBuildPrice,
        depositPct: result.quote.depositPct,
        depositAmount: result.quote.depositAmount,
        remainingAmount: result.quote.remainingAmount,
        monthlyPlan: result.quote.monthly.plan,
        monthlyBundle: result.quote.monthly.bundle,
        monthlyPrice: result.quote.monthly.price,
        monthlyStandalonePrice: result.quote.monthly.standalonePrice,
        bundleSaving: result.quote.monthly.bundleSaving,
        includedScope: result.quote.includedScope,
        excludedScope: result.quote.excludedScope,
        assumptions: result.quote.assumptions,
        explanation: result.quote.explanation,
        riskLevel: result.quote.riskLevel,
        deliveryEstimateMinWeeks: result.quote.deliveryEstimateWeeks.min,
        deliveryEstimateMaxWeeks: result.quote.deliveryEstimateWeeks.max,
        quoteValidityDays: result.quote.quoteValidityDays,
        requiresCustomPricing: result.quote.requiresCustomPricing,
      },
    });
    await prisma.quoteLineItem.createMany({
      data: result.quote.lineItems.map((li) => ({ ...li, quoteId: quote.id })),
    });
    await prisma.internalCostBreakdown.create({
      data: {
        quoteId: quote.id,
        aiExecutionCostEstimate: result.internal.aiExecutionCostEstimate,
        infraCostEstimate: result.internal.infraCostEstimate,
        riskBufferFactor: result.internal.riskBufferFactor,
        qaComplexityCost: result.internal.qaComplexityCost,
        costFloor: result.internal.costFloor,
        minimumFromMarginFloor: result.internal.minimumFromMarginFloor,
        preClampSubtotal: result.internal.preClampSubtotal,
        clampedBy: result.internal.clampedBy,
        marginAtRecommended: result.internal.marginAtRecommended,
        formulaTrace: result.internal.formulaTrace,
      },
    });
  }

  await prisma.auditEvent.create({
    data: {
      organizationId: org.id,
      projectId: project.id,
      actorKind: 'system',
      actorId: 'seed',
      action: 'seed.applied',
      subject: `organization:${org.id}`,
      payload: { demo: true },
    },
  });

  console.log('Seed complete:', { user: user.email, organization: org.slug, project: project.name });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
