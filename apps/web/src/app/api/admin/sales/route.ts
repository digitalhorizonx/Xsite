import { NextRequest, NextResponse } from 'next/server';
import { isAdminSession } from '@/lib/server/auth';
import { createDeal, getSalesState, patchLead, payMilestone } from '@/lib/server/sales-repository';

async function denied() { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

export async function GET() {
  if (!(await isAdminSession())) return denied();
  try { return NextResponse.json(await getSalesState(), { headers: { 'Cache-Control': 'no-store' } }); }
  catch { return NextResponse.json({ error: 'Sales database unavailable' }, { status: 503 }); }
}

export async function PATCH(request: NextRequest) {
  if (!(await isAdminSession())) return denied();
  let body: Record<string, unknown>; try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }); }
  try {
    if (body.action === 'lead_status' && typeof body.id === 'string' && typeof body.status === 'string') await patchLead(body.id, { status: body.status as never });
    else if (body.action === 'payment_paid' && typeof body.id === 'string') await payMilestone(body.id);
    else return NextResponse.json({ error: 'Unsupported action' }, { status: 422 });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: 'Operation failed' }, { status: 503 }); }
}

export async function POST(request: NextRequest) {
  if (!(await isAdminSession())) return denied();
  let body: Record<string, unknown>; try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }); }
  if (body.action !== 'create_deal' || typeof body.leadId !== 'string' || typeof body.totalValue !== 'number' || !Array.isArray(body.dueDates)) return NextResponse.json({ error: 'Invalid deal request' }, { status: 422 });
  if (!Number.isFinite(body.totalValue) || body.totalValue <= 0 || body.totalValue > 10000000) return NextResponse.json({ error: 'Invalid deal value' }, { status: 422 });
  try {
    const state = await getSalesState(); const lead = state.leads.find((item) => item.id === body.leadId);
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    await createDeal(lead, body.totalValue, (body.dueDates as unknown[]).slice(0, 4).map(String));
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch { return NextResponse.json({ error: 'Unable to create deal' }, { status: 503 }); }
}
