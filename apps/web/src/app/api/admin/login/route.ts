import { NextRequest, NextResponse } from 'next/server';
import { createAdminSession, verifyAdminPassword } from '@/lib/server/auth';
import { allowRequest } from '@/lib/server/rate-limit';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!allowRequest(`login:${ip}`, 5, 15 * 60 * 1000)) return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
  let body: { password?: string } = {};
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }); }
  try {
    if (!body.password || !verifyAdminPassword(body.password)) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    await createAdminSession();
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ error: 'Authentication is not configured' }, { status: 503 }); }
}
