import { NextResponse } from 'next/server';
import { recordApprovalDecision } from '@xsite/db';
import type { GateKey } from '@xsite/core';
import { resolveMembershipContext } from '@/lib/auth/request-context';
import { toErrorResponse } from '@/lib/api-errors';

interface ApprovalBody {
  quoteId: string;
  gate: GateKey;
  decision: 'approved' | 'changes_requested';
  note?: string;
}

/**
 * POST .../approvals — records a client decision on an approval gate.
 * This does NOT itself move the project's workflow status — see the
 * .../transition route, which re-validates against the real state machine
 * using whichever gates are actually satisfied in the database.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ organizationId: string; projectId: string }> },
): Promise<NextResponse> {
  try {
    const { organizationId, projectId } = await params;
    const ctx = await resolveMembershipContext(organizationId);
    const body = (await request.json()) as ApprovalBody;
    if (!body.quoteId || !body.gate || !body.decision) {
      return NextResponse.json(
        { error: { code: 'invalid_body', message: 'quoteId, gate, and decision are required.' } },
        { status: 422 },
      );
    }

    const approval = await recordApprovalDecision({
      organizationId: ctx.organization.id,
      projectId,
      quoteId: body.quoteId,
      gate: body.gate,
      decision: body.decision,
      decidedByUserId: ctx.user.id,
      ...(body.note !== undefined ? { note: body.note } : {}),
    });
    return NextResponse.json({ approval }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
