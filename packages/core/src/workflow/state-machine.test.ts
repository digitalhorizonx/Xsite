import { describe, expect, it } from 'vitest';
import { PROJECT_STATUSES } from '../domain/types';
import {
  canTransition,
  HAPPY_PATH,
  legalTransitions,
  PAUSABLE_STATUSES,
} from './state-machine';

describe('workflow state machine', () => {
  it('every status in the happy path is a defined project status', () => {
    for (const s of HAPPY_PATH) expect(PROJECT_STATUSES).toContain(s);
  });

  it('walks the full happy path when all gates are satisfied', () => {
    const allGates = [
      'G1_proposal_approval',
      'G2_deposit_paid',
      'G3_design_approval',
      'G4_staging_review_approval',
      'G5_final_payment',
      'G6_deployment_approval',
      'P1_validation_green',
      'P2_deployment_lock_acquired',
      'P3_domain_policy',
    ] as const;
    for (let i = 0; i < HAPPY_PATH.length - 1; i++) {
      const check = canTransition(HAPPY_PATH[i]!, HAPPY_PATH[i + 1]!, [...allGates]);
      expect(check.allowed, `${HAPPY_PATH[i]} → ${HAPPY_PATH[i + 1]}: ${check.reason}`).toBe(true);
    }
  });

  it('rejects illegal jumps (no skipping stages)', () => {
    expect(canTransition('draft', 'building', []).allowed).toBe(false);
    expect(canTransition('discovery', 'live', []).allowed).toBe(false);
    expect(canTransition('quote_ready', 'deploying', []).allowed).toBe(false);
    expect(canTransition('live', 'building', []).allowed).toBe(false);
  });

  it('blocks proposal approval transition without the G1 gate', () => {
    const check = canTransition('awaiting_approval', 'awaiting_deposit', []);
    expect(check.allowed).toBe(false);
    expect(check.missingGates).toContain('G1_proposal_approval');
  });

  it('blocks build start without a paid deposit', () => {
    expect(canTransition('awaiting_deposit', 'planning', []).allowed).toBe(false);
    expect(canTransition('awaiting_deposit', 'planning', ['G2_deposit_paid']).allowed).toBe(true);
  });

  it('blocks production deployment without approval + lock + domain policy', () => {
    expect(canTransition('ready_for_deployment', 'deploying', ['G6_deployment_approval']).allowed).toBe(false);
    expect(
      canTransition('ready_for_deployment', 'deploying', [
        'G6_deployment_approval',
        'P2_deployment_lock_acquired',
        'P3_domain_policy',
      ]).allowed,
    ).toBe(true);
  });

  it('requires green validation to go from deploying to live (smoke tests)', () => {
    expect(canTransition('deploying', 'live', []).allowed).toBe(false);
    expect(canTransition('deploying', 'live', ['P1_validation_green']).allowed).toBe(true);
    // rollback path needs no gate
    expect(canTransition('deploying', 'ready_for_deployment', []).allowed).toBe(true);
  });

  it('allows pausing only from pre-live stages', () => {
    for (const s of PAUSABLE_STATUSES) {
      expect(canTransition(s, 'paused', []).allowed).toBe(true);
    }
    expect(canTransition('live', 'paused', []).allowed).toBe(false);
    expect(canTransition('monitoring', 'paused', []).allowed).toBe(false);
  });

  it('gates cancellation behind the cancellation policy', () => {
    expect(canTransition('building', 'cancelled', []).allowed).toBe(false);
    expect(canTransition('building', 'cancelled', ['P4_cancellation_policy']).allowed).toBe(true);
    // live projects are not cancellable through the plain project flow
    expect(canTransition('live', 'cancelled', ['P4_cancellation_policy']).allowed).toBe(false);
  });

  it('supports the revision loop and QA failure loops', () => {
    expect(canTransition('awaiting_client_review', 'revision', []).allowed).toBe(true);
    expect(canTransition('revision', 'building', []).allowed).toBe(true);
    expect(canTransition('qa', 'building', []).allowed).toBe(true);
    expect(canTransition('automated_review', 'building', []).allowed).toBe(true);
  });

  it('cancelled is terminal', () => {
    expect(legalTransitions('cancelled')).toHaveLength(0);
  });
});
