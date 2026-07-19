import { NextResponse } from 'next/server';
import { saveDiscovery } from '@xsite/db';
import { resolveMembershipContext } from '@/lib/auth/request-context';
import { toErrorResponse } from '@/lib/api-errors';

interface SaveDiscoveryBody {
  answers: Record<string, unknown>;
  completeness: number;
  missingFields: string[];
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ organizationId: string; projectId: string }> },
): Promise<NextResponse> {
  try {
    const { organizationId, projectId } = await params;
    const ctx = await resolveMembershipContext(organizationId);
    const body = (await request.json()) as SaveDiscoveryBody;

    const session = await saveDiscovery({
      organizationId: ctx.organization.id,
      projectId,
      answers: body.answers ?? {},
      completeness: body.completeness ?? 0,
      missingFields: body.missingFields ?? [],
      actorUserId: ctx.user.id,
    });
    return NextResponse.json({ discoverySession: session });
  } catch (error) {
    return toErrorResponse(error);
  }
}
