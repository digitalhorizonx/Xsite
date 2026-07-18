import {
  AuditLog,
  calculateQuote,
  deriveOperationsScope,
  type AuditEvent,
  type BuildScope,
  type ClientQuote,
  type EcosystemConnection,
  type ProjectStatus,
} from '@xsite/core';

/**
 * ⚠️ DEMO DATA — Phase 1 only.
 *
 * Everything in this module is seed/demo content, clearly marked as demo in
 * the UI. There is no persistence in Phase 1; quotes are genuinely calculated
 * by the real @xsite/core pricing engine, but organizations, projects, and
 * activity are illustrative fixtures. Nothing here fakes Phase 2–4 features.
 */

export const DEMO_MODE = true;

export interface DemoOrganization {
  id: string;
  name: string;
  country: string;
  industry: string;
  languages: string[];
  connections: EcosystemConnection[];
}

export const demoOrganization: DemoOrganization = {
  id: 'org_demo',
  name: 'Al Noor Consulting (Demo)',
  country: 'Jordan',
  industry: 'Business consulting',
  languages: ['English', 'Arabic'],
  connections: [
    { product: 'xability', status: 'connected', capability: 'simulated' },
    { product: 'xsite', status: 'connected', capability: 'available' },
    { product: 'xapps', status: 'not_connected', capability: 'planned' },
    { product: 'xauto', status: 'not_connected', capability: 'planned' },
    { product: 'xai', status: 'not_connected', capability: 'planned' },
  ],
};

export interface DemoProject {
  id: string;
  name: string;
  status: ProjectStatus;
  scope: BuildScope;
  quote: ClientQuote;
  createdAt: string;
  pendingAction?: string;
}

const consultingScope: BuildScope = {
  websiteType: 'business_website',
  pageCount: 7,
  languageCount: 2,
  customUiLevel: 'custom',
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
  accessibilityLevel: 'enhanced',
  performanceTarget: 'high',
  securityRequirement: 'standard',
  deliverySpeed: 'standard',
  estimatedAiExecutionCost: 90,
  estimatedInfraCost: 25,
  riskLevel: 'medium',
  qaComplexity: 'standard',
};

const restaurantScope: BuildScope = {
  websiteType: 'restaurant',
  pageCount: 5,
  languageCount: 2,
  customUiLevel: 'standard',
  copywritingRequired: false,
  brandIdentityAvailable: true,
  cms: true,
  blog: false,
  ecommerce: false,
  productCount: 0,
  booking: true,
  paymentGateway: false,
  authentication: false,
  userRoles: false,
  dashboard: false,
  externalApiCount: 0,
  crmIntegration: false,
  erpIntegration: false,
  xabilityIntegration: true,
  metaPixel: true,
  googleAnalytics: true,
  googleTagManager: false,
  searchConsole: true,
  googleBusinessProfile: true,
  emailMarketing: false,
  whatsapp: true,
  maps: true,
  seoMigration: false,
  contentMigration: false,
  domainMigration: false,
  accessibilityLevel: 'standard',
  performanceTarget: 'standard',
  securityRequirement: 'standard',
  deliverySpeed: 'standard',
  estimatedAiExecutionCost: 60,
  estimatedInfraCost: 20,
  riskLevel: 'low',
  qaComplexity: 'standard',
};

function buildDemoProject(
  id: string,
  name: string,
  status: ProjectStatus,
  scope: BuildScope,
  createdAt: string,
  pendingAction?: string,
): DemoProject {
  const ops = deriveOperationsScope(scope, { xabilityBundleEligible: true });
  const { quote } = calculateQuote(scope, ops);
  return pendingAction !== undefined
    ? { id, name, status, scope, quote, createdAt, pendingAction }
    : { id, name, status, scope, quote, createdAt };
}

export const demoProjects: DemoProject[] = [
  buildDemoProject(
    'prj_demo_consulting',
    'Al Noor Consulting — Company Website',
    'awaiting_approval',
    consultingScope,
    '2026-07-10',
    'Review and approve the proposal',
  ),
  buildDemoProject(
    'prj_demo_restaurant',
    'Zaytoun Restaurant — Website & Booking',
    'monitoring',
    restaurantScope,
    '2026-05-02',
  ),
];

export function getDemoProject(id: string): DemoProject | undefined {
  return demoProjects.find((p) => p.id === id);
}

// ---------------------------------------------------------------------------
// Demo audit trail (produced through the real append-only AuditLog)
// ---------------------------------------------------------------------------

const log = new AuditLog();
let tick = 0;
const at = (iso: string) => () => {
  tick += 1;
  return `${iso}T10:${String(tick).padStart(2, '0')}:00Z`;
};

for (const [action, subject, project, when, payload] of [
  ['project.created', 'project:prj_demo_restaurant', 'prj_demo_restaurant', '2026-05-02', {}],
  ['quote.generated', 'quote:q_demo_r1', 'prj_demo_restaurant', '2026-05-03', { buildPrice: demoProjects[1]!.quote.buildPrice }],
  ['approval.decided', 'gate:G1_proposal_approval', 'prj_demo_restaurant', '2026-05-05', { decision: 'approved' }],
  ['payment.recorded', 'invoice:deposit', 'prj_demo_restaurant', '2026-05-05', { kind: 'deposit', simulated: true }],
  ['approval.decided', 'gate:G6_deployment_approval', 'prj_demo_restaurant', '2026-06-01', { decision: 'approved' }],
  ['deployment.completed', 'deployment:prod_1', 'prj_demo_restaurant', '2026-06-02', { environment: 'production' }],
  ['subscription.started', 'subscription:sub_demo_r1', 'prj_demo_restaurant', '2026-06-02', { plan: demoProjects[1]!.quote.monthly.plan }],
  ['project.created', 'project:prj_demo_consulting', 'prj_demo_consulting', '2026-07-10', {}],
  ['discovery.updated', 'discovery:d_demo_c1', 'prj_demo_consulting', '2026-07-11', { completeness: 1 }],
  ['ecosystem.import.applied', 'import:xability_brand', 'prj_demo_consulting', '2026-07-11', { categories: ['brand', 'business_info'], approved: true }],
  ['scope.generated', 'scope:s_demo_c1', 'prj_demo_consulting', '2026-07-12', {}],
  ['quote.generated', 'quote:q_demo_c1', 'prj_demo_consulting', '2026-07-12', { buildPrice: demoProjects[0]!.quote.buildPrice }],
  ['proposal.issued', 'proposal:p_demo_c1', 'prj_demo_consulting', '2026-07-13', {}],
] as const) {
  log.append(
    {
      actor: { kind: action.startsWith('approval') || action.startsWith('payment') ? 'user' : 'agent', id: action.startsWith('approval') ? 'client_owner' : action.split('.')[0]! },
      organizationRef: demoOrganization.id,
      projectRef: project,
      action,
      subject,
      payload: { ...payload, demo: true },
    },
    at(when),
  );
}

export function getDemoAudit(projectRef?: string): readonly AuditEvent[] {
  return projectRef ? log.list({ projectRef }) : log.list();
}
