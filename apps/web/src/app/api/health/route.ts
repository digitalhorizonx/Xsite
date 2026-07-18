import { NextResponse } from 'next/server';
import { currentRuntimeMode, isDemoMode, validateEnv } from '@/lib/env';

/**
 * GET /api/health
 *
 * Readiness/liveness endpoint for the deployment platform and for manual
 * verification after a deploy. Reports environment completeness honestly —
 * it does NOT report "healthy" just because the process is running if
 * required production configuration is missing.
 *
 * Never returns secret values, only which keys are present/missing.
 */
export async function GET(): Promise<NextResponse> {
  const mode = currentRuntimeMode();
  const env = validateEnv(mode);

  const body = {
    status: env.ok ? 'ok' : 'degraded',
    mode,
    demoMode: isDemoMode(),
    checkedAt: new Date().toISOString(),
    environment: {
      complete: env.ok,
      missing: env.missing,
    },
  };

  return NextResponse.json(body, { status: env.ok ? 200 : 503 });
}
