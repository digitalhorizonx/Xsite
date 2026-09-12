import { NextResponse } from 'next/server';
import { clearAdminSession } from '@/lib/server/auth';

export async function POST() {
  await clearAdminSession();
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
