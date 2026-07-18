import type { CapabilityStatus } from '../domain/types';

/**
 * Provider-independent tool gateway — adapter contracts.
 *
 * External tools (coding agents, reasoning/content/design models, repos,
 * CI/CD, hosting, DNS, analytics, SEO, monitoring, payments, email,
 * messaging) are replaceable execution engines behind these interfaces.
 * Provider-specific logic must never leak above this layer: the domain
 * requests capabilities, never vendors. Initial coding providers (Claude
 * Code, OpenAI Codex) are internal implementation details — invisible to
 * clients and removable without workflow changes.
 */

export type ProviderCategory =
  | 'coding'
  | 'reasoning'
  | 'content'
  | 'design'
  | 'image'
  | 'repository'
  | 'ci'
  | 'deployment'
  | 'hosting'
  | 'dns'
  | 'analytics'
  | 'seo'
  | 'error_monitoring'
  | 'performance_monitoring'
  | 'payment'
  | 'email'
  | 'messaging';

export type SecurityClassification = 'public' | 'internal' | 'sensitive';

export interface ExecutionBudget {
  /** Max spend for this execution, in platform cost units (USD). */
  maxCost: number;
  timeoutMs: number;
}

export interface ProviderRequestContext {
  taskRef: string;
  projectRef: string;
  organizationRef: string;
  budget: ExecutionBudget;
  securityClassification: SecurityClassification;
  /** Versioned prompt/template reference used, for reproducibility. */
  promptVersion?: string;
  idempotencyKey: string;
}

export type ProviderResultStatus = 'succeeded' | 'failed' | 'timed_out' | 'budget_exceeded';

export interface ProviderResult<T> {
  status: ProviderResultStatus;
  output?: T;
  /** Actual cost incurred (never exceeds budget.maxCost). */
  cost: number;
  latencyMs: number;
  diagnostics: string[];
  /** Set by the validation layer, not the provider itself. */
  validation?: { valid: boolean; issues: string[] };
}

// ---------------------------------------------------------------------------
// Adapter interfaces
// ---------------------------------------------------------------------------

export interface CodingTaskRequest {
  repositoryRef: string;
  /** Task-scoped branch — providers never touch main/production branches. */
  branch: string;
  instructions: string;
  acceptanceCriteria: string[];
  stackProfile: string;
}

export interface CodingTaskOutput {
  branch: string;
  changedFiles: string[];
  summary: string;
}

export interface CodingProvider {
  readonly key: string;
  readonly category: 'coding';
  executeTask(ctx: ProviderRequestContext, req: CodingTaskRequest): Promise<ProviderResult<CodingTaskOutput>>;
}

export interface ReasoningProvider {
  readonly key: string;
  readonly category: 'reasoning';
  analyze(ctx: ProviderRequestContext, req: { instructions: string; input: unknown; schemaRef?: string }): Promise<ProviderResult<unknown>>;
}

export interface ContentProvider {
  readonly key: string;
  readonly category: 'content';
  draft(ctx: ProviderRequestContext, req: { contentModelRef: string; brandVoiceRef?: string; instructions: string }): Promise<ProviderResult<{ drafts: Array<{ path: string; content: string }> }>>;
}

export interface DesignProvider {
  readonly key: string;
  readonly category: 'design';
  proposeDirection(ctx: ProviderRequestContext, req: { briefRef: string; brandAssetsRef?: string }): Promise<ProviderResult<{ candidates: Array<{ tokensRef: string; previewRef: string }> }>>;
}

export interface RepositoryProvider {
  readonly key: string;
  readonly category: 'repository';
  createRepository(ctx: ProviderRequestContext, req: { name: string; visibility: 'private' }): Promise<ProviderResult<{ repositoryRef: string; url: string }>>;
  createBranch(ctx: ProviderRequestContext, req: { repositoryRef: string; name: string; from: string }): Promise<ProviderResult<{ branch: string }>>;
  openMergeRequest(ctx: ProviderRequestContext, req: { repositoryRef: string; from: string; to: string; title: string }): Promise<ProviderResult<{ mergeRequestRef: string }>>;
}

export interface DeploymentProvider {
  readonly key: string;
  readonly category: 'deployment';
  deploy(ctx: ProviderRequestContext, req: { environmentRef: string; buildRef: string }): Promise<ProviderResult<{ deploymentRef: string; url: string }>>;
  rollback(ctx: ProviderRequestContext, req: { environmentRef: string; toDeploymentRef: string }): Promise<ProviderResult<{ deploymentRef: string }>>;
}

export interface HostingProvider {
  readonly key: string;
  readonly category: 'hosting';
  provision(ctx: ProviderRequestContext, req: { profile: 'static' | 'standard' | 'high_traffic' }): Promise<ProviderResult<{ environmentRef: string }>>;
}

export interface DnsProvider {
  readonly key: string;
  readonly category: 'dns';
  upsertRecord(ctx: ProviderRequestContext, req: { hostname: string; type: string; value: string; clientConfirmationRef?: string }): Promise<ProviderResult<{ recordRef: string }>>;
  verifyOwnership(ctx: ProviderRequestContext, req: { hostname: string }): Promise<ProviderResult<{ verified: boolean }>>;
}

export interface AnalyticsProvider {
  readonly key: string;
  readonly category: 'analytics';
  configureProperty(ctx: ProviderRequestContext, req: { siteUrl: string }): Promise<ProviderResult<{ propertyRef: string }>>;
  healthCheck(ctx: ProviderRequestContext, req: { propertyRef: string }): Promise<ProviderResult<{ healthy: boolean; issues: string[] }>>;
}

export interface SeoProvider {
  readonly key: string;
  readonly category: 'seo';
  crawl(ctx: ProviderRequestContext, req: { siteUrl: string }): Promise<ProviderResult<{ issues: Array<{ severity: string; page: string; issue: string }> }>>;
}

export interface PaymentProvider {
  readonly key: string;
  readonly category: 'payment';
  /** All charges are idempotent via ctx.idempotencyKey and policy-gated upstream. */
  charge(ctx: ProviderRequestContext, req: { amount: number; currency: string; purpose: 'deposit' | 'final' | 'subscription' | 'overage'; customerRef: string }): Promise<ProviderResult<{ paymentRef: string }>>;
  refund(ctx: ProviderRequestContext, req: { paymentRef: string; amount: number; approvalRef: string }): Promise<ProviderResult<{ refundRef: string }>>;
}

export interface EmailProvider {
  readonly key: string;
  readonly category: 'email';
  send(ctx: ProviderRequestContext, req: { to: string; templateRef: string; data: Record<string, unknown> }): Promise<ProviderResult<{ messageRef: string }>>;
}

// ---------------------------------------------------------------------------
// Registry & health
// ---------------------------------------------------------------------------

export interface ProviderRegistration {
  key: string;
  category: ProviderCategory;
  displayName: string;
  /** Honest integration status in the current phase. */
  status: CapabilityStatus;
  capabilities: string[];
  /** Circuit breaker state. */
  circuit: 'closed' | 'open' | 'half_open';
}

export interface ProviderPerformanceSnapshot {
  providerKey: string;
  successRate: number;      // 0..1
  avgQualityScore: number;  // 0..1
  avgLatencyMs: number;
  avgCost: number;
  sampleSize: number;
}
