import { NextResponse } from 'next/server';
import { getLatestClientQuote } from '@xsite/db';
import { resolveMembershipContext } from '@/lib/auth/request-context';
import { toErrorResponse } from '@/lib/api-errors';

/** GET .../quotes/latest — the current CLIENT-FACING quote only. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ organizationId: string; projectId: string }> },
): Promise<NextResponse> {
  try {
    const { organizationId, projectId } = await params;
    const ctx = await resolveMembershipContext(organizationId);
    const quote = await getLatestClientQuote(ctx.organization.id, projectId);
    if (!quote) {
      return NextResponse.json({ error: { code: 'not_found', message: 'No quote yet for this project.' } }, { status: 404 });
    }
    return NextResponse.json({ quote });
  } catch (error) {
    return toErrorResponse(error);
  }
}
