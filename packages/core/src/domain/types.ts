/**
 * XSite core domain types.
 *
 * These types are the single source of truth for the vocabulary shared by the
 * portal, the API boundary, the workflow engine, and (later) persistence.
 * See docs/03-domain-model.md for the relational mapping.
 */

// ---------------------------------------------------------------------------
// Website taxonomy
// ---------------------------------------------------------------------------

export const WEBSITE_TYPES = [
  'landing_page',
  'business_website',
  'portfolio',
  'restaurant',
  'clinic',
  'corporate',
  'real_estate',
  'booking',
  'blog_content',
  'product_catalog',
  'ecommerce',
  'membership',
  'custom_web_app',
] as const;

export type WebsiteType = (typeof WEBSITE_TYPES)[number];

/** Guardrail band a website type prices within. */
export type PriceCategory = 'landing' | 'business' | 'platform' | 'ecommerce' | 'custom';

export const WEBSITE_TYPE_LABELS: Record<WebsiteType, string> = {
  landing_page: 'Landing page',
  business_website: 'Business website',
  portfolio: 'Portfolio',
  restaurant: 'Restaurant website',
  clinic: 'Clinic website',
  corporate: 'Corporate website',
  real_estate: 'Real-estate website',
  booking: 'Booking website',
  blog_content: 'Blog / content website',
  product_catalog: 'Product catalog',
  ecommerce: 'E-commerce',
  membership: 'Membership website',
  custom_web_app: 'Custom web application',
};

// ---------------------------------------------------------------------------
// Scope variables (pricing-engine input, build side)
// ---------------------------------------------------------------------------

export type Tri = 'standard' | 'elevated' | 'strict';
export type CustomUiLevel = 'standard' | 'custom' | 'premium';
export type AccessibilityLevel = 'standard' | 'enhanced' | 'wcag_aa';
export type PerformanceTarget = 'standard' | 'high' | 'strict';
export type DeliverySpeed = 'standard' | 'expedited' | 'rush';
export type RiskLevel = 'low' | 'medium' | 'high';
export type QaComplexity = 'standard' | 'complex';

export interface BuildScope {
  websiteType: WebsiteType;
  pageCount: number;
  languageCount: number;
  customUiLevel: CustomUiLevel;
  copywritingRequired: boolean;
  brandIdentityAvailable: boolean;
  cms: boolean;
  blog: boolean;
  ecommerce: boolean;
  productCount: number;
  booking: boolean;
  paymentGateway: boolean;
  authentication: boolean;
  userRoles: boolean;
  dashboard: boolean;
  externalApiCount: number;
  crmIntegration: boolean;
  erpIntegration: boolean;
  xabilityIntegration: boolean;
  metaPixel: boolean;
  googleAnalytics: boolean;
  googleTagManager: boolean;
  searchConsole: boolean;
  googleBusinessProfile: boolean;
  emailMarketing: boolean;
  whatsapp: boolean;
  maps: boolean;
  seoMigration: boolean;
  contentMigration: boolean;
  domainMigration: boolean;
  accessibilityLevel: AccessibilityLevel;
  performanceTarget: PerformanceTarget;
  securityRequirement: Tri;
  deliverySpeed: DeliverySpeed;
  /** Internal estimate, never client-facing. */
  estimatedAiExecutionCost: number;
  /** Internal estimate, never client-facing. */
  estimatedInfraCost: number;
  riskLevel: RiskLevel;
  qaComplexity: QaComplexity;
}

// ---------------------------------------------------------------------------
// Operations variables (pricing-engine input, monthly side)
// ---------------------------------------------------------------------------

export type HostingProfile = 'static' | 'standard' | 'high_traffic';
export type AiAllowance = 'basic' | 'standard' | 'extended';
export type SupportPriority = 'standard' | 'priority';
export type UptimeRequirement = 'standard' | 'high';
export type ReportingCadence = 'monthly' | 'weekly';

export interface OperationsScope {
  hostingProfile: HostingProfile;
  expectedMonthlyChangeRequests: number;
  monthlyContentUpdates: number;
  aiExecutionAllowance: AiAllowance;
  cmsOperations: boolean;
  ecommerceOperations: boolean;
  seoMonitoring: boolean;
  geoMonitoring: boolean;
  integrationMonitoring: boolean;
  uptimeRequirement: UptimeRequirement;
  supportPriority: SupportPriority;
  securityMaintenance: boolean;
  reporting: ReportingCadence;
  /** Bundle eligibility must be verified via the ecosystem connection, never self-declared. */
  xabilityBundleEligible: boolean;
}

// ---------------------------------------------------------------------------
// Plans & billing
// ---------------------------------------------------------------------------

export type PlanKey = 'essential' | 'growth' | 'advanced';
export type BundleKind = 'xability' | 'standalone';

export const PLAN_LABELS: Record<PlanKey, string> = {
  essential: 'XSite Essential',
  growth: 'XSite Growth',
  advanced: 'XSite Advanced',
};

// ---------------------------------------------------------------------------
// Project lifecycle
// ---------------------------------------------------------------------------

export const PROJECT_STATUSES = [
  'draft',
  'discovery',
  'scope_review',
  'quote_ready',
  'awaiting_approval',
  'awaiting_deposit',
  'planning',
  'design_direction',
  'awaiting_design_approval',
  'building',
  'automated_review',
  'qa',
  'awaiting_client_review',
  'revision',
  'awaiting_final_payment',
  'ready_for_deployment',
  'deploying',
  'live',
  'monitoring',
  'maintenance',
  'paused',
  'cancelled',
  'incident',
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: 'Draft',
  discovery: 'Discovery',
  scope_review: 'Scope Review',
  quote_ready: 'Quote Ready',
  awaiting_approval: 'Awaiting Approval',
  awaiting_deposit: 'Awaiting Deposit',
  planning: 'Planning',
  design_direction: 'Design Direction',
  awaiting_design_approval: 'Awaiting Design Approval',
  building: 'Building',
  automated_review: 'Automated Review',
  qa: 'QA',
  awaiting_client_review: 'Awaiting Client Review',
  revision: 'Revision',
  awaiting_final_payment: 'Awaiting Final Payment',
  ready_for_deployment: 'Ready for Deployment',
  deploying: 'Deploying',
  live: 'Live',
  monitoring: 'Monitoring',
  maintenance: 'Maintenance',
  paused: 'Paused',
  cancelled: 'Cancelled',
  incident: 'Incident',
};

// ---------------------------------------------------------------------------
// Feature availability honesty statuses
// ---------------------------------------------------------------------------

/**
 * Every portal surface and platform capability declares one of these.
 * Later-phase functionality is never presented as working when it is not.
 */
export type CapabilityStatus = 'available' | 'simulated' | 'planned' | 'requires_integration';

// ---------------------------------------------------------------------------
// Ecosystem
// ---------------------------------------------------------------------------

export type EcosystemProduct = 'xability' | 'xsite' | 'xapps' | 'xauto' | 'xai';
export type ConnectionStatus = 'connected' | 'not_connected' | 'pending';

export interface EcosystemConnection {
  product: EcosystemProduct;
  status: ConnectionStatus;
  /** How the connection is realised in the current phase. */
  capability: CapabilityStatus;
}

// ---------------------------------------------------------------------------
// Change requests
// ---------------------------------------------------------------------------

export type ChangeRequestSize =
  | 'small'
  | 'medium'
  | 'major_revision'
  | 'new_feature'
  | 'new_project_scope';

export type ChangeRequestClassification = 'included' | 'overage' | 'new_project_scope';

// ---------------------------------------------------------------------------
// Artifacts
// ---------------------------------------------------------------------------

export const ARTIFACT_KINDS = [
  'brief',
  'scope',
  'quote',
  'sitemap',
  'user_journeys',
  'content_model',
  'page_specification',
  'design_tokens',
  'component_inventory',
  'seo_plan',
  'integration_map',
  'acceptance_criteria',
  'test_plan',
  'deployment_plan',
  'operations_plan',
] as const;

export type ArtifactKind = (typeof ARTIFACT_KINDS)[number];

export interface ArtifactRef {
  kind: ArtifactKind;
  version: number;
  producedBy: string;
}
