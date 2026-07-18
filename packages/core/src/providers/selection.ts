import type {
  ProviderCategory,
  ProviderPerformanceSnapshot,
  ProviderRegistration,
  SecurityClassification,
} from './types';

/**
 * Provider selection policy — explainable scoring over registered providers.
 *
 * The workflow selects a provider per task from: task type, project stack,
 * complexity, cost, availability, context size, security classification,
 * historical performance, latency, quality score, and remaining budget.
 * Weights are configuration; every selection returns its score breakdown so
 * routing decisions are auditable.
 */

export interface SelectionCriteria {
  category: ProviderCategory;
  taskType: string;
  stackProfile: string;
  complexity: 'low' | 'medium' | 'high';
  requiredContextSize: 'small' | 'medium' | 'large';
  securityClassification: SecurityClassification;
  remainingBudget: number;
  estimatedCostByProvider: Record<string, number>;
}

export interface ProviderCandidate {
  registration: ProviderRegistration;
  performance: ProviderPerformanceSnapshot;
  /** Declared capacities. */
  supportsStack: string[];
  maxContextSize: 'small' | 'medium' | 'large';
  clearedFor: SecurityClassification[];
  available: boolean;
}

export interface SelectionWeights {
  quality: number;
  successRate: number;
  cost: number;
  latency: number;
}

export const DEFAULT_SELECTION_WEIGHTS: SelectionWeights = {
  quality: 0.4,
  successRate: 0.3,
  cost: 0.2,
  latency: 0.1,
};

export interface ScoredCandidate {
  key: string;
  eligible: boolean;
  exclusionReasons: string[];
  score: number;
  breakdown: Record<string, number>;
}

export interface SelectionResult {
  selected: string | null;
  /** Ordered fallback chain (best first, selected excluded). */
  fallbacks: string[];
  scored: ScoredCandidate[];
}

const contextRank = { small: 0, medium: 1, large: 2 } as const;

export function selectProvider(
  candidates: ProviderCandidate[],
  criteria: SelectionCriteria,
  weights: SelectionWeights = DEFAULT_SELECTION_WEIGHTS,
): SelectionResult {
  const scored: ScoredCandidate[] = candidates.map((c) => {
    const reasons: string[] = [];
    const key = c.registration.key;

    if (c.registration.category !== criteria.category) reasons.push('wrong category');
    if (!c.available) reasons.push('unavailable');
    if (c.registration.circuit === 'open') reasons.push('circuit breaker open');
    if (!c.clearedFor.includes(criteria.securityClassification)) reasons.push('not cleared for security classification');
    if (contextRank[c.maxContextSize] < contextRank[criteria.requiredContextSize]) reasons.push('insufficient context size');
    if (criteria.stackProfile && !c.supportsStack.includes(criteria.stackProfile)) reasons.push('stack not supported');
    const estCost = criteria.estimatedCostByProvider[key] ?? Number.POSITIVE_INFINITY;
    if (estCost > criteria.remainingBudget) reasons.push('estimated cost exceeds remaining budget');

    if (reasons.length > 0) {
      return { key, eligible: false, exclusionReasons: reasons, score: 0, breakdown: {} };
    }

    const maxCost = Math.max(
      ...candidates.map((x) => criteria.estimatedCostByProvider[x.registration.key] ?? 0),
      1,
    );
    const costScore = 1 - estCost / maxCost;
    const latencyScore = 1 / (1 + c.performance.avgLatencyMs / 60_000);
    const breakdown = {
      quality: c.performance.avgQualityScore * weights.quality,
      successRate: c.performance.successRate * weights.successRate,
      cost: costScore * weights.cost,
      latency: latencyScore * weights.latency,
    };
    const score = Object.values(breakdown).reduce((a, b) => a + b, 0);
    return { key, eligible: true, exclusionReasons: [], score, breakdown };
  });

  const eligible = scored.filter((s) => s.eligible).sort((a, b) => b.score - a.score);
  return {
    selected: eligible[0]?.key ?? null,
    fallbacks: eligible.slice(1).map((s) => s.key),
    scored,
  };
}
