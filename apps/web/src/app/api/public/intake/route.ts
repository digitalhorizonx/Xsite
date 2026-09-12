import { NextRequest, NextResponse } from 'next/server';
import { createLead } from '@/lib/server/sales-repository';
import { budgetMidpoint, scoreLead } from '@/lib/sales-store';
import type { Lead, ServiceType } from '@/lib/sales-types';
import { allowRequest } from '@/lib/server/rate-limit';

const services = new Set<ServiceType>(['website','app','business_system','ai_solution','ecommerce','crm','recommend']);
const clean = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!allowRequest(`intake:${ip}`)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  const length = Number(request.headers.get('content-length') || 0);
  if (length > 25000) return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  // Honeypot: bots often fill hidden fields. Silently accept without persisting.
  if (clean(body.companyWebsiteConfirm, 100)) return NextResponse.json({ ok: true }, { status: 202 });
  const service = clean(body.service, 40) as ServiceType;
  const businessName = clean(body.businessName, 160); const contactName = clean(body.contactName, 120);
  const phone = clean(body.phone, 40); const whatsapp = clean(body.whatsapp, 40); const goal = clean(body.goal, 2000); const problem = clean(body.problem, 6000);
  if (!services.has(service) || businessName.length < 2 || contactName.length < 2 || phone.length < 6 || whatsapp.length < 6 || goal.length < 2 || problem.length < 10) return NextResponse.json({ error: 'Required project information is incomplete' }, { status: 422 });
  const base = { service, budget: clean(body.budget, 80), timeline: clean(body.timeline, 80), problem } as Pick<Lead,'service'|'budget'|'timeline'|'problem'>;
  try {
    const lead = await createLead({ businessName, contactName, phone, whatsapp, email: clean(body.email, 200) || undefined, country: clean(body.country, 80) || 'Jordan', city: clean(body.city, 100) || undefined, industry: clean(body.industry, 120) || undefined, service, goal, problem, currentWorkflow: clean(body.currentWorkflow, 3000) || undefined, teamSize: clean(body.teamSize, 80) || undefined, maturity: clean(body.maturity, 200) || undefined, budget: base.budget || 'Not sure', timeline: base.timeline || 'No fixed deadline', source: 'xsite_project_intake', status: 'new', score: scoreLead(base), estimatedValue: budgetMidpoint(base.budget), nextAction: 'Review requirement and prepare solution brief' });
    return NextResponse.json({ ok: true, id: lead.id, score: lead.score }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ error: 'Unable to save project request' }, { status: 503 }); }
}
