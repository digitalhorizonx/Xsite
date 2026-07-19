import { NextResponse } from 'next/server';
import { ForbiddenError, UnauthenticatedError } from '@xsite/core';
import { IllegalTransitionError, NotFoundError, TenantAccessError } from '@xsite/db';

/**
 * Maps domain errors to HTTP responses consistently across API routes.
 * TenantAccessError intentionally maps to 404, not 403 — confirming that a
 * resource exists in another organization would itself leak information.
 */
export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof UnauthenticatedError) {
    return NextResponse.json({ error: { code: 'unauthenticated', message: error.message } }, { status: 401 });
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: { code: 'forbidden', message: error.message } }, { status: 403 });
  }
  if (error instanceof NotFoundError || error instanceof TenantAccessError) {
    return NextResponse.json({ error: { code: 'not_found', message: 'Not found.' } }, { status: 404 });
  }
  if (error instanceof IllegalTransitionError) {
    return NextResponse.json(
      { error: { code: 'illegal_transition', message: error.reason, missingGates: error.missingGates } },
      { status: 409 },
    );
  }
  console.error('Unhandled API error:', error);
  return NextResponse.json({ error: { code: 'internal_error', message: 'Something went wrong.' } }, { status: 500 });
}
