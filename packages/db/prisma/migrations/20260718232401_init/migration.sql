-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('owner', 'admin', 'member', 'viewer');

-- CreateEnum
CREATE TYPE "EcosystemProduct" AS ENUM ('xability', 'xsite', 'xapps', 'xauto', 'xai');

-- CreateEnum
CREATE TYPE "EcosystemConnectionStatus" AS ENUM ('connected', 'not_connected', 'pending');

-- CreateEnum
CREATE TYPE "WebsiteTypeEnum" AS ENUM ('landing_page', 'business_website', 'portfolio', 'restaurant', 'clinic', 'corporate', 'real_estate', 'booking', 'blog_content', 'product_catalog', 'ecommerce', 'membership', 'custom_web_app');

-- CreateEnum
CREATE TYPE "ProjectStatusEnum" AS ENUM ('draft', 'discovery', 'scope_review', 'quote_ready', 'awaiting_approval', 'awaiting_deposit', 'planning', 'design_direction', 'awaiting_design_approval', 'building', 'automated_review', 'qa', 'awaiting_client_review', 'revision', 'awaiting_final_payment', 'ready_for_deployment', 'deploying', 'live', 'monitoring', 'maintenance', 'paused', 'cancelled', 'incident');

-- CreateEnum
CREATE TYPE "RiskLevelEnum" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "PlanKeyEnum" AS ENUM ('essential', 'growth', 'advanced');

-- CreateEnum
CREATE TYPE "BundleKindEnum" AS ENUM ('xability', 'standalone');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('draft', 'issued', 'superseded', 'approved');

-- CreateEnum
CREATE TYPE "QuoteLineItemKind" AS ENUM ('base', 'addition', 'multiplier', 'adjustment');

-- CreateEnum
CREATE TYPE "GateKeyEnum" AS ENUM ('G1_proposal_approval', 'G2_deposit_paid', 'G3_design_approval', 'G4_staging_review_approval', 'G5_final_payment', 'G6_deployment_approval', 'G7_change_request_approval', 'P1_validation_green', 'P2_deployment_lock_acquired', 'P3_domain_policy', 'P4_cancellation_policy', 'P5_budget_available');

-- CreateEnum
CREATE TYPE "ApprovalDecision" AS ENUM ('pending', 'approved', 'changes_requested');

-- CreateEnum
CREATE TYPE "ChangeRequestSizeEnum" AS ENUM ('small', 'medium', 'major_revision', 'new_feature', 'new_project_scope');

-- CreateEnum
CREATE TYPE "ChangeRequestClassificationEnum" AS ENUM ('included', 'overage', 'new_project_scope');

-- CreateEnum
CREATE TYPE "ChangeRequestStatus" AS ENUM ('submitted', 'approved', 'rejected', 'in_progress', 'deployed');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('incomplete', 'trialing', 'active', 'past_due', 'paused', 'cancelled');

-- CreateEnum
CREATE TYPE "PaymentKind" AS ENUM ('deposit', 'final', 'subscription', 'overage', 'refund');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('created', 'pending', 'requires_action', 'authorized', 'paid', 'failed', 'cancelled', 'refunded', 'partially_refunded', 'disputed');

-- CreateEnum
CREATE TYPE "WebhookEventStatus" AS ENUM ('received', 'processed', 'failed', 'ignored_duplicate');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "authSubject" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "country" TEXT,
    "defaultLocale" TEXT NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_memberships" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_profiles" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "industry" TEXT,
    "description" TEXT,
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ecosystem_connections" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "product" "EcosystemProduct" NOT NULL,
    "status" "EcosystemConnectionStatus" NOT NULL DEFAULT 'not_connected',
    "externalRef" TEXT,
    "connectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ecosystem_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xability_connections" (
    "id" TEXT NOT NULL,
    "ecosystemConnectionId" TEXT NOT NULL,
    "xabilityOrgId" TEXT,
    "subscriptionActive" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncedAt" TIMESTAMP(3),
    "syncedFields" JSONB,

    CONSTRAINT "xability_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "website_projects" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "websiteType" "WebsiteTypeEnum" NOT NULL,
    "status" "ProjectStatusEnum" NOT NULL DEFAULT 'draft',
    "prePauseStatus" "ProjectStatusEnum",
    "riskLevel" "RiskLevelEnum" NOT NULL DEFAULT 'low',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "website_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discovery_sessions" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "completeness" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "missingFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discovery_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discovery_answers" (
    "id" TEXT NOT NULL,
    "discoverySessionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discovery_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scope_calculations" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "buildScope" JSONB NOT NULL,
    "operationsScope" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scope_calculations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotes" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "scopeCalculationId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "buildPrice" INTEGER NOT NULL,
    "minimumBuildPrice" INTEGER NOT NULL,
    "depositPct" DOUBLE PRECISION NOT NULL,
    "depositAmount" INTEGER NOT NULL,
    "remainingAmount" INTEGER NOT NULL,
    "monthlyPlan" "PlanKeyEnum" NOT NULL,
    "monthlyBundle" "BundleKindEnum" NOT NULL,
    "monthlyPrice" INTEGER NOT NULL,
    "monthlyStandalonePrice" INTEGER NOT NULL,
    "bundleSaving" INTEGER NOT NULL,
    "includedScope" TEXT[],
    "excludedScope" TEXT[],
    "assumptions" TEXT[],
    "explanation" TEXT[],
    "riskLevel" "RiskLevelEnum" NOT NULL,
    "deliveryEstimateMinWeeks" INTEGER NOT NULL,
    "deliveryEstimateMaxWeeks" INTEGER NOT NULL,
    "quoteValidityDays" INTEGER NOT NULL,
    "requiresCustomPricing" BOOLEAN NOT NULL DEFAULT false,
    "status" "QuoteStatus" NOT NULL DEFAULT 'issued',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_line_items" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "kind" "QuoteLineItemKind" NOT NULL,
    "reason" TEXT NOT NULL,

    CONSTRAINT "quote_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal_cost_breakdowns" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "aiExecutionCostEstimate" INTEGER NOT NULL,
    "infraCostEstimate" INTEGER NOT NULL,
    "riskBufferFactor" DOUBLE PRECISION NOT NULL,
    "qaComplexityCost" INTEGER NOT NULL,
    "costFloor" INTEGER NOT NULL,
    "minimumFromMarginFloor" INTEGER NOT NULL,
    "preClampSubtotal" INTEGER NOT NULL,
    "clampedBy" TEXT NOT NULL,
    "marginAtRecommended" INTEGER NOT NULL,
    "formulaTrace" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "internal_cost_breakdowns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposal_approvals" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "gate" "GateKeyEnum" NOT NULL,
    "decision" "ApprovalDecision" NOT NULL DEFAULT 'pending',
    "decidedByUserId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proposal_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_gates" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "gate" "GateKeyEnum" NOT NULL,
    "satisfied" BOOLEAN NOT NULL DEFAULT false,
    "satisfiedAt" TIMESTAMP(3),
    "satisfiedByUserId" TEXT,

    CONSTRAINT "approval_gates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_transitions" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fromStatus" "ProjectStatusEnum" NOT NULL,
    "toStatus" "ProjectStatusEnum" NOT NULL,
    "gatesSatisfied" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "triggeredByKind" TEXT NOT NULL,
    "triggeredById" TEXT NOT NULL,
    "reason" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "change_requests" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "size" "ChangeRequestSizeEnum" NOT NULL,
    "classification" "ChangeRequestClassificationEnum" NOT NULL,
    "overagePrice" INTEGER NOT NULL DEFAULT 0,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "status" "ChangeRequestStatus" NOT NULL DEFAULT 'submitted',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT,
    "actorKind" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "plan" "PlanKeyEnum" NOT NULL,
    "bundle" "BundleKindEnum" NOT NULL,
    "price" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'incomplete',
    "startedAt" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "providerKey" TEXT,
    "providerRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT,
    "subscriptionId" TEXT,
    "quoteId" TEXT,
    "kind" "PaymentKind" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'created',
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "providerKey" TEXT NOT NULL,
    "providerRef" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_attempts" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "providerRef" TEXT,
    "status" "PaymentStatus" NOT NULL,
    "rawResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "providerKey" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "signatureValid" BOOLEAN NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "WebhookEventStatus" NOT NULL DEFAULT 'received',
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_authSubject_key" ON "users"("authSubject");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "organization_memberships_organizationId_idx" ON "organization_memberships"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_memberships_userId_organizationId_key" ON "organization_memberships"("userId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "business_profiles_organizationId_key" ON "business_profiles"("organizationId");

-- CreateIndex
CREATE INDEX "ecosystem_connections_organizationId_idx" ON "ecosystem_connections"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ecosystem_connections_organizationId_product_key" ON "ecosystem_connections"("organizationId", "product");

-- CreateIndex
CREATE UNIQUE INDEX "xability_connections_ecosystemConnectionId_key" ON "xability_connections"("ecosystemConnectionId");

-- CreateIndex
CREATE INDEX "website_projects_organizationId_idx" ON "website_projects"("organizationId");

-- CreateIndex
CREATE INDEX "website_projects_organizationId_status_idx" ON "website_projects"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "discovery_sessions_projectId_key" ON "discovery_sessions"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "discovery_answers_discoverySessionId_key_key" ON "discovery_answers"("discoverySessionId", "key");

-- CreateIndex
CREATE INDEX "scope_calculations_projectId_idx" ON "scope_calculations"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "scope_calculations_projectId_version_key" ON "scope_calculations"("projectId", "version");

-- CreateIndex
CREATE INDEX "quotes_projectId_idx" ON "quotes"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_projectId_version_key" ON "quotes"("projectId", "version");

-- CreateIndex
CREATE INDEX "quote_line_items_quoteId_idx" ON "quote_line_items"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "internal_cost_breakdowns_quoteId_key" ON "internal_cost_breakdowns"("quoteId");

-- CreateIndex
CREATE INDEX "proposal_approvals_quoteId_idx" ON "proposal_approvals"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "approval_gates_projectId_gate_key" ON "approval_gates"("projectId", "gate");

-- CreateIndex
CREATE INDEX "workflow_transitions_projectId_idx" ON "workflow_transitions"("projectId");

-- CreateIndex
CREATE INDEX "change_requests_projectId_idx" ON "change_requests"("projectId");

-- CreateIndex
CREATE INDEX "audit_events_organizationId_idx" ON "audit_events"("organizationId");

-- CreateIndex
CREATE INDEX "audit_events_projectId_idx" ON "audit_events"("projectId");

-- CreateIndex
CREATE INDEX "subscriptions_organizationId_idx" ON "subscriptions"("organizationId");

-- CreateIndex
CREATE INDEX "subscriptions_projectId_idx" ON "subscriptions"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_idempotencyKey_key" ON "payments"("idempotencyKey");

-- CreateIndex
CREATE INDEX "payments_organizationId_idx" ON "payments"("organizationId");

-- CreateIndex
CREATE INDEX "payments_projectId_idx" ON "payments"("projectId");

-- CreateIndex
CREATE INDEX "payment_attempts_paymentId_idx" ON "payment_attempts"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_externalEventId_key" ON "webhook_events"("externalEventId");

-- CreateIndex
CREATE INDEX "webhook_events_providerKey_idx" ON "webhook_events"("providerKey");

-- AddForeignKey
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecosystem_connections" ADD CONSTRAINT "ecosystem_connections_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xability_connections" ADD CONSTRAINT "xability_connections_ecosystemConnectionId_fkey" FOREIGN KEY ("ecosystemConnectionId") REFERENCES "ecosystem_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "website_projects" ADD CONSTRAINT "website_projects_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discovery_sessions" ADD CONSTRAINT "discovery_sessions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "website_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discovery_answers" ADD CONSTRAINT "discovery_answers_discoverySessionId_fkey" FOREIGN KEY ("discoverySessionId") REFERENCES "discovery_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scope_calculations" ADD CONSTRAINT "scope_calculations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "website_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "website_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_scopeCalculationId_fkey" FOREIGN KEY ("scopeCalculationId") REFERENCES "scope_calculations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_line_items" ADD CONSTRAINT "quote_line_items_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_cost_breakdowns" ADD CONSTRAINT "internal_cost_breakdowns_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_approvals" ADD CONSTRAINT "proposal_approvals_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_gates" ADD CONSTRAINT "approval_gates_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "website_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_transitions" ADD CONSTRAINT "workflow_transitions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "website_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "website_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "website_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "website_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "website_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
