import type { ProjectStatus } from '../domain/types';

/**
 * XSite project workflow state machine.
 *
 * The transition map below is the single authoritative definition of legal
 * project-status transitions. Anything not listed is illegal and must be
 * rejected by the workflow engine and the API. Gate requirements are declared
 * per transition and re-checked at transition time — no agent can bypass a
 * required client approval, payment, or policy gate.
 */

export type GateKey =
  | 'G1_proposal_approval'
  | 'G2_deposit_paid'
  | 'G3_design_approval'
  | 'G4_staging_review_approval'
  | 'G5_final_payment'
  | 'G6_deployment_approval'
  | 'G7_change_request_approval'
  | 'P1_validation_green'
  | 'P2_deployment_lock_acquired'
  | 'P3_domain_policy'
  | 'P4_cancellation_policy'
  | 'P5_budget_available';

export const GATE_LABELS: Record<GateKey, string> = {
  G1_proposal_approval: 'Client approves the proposal',
  G2_deposit_paid: 'Deposit payment received',
  G3_design_approval: 'Client approves the design direction',
  G4_staging_review_approval: 'Client approves the staging review',
  G5_final_payment: 'Final build payment received',
  G6_deployment_approval: 'Client approves production deployment',
  G7_change_request_approval: 'Client approves billable change request',
  P1_validation_green: 'All automated validations pass',
  P2_deployment_lock_acquired: 'Deployment lock acquired',
  P3_domain_policy: 'Domain policy satisfied (client confirmation for transfers)',
  P4_cancellation_policy: 'Cancellation policy satisfied (confirmation + export offer)',
  P5_budget_available: 'Provider budget available',
};

export interface TransitionRule {
  to: ProjectStatus;
  /** Gates that must all be satisfied for this transition. */
  gates: GateKey[];
  description: string;
}

/** Statuses from which a project may be paused (pre-live only). */
export const PAUSABLE_STATUSES: ProjectStatus[] = [
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
];

/** Statuses from which a project may be cancelled (policy-gated). */
export const CANCELLABLE_STATUSES: ProjectStatus[] = [...PAUSABLE_STATUSES, 'draft', 'paused'];

const forward: Record<ProjectStatus, TransitionRule[]> = {
  draft: [{ to: 'discovery', gates: [], description: 'Client starts guided discovery.' }],
  discovery: [
    { to: 'scope_review', gates: [], description: 'Discovery complete; XBrain builds the structured scope.' },
  ],
  scope_review: [
    { to: 'quote_ready', gates: [], description: 'Scope confirmed; pricing engine produces the quote.' },
    { to: 'discovery', gates: [], description: 'Missing information — return to discovery.' },
  ],
  quote_ready: [
    { to: 'awaiting_approval', gates: [], description: 'Proposal presented to the client.' },
    { to: 'scope_review', gates: [], description: 'Client requests scope modifications.' },
  ],
  awaiting_approval: [
    { to: 'awaiting_deposit', gates: ['G1_proposal_approval'], description: 'Client approved the proposal.' },
    { to: 'scope_review', gates: [], description: 'Client requests modifications.' },
  ],
  awaiting_deposit: [
    { to: 'planning', gates: ['G2_deposit_paid'], description: 'Deposit received; project workspace is created.' },
  ],
  planning: [
    { to: 'design_direction', gates: [], description: 'Requirements and acceptance criteria generated.' },
  ],
  design_direction: [
    { to: 'awaiting_design_approval', gates: [], description: 'Design direction proposed.' },
  ],
  awaiting_design_approval: [
    { to: 'building', gates: ['G3_design_approval'], description: 'Client approved the design direction.' },
    { to: 'design_direction', gates: [], description: 'Client requests a revised direction.' },
  ],
  building: [
    { to: 'automated_review', gates: [], description: 'Implementation tasks completed; automated review begins.' },
  ],
  automated_review: [
    { to: 'qa', gates: ['P1_validation_green'], description: 'Code review and static analysis pass.' },
    { to: 'building', gates: [], description: 'Review failures — back to implementation.' },
  ],
  qa: [
    { to: 'awaiting_client_review', gates: ['P1_validation_green'], description: 'QA, accessibility, security, performance, and SEO checks pass; staging is ready.' },
    { to: 'building', gates: [], description: 'QA failures — back to implementation.' },
  ],
  awaiting_client_review: [
    { to: 'awaiting_final_payment', gates: ['G4_staging_review_approval'], description: 'Client approved the staging build.' },
    { to: 'revision', gates: [], description: 'Client requests bounded revisions.' },
  ],
  revision: [
    { to: 'building', gates: [], description: 'Revision scope agreed; implementation resumes.' },
  ],
  awaiting_final_payment: [
    { to: 'ready_for_deployment', gates: ['G5_final_payment'], description: 'Final payment received.' },
  ],
  ready_for_deployment: [
    { to: 'deploying', gates: ['G6_deployment_approval', 'P2_deployment_lock_acquired', 'P3_domain_policy'], description: 'Client approved go-live; deployment starts.' },
  ],
  deploying: [
    { to: 'live', gates: ['P1_validation_green'], description: 'Production smoke tests pass; website is live. Subscription starts.' },
    { to: 'ready_for_deployment', gates: [], description: 'Smoke tests failed — automatic rollback.' },
  ],
  live: [
    { to: 'monitoring', gates: [], description: 'Monitoring activated; operations handoff complete.' },
  ],
  monitoring: [
    { to: 'maintenance', gates: [], description: 'Scheduled maintenance or change-request work in progress.' },
    { to: 'incident', gates: [], description: 'Incident detected.' },
  ],
  maintenance: [
    { to: 'monitoring', gates: ['P1_validation_green'], description: 'Maintenance validated and deployed.' },
    { to: 'incident', gates: [], description: 'Incident detected during maintenance.' },
  ],
  incident: [
    { to: 'monitoring', gates: [], description: 'Incident resolved.' },
  ],
  paused: [],
  cancelled: [],
};

/** Full transition table including pause/resume/cancel cross-cutting rules. */
export function legalTransitions(from: ProjectStatus): TransitionRule[] {
  const rules = [...(forward[from] ?? [])];
  if (PAUSABLE_STATUSES.includes(from)) {
    rules.push({ to: 'paused', gates: [], description: 'Project paused by the client.' });
  }
  if (from === 'paused') {
    // Resume is modeled as pause → previous status; the workflow engine stores
    // the pre-pause status and validates the resume target against it.
    for (const s of PAUSABLE_STATUSES) {
      rules.push({ to: s, gates: [], description: 'Resume to the pre-pause stage.' });
    }
  }
  if (CANCELLABLE_STATUSES.includes(from)) {
    rules.push({
      to: 'cancelled',
      gates: ['P4_cancellation_policy'],
      description: 'Cancellation confirmed under policy; export workflow offered.',
    });
  }
  return rules;
}

export interface TransitionCheck {
  allowed: boolean;
  missingGates: GateKey[];
  reason: string;
}

export function canTransition(
  from: ProjectStatus,
  to: ProjectStatus,
  satisfiedGates: ReadonlySet<GateKey> | GateKey[],
): TransitionCheck {
  const satisfied = satisfiedGates instanceof Set ? satisfiedGates : new Set(satisfiedGates);
  const rule = legalTransitions(from).find((r) => r.to === to);
  if (!rule) {
    return {
      allowed: false,
      missingGates: [],
      reason: `Illegal transition: ${from} → ${to} is not defined in the workflow.`,
    };
  }
  const missing = rule.gates.filter((g) => !satisfied.has(g));
  if (missing.length > 0) {
    return {
      allowed: false,
      missingGates: missing,
      reason: `Blocked by unmet gate(s): ${missing.map((g) => GATE_LABELS[g]).join('; ')}.`,
    };
  }
  return { allowed: true, missingGates: [], reason: rule.description };
}

/**
 * The canonical ordered happy path, used by the portal timeline.
 */
export const HAPPY_PATH: ProjectStatus[] = [
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
  'awaiting_final_payment',
  'ready_for_deployment',
  'deploying',
  'live',
  'monitoring',
];
