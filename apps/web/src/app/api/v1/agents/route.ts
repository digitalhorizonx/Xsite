import { NextResponse } from 'next/server';
import { AGENT_CATALOG } from '@xsite/core';

/** GET /api/v1/agents — the typed agent catalog (read-only). */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ agents: AGENT_CATALOG });
}
