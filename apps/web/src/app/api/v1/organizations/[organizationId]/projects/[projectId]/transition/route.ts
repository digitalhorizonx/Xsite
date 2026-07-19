import { NextResponse } from 'next/server';
import { transitionProject } from '@xsite/db';
import type { ProjectStatus } from '@xsite/core';
import { resolveMembershipContext } from '@/lib/auth/request-context';
import { toErrorResponse } from '@/lib/api-errors';

/**
 * POST .../transition — the ONLY way a project's status changes from the
 * API layer. Re-validates against the real @xsite/core state machine using
 * gates actually recorded as satisfied in the database (see
 * @xsite/db/repositories/workflow.ts) — a client cannot skip a gate by
 * asserting a status directly.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ organizationId: string; projectId: string }> },
): Promise<NextResponse> {
  try {
    const { organizationId, projectId } = await params;
    const ctx = await resolveMembershipContext(organizationId);
    const body = (await request.json()) as { toStatus: ProjectStatus; reason?: string };
    if (!body.toStatus) {
      return NextResponse.json({ error: { code: 'invalid_body', message: 'toStatus is required.' } }, { status: 422 });
    }

    const project = await transitionProject({
      organizationId: ctx.organization.id,
      projectId,
      toStatus: body.toStatus,
      triggeredBy: { kind: 'user', id: ctx.user.id },
      ...(body.reason !== undefined ? { reason: body.reason } : {}),
    });
    return NextResponse.json({ project });
  } catch (error) {
    return toErrorResponse(error);
  }
}
