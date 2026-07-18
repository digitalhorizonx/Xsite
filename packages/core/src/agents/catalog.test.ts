import { describe, expect, it } from 'vitest';
import { AGENT_CATALOG, AGENT_COUNT, getAgent } from './catalog';
import { selectProvider, type ProviderCandidate } from '../providers/selection';
import { AuditLog } from '../audit/events';

describe('agent catalog', () => {
  it('defines exactly 26 agents', () => {
    expect(AGENT_COUNT).toBe(26);
  });

  it('every agent has all mandatory governance fields populated', () => {
    for (const a of AGENT_CATALOG) {
      expect(a.key, a.name).toBeTruthy();
      expect(a.responsibility.length, a.name).toBeGreaterThan(20);
      expect(a.allowedInputs.length, a.name).toBeGreaterThan(0);
      expect(a.allowedOutputs.length, a.name).toBeGreaterThan(0);
      expect(a.permissionBoundaries.length, a.name).toBeGreaterThan(0);
      expect(a.requiredTools.length, a.name).toBeGreaterThan(0);
      expect(a.escalationConditions.length, a.name).toBeGreaterThan(0);
      expect(a.retryPolicy.maxRetries, a.name).toBeGreaterThanOrEqual(0);
      expect(a.timeoutMinutes, a.name).toBeGreaterThan(0);
      expect(a.auditEvents.length, a.name).toBeGreaterThan(0);
      expect(a.failureBehavior.length, a.name).toBeGreaterThan(10);
      expect(['available', 'simulated', 'planned', 'requires_integration']).toContain(a.runtimeStatus);
    }
  });

  it('agent keys are unique', () => {
    const keys = AGENT_CATALOG.map((a) => a.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('the client success agent is required to identify as AI', () => {
    const agent = getAgent('client_success');
    expect(agent?.permissionBoundaries.join(' ')).toMatch(/never claims to be human/i);
  });

  it('validation agents cannot green-wash failures', () => {
    for (const key of ['code_review', 'qa']) {
      const agent = getAgent(key);
      const text = [agent?.permissionBoundaries.join(' '), agent?.failureBehavior].join(' ');
      expect(text.toLowerCase()).toMatch(/cannot (mark failed|waive)|no green-washing/);
    }
  });

  it('domain agent requires explicit confirmation for transfers', () => {
    const agent = getAgent('domain_dns');
    expect(agent?.permissionBoundaries.join(' ')).toMatch(/never transfers a domain without explicit client confirmation/i);
  });
});

describe('provider selection', () => {
  const candidate = (key: string, overrides: Partial<ProviderCandidate> = {}): ProviderCandidate => ({
    registration: { key, category: 'coding', displayName: key, status: 'available', capabilities: [], circuit: 'closed' },
    performance: { providerKey: key, successRate: 0.9, avgQualityScore: 0.8, avgLatencyMs: 30_000, avgCost: 5, sampleSize: 100 },
    supportsStack: ['nextjs'],
    maxContextSize: 'large',
    clearedFor: ['public', 'internal'],
    available: true,
    ...overrides,
  });

  const criteria = {
    category: 'coding' as const,
    taskType: 'implement_page',
    stackProfile: 'nextjs',
    complexity: 'medium' as const,
    requiredContextSize: 'medium' as const,
    securityClassification: 'internal' as const,
    remainingBudget: 20,
    estimatedCostByProvider: { alpha: 5, beta: 8 },
  };

  it('selects the best-scoring eligible provider with a fallback chain', () => {
    const result = selectProvider([candidate('alpha'), candidate('beta')], criteria);
    expect(result.selected).toBe('alpha');
    expect(result.fallbacks).toEqual(['beta']);
  });

  it('excludes providers with an open circuit breaker', () => {
    const broken = candidate('alpha', {
      registration: { key: 'alpha', category: 'coding', displayName: 'alpha', status: 'available', capabilities: [], circuit: 'open' },
    });
    const result = selectProvider([broken, candidate('beta')], criteria);
    expect(result.selected).toBe('beta');
    expect(result.scored.find((s) => s.key === 'alpha')?.exclusionReasons).toContain('circuit breaker open');
  });

  it('excludes providers whose estimated cost exceeds the remaining budget', () => {
    const result = selectProvider([candidate('alpha'), candidate('beta')], {
      ...criteria,
      remainingBudget: 6,
    });
    expect(result.selected).toBe('alpha');
    expect(result.scored.find((s) => s.key === 'beta')?.eligible).toBe(false);
  });

  it('excludes providers lacking security clearance', () => {
    const uncleared = candidate('alpha', { clearedFor: ['public'] });
    const result = selectProvider([uncleared, candidate('beta')], { ...criteria, securityClassification: 'sensitive' });
    expect(result.selected).toBeNull();
  });

  it('returns null with reasons when nothing is eligible', () => {
    const result = selectProvider([candidate('alpha', { available: false })], criteria);
    expect(result.selected).toBeNull();
    expect(result.scored[0]?.exclusionReasons).toContain('unavailable');
  });
});

describe('audit log', () => {
  it('is append-only and redacts sensitive keys', () => {
    const log = new AuditLog();
    const event = log.append({
      actor: { kind: 'agent', id: 'pricing' },
      organizationRef: 'org_1',
      projectRef: 'prj_1',
      action: 'quote.generated',
      subject: 'quote:q_1',
      payload: { buildPrice: 900, apiKey: 'sk-secret', nested: { margin: 400, ok: true } },
    });
    expect(event.payload['apiKey']).toBe('[REDACTED]');
    expect((event.payload['nested'] as Record<string, unknown>)['margin']).toBe('[REDACTED]');
    expect((event.payload['nested'] as Record<string, unknown>)['ok']).toBe(true);
    expect(event.payload['buildPrice']).toBe(900);
    expect(log.list({ projectRef: 'prj_1' })).toHaveLength(1);
  });
});
