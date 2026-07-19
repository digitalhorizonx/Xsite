/**
 * Centralized environment validation.
 *
 * Every environment variable XSite depends on is declared here, once, with
 * an explicit required/optional distinction per runtime mode. Nothing reads
 * `process.env.X` directly outside this module (or its adapter-specific
 * counterparts) — that keeps "which secrets does this app need" answerable
 * by reading one file, and lets the health/readiness route report exactly
 * what's missing instead of failing with an opaque runtime error deep in a
 * request handler.
 *
 * This module NEVER throws at import time in development — missing
 * production-only vars (Clerk keys, payment provider keys) are expected
 * during local/demo work. It throws only when `requireProductionEnv()` is
 * called explicitly (from the health route and from the app's startup path
 * when NODE_ENV === 'production').
 */

export type RuntimeMode = 'development' | 'test' | 'production';

export interface EnvStatus {
  key: string;
  present: boolean;
  requiredIn: RuntimeMode[];
}

function readEnv(key: string): string | undefined {
  const value = process.env[key];
  return value && value.length > 0 ? value : undefined;
}

/** Declarative list — add a new integration's vars here, nowhere else. */
const ENV_SPEC: Array<{ key: string; requiredIn: RuntimeMode[] }> = [
  { key: 'DATABASE_URL', requiredIn: ['production'] },
  { key: 'NEXT_PUBLIC_APP_URL', requiredIn: ['production'] },

  // Auth (Clerk) — see docs/AUTHENTICATION.md
  { key: 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', requiredIn: ['production'] },
  { key: 'CLERK_SECRET_KEY', requiredIn: ['production'] },
  { key: 'CLERK_WEBHOOK_SECRET', requiredIn: ['production'] },

  // Payments — see docs/PAYMENTS.md. Provider is selected via PAYMENT_PROVIDER;
  // only that provider's keys are actually required in production.
  { key: 'PAYMENT_PROVIDER', requiredIn: ['production'] },
  { key: 'PAYMENT_SANDBOX_MODE', requiredIn: [] }, // optional everywhere; defaults to sandbox-safe
];

export function getEnvStatus(): EnvStatus[] {
  return ENV_SPEC.map((spec) => ({
    key: spec.key,
    present: readEnv(spec.key) !== undefined,
    requiredIn: spec.requiredIn,
  }));
}

export function currentRuntimeMode(): RuntimeMode {
  const mode = process.env.NODE_ENV;
  if (mode === 'production' || mode === 'test') return mode;
  return 'development';
}

export interface EnvValidationResult {
  ok: boolean;
  mode: RuntimeMode;
  missing: string[];
  statuses: EnvStatus[];
}

/** Never throws — pure inspection, safe to call from the health route. */
export function validateEnv(mode: RuntimeMode = currentRuntimeMode()): EnvValidationResult {
  const statuses = getEnvStatus();
  const missing = statuses.filter((s) => s.requiredIn.includes(mode) && !s.present).map((s) => s.key);
  return { ok: missing.length === 0, mode, missing, statuses };
}

/**
 * Throws with a clear, itemized message if required production variables
 * are missing. Call this from a startup path gated on
 * `NODE_ENV === 'production'` — never at module import time, since that
 * would break `next build` (which loads route modules without runtime
 * secrets present) and local development.
 */
export function requireProductionEnv(): void {
  const result = validateEnv('production');
  if (!result.ok) {
    throw new Error(
      `Missing required production environment variables: ${result.missing.join(', ')}. ` +
        'See .env.example and docs/DEPLOYMENT.md.',
    );
  }
}

export function isDemoMode(): boolean {
  return readEnv('DEMO_MODE') === '1' || currentRuntimeMode() !== 'production';
}
