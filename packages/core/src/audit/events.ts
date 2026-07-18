/**
 * Immutable audit event model.
 *
 * Every state change, approval, agent run, provider execution, secret access,
 * deployment, and billing action emits an audit event. Events are insert-only:
 * corrections are new events, never edits or deletions. Payloads must be
 * redacted — secret values and internal cost formulas never enter the stream.
 */

export type AuditActorKind = 'user' | 'agent' | 'system';

export interface AuditActor {
  kind: AuditActorKind;
  /** User id, agent key, or system component name. */
  id: string;
}

export interface AuditEvent {
  id: string;
  at: string; // ISO timestamp
  actor: AuditActor;
  organizationRef: string;
  projectRef?: string;
  /** Dot-namespaced action, e.g. `quote.generated`, `deployment.rolled_back`. */
  action: string;
  /** What the action applied to, e.g. `quote:q_123`. */
  subject: string;
  /** Redacted, serializable details. */
  payload: Record<string, unknown>;
}

export interface NewAuditEvent {
  actor: AuditActor;
  organizationRef: string;
  projectRef?: string;
  action: string;
  subject: string;
  payload?: Record<string, unknown>;
}

/** Keys that are always stripped from audit payloads (defense in depth). */
const REDACTED_KEYS = [
  'secret',
  'token',
  'password',
  'apiKey',
  'api_key',
  'authorization',
  'margin',
  'costFloor',
  'formulaTrace',
];

export function redactPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (REDACTED_KEYS.some((r) => k.toLowerCase().includes(r.toLowerCase()))) {
      out[k] = '[REDACTED]';
    } else if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = redactPayload(v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export function createAuditEvent(input: NewAuditEvent, opts: { id: string; at: string }): AuditEvent {
  return {
    id: opts.id,
    at: opts.at,
    actor: input.actor,
    ...(input.projectRef !== undefined ? { projectRef: input.projectRef } : {}),
    organizationRef: input.organizationRef,
    action: input.action,
    subject: input.subject,
    payload: redactPayload(input.payload ?? {}),
  };
}

/** Append-only in-memory audit log (Phase 1 demo; DB-backed later). */
export class AuditLog {
  private events: AuditEvent[] = [];
  private seq = 0;

  append(input: NewAuditEvent, now: () => string = () => new Date().toISOString()): AuditEvent {
    this.seq += 1;
    const event = createAuditEvent(input, { id: `audit_${this.seq}`, at: now() });
    this.events.push(event);
    return event;
  }

  /** Read-only view; the underlying array is never exposed for mutation. */
  list(filter?: { projectRef?: string; organizationRef?: string }): readonly AuditEvent[] {
    return this.events.filter(
      (e) =>
        (!filter?.projectRef || e.projectRef === filter.projectRef) &&
        (!filter?.organizationRef || e.organizationRef === filter.organizationRef),
    );
  }
}
