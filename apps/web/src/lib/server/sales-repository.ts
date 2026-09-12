import 'server-only';
import { dbRequest } from './supabase';
import type { Lead, LeadStatus, SalesState } from '../sales-types';

function mapLead(row: Record<string, unknown>): Lead {
  return {
    id: String(row.id), createdAt: String(row.created_at), businessName: String(row.business_name), contactName: String(row.contact_name),
    phone: String(row.phone), whatsapp: String(row.whatsapp), email: row.email ? String(row.email) : undefined, country: String(row.country), city: row.city ? String(row.city) : undefined,
    industry: row.industry ? String(row.industry) : undefined, service: row.service as Lead['service'], goal: String(row.goal), problem: String(row.problem),
    currentWorkflow: row.current_workflow ? String(row.current_workflow) : undefined, teamSize: row.team_size ? String(row.team_size) : undefined,
    maturity: row.maturity ? String(row.maturity) : undefined, budget: String(row.budget), timeline: String(row.timeline), source: String(row.source),
    status: row.status as LeadStatus, score: Number(row.score), estimatedValue: Number(row.estimated_value), nextAction: row.next_action ? String(row.next_action) : undefined,
    nextActionAt: row.next_action_at ? String(row.next_action_at) : undefined, solutionBrief: row.solution_brief ? String(row.solution_brief) : undefined,
  };
}

export async function createLead(input: Omit<Lead, 'id' | 'createdAt'>) {
  const rows = await dbRequest<Record<string, unknown>[]>('sales_leads', { method: 'POST', body: JSON.stringify({ business_name: input.businessName, contact_name: input.contactName, phone: input.phone, whatsapp: input.whatsapp, email: input.email || null, country: input.country, city: input.city || null, industry: input.industry || null, service: input.service, goal: input.goal, problem: input.problem, current_workflow: input.currentWorkflow || null, team_size: input.teamSize || null, maturity: input.maturity || null, budget: input.budget, timeline: input.timeline, source: input.source, status: input.status, score: input.score, estimated_value: input.estimatedValue, next_action: input.nextAction || null }) });
  return mapLead(rows[0]);
}

export async function getSalesState(): Promise<SalesState> {
  const [leadRows, dealRows, paymentRows] = await Promise.all([
    dbRequest<Record<string, unknown>[]>('sales_leads?select=*&order=created_at.desc'),
    dbRequest<Record<string, unknown>[]>('sales_deals?select=*&order=created_at.desc'),
    dbRequest<Record<string, unknown>[]>('sales_payment_milestones?select=*&order=due_date.asc'),
  ]);
  return {
    leads: leadRows.map(mapLead),
    deals: dealRows.map((row) => ({ id: String(row.id), leadId: String(row.lead_id), name: String(row.name), clientName: String(row.client_name), currency: row.currency as 'JOD'|'USD'|'SAR'|'AED', totalValue: Number(row.total_value), status: row.status as 'draft'|'proposal_sent'|'won'|'active'|'completed'|'lost', createdAt: String(row.created_at) })),
    payments: paymentRows.map((row) => ({ id: String(row.id), dealId: String(row.deal_id), label: String(row.label), percentage: Number(row.percentage), amount: Number(row.amount), dueDate: String(row.due_date), status: row.status as 'upcoming'|'due'|'overdue'|'paid', paidAt: row.paid_at ? String(row.paid_at) : undefined })),
  };
}

export async function patchLead(id: string, patch: Partial<Lead>) {
  const body: Record<string, unknown> = {};
  if (patch.status) body.status = patch.status;
  if (patch.estimatedValue !== undefined) body.estimated_value = patch.estimatedValue;
  if (patch.nextAction !== undefined) body.next_action = patch.nextAction;
  if (patch.solutionBrief !== undefined) body.solution_brief = patch.solutionBrief;
  body.updated_at = new Date().toISOString();
  await dbRequest(`sales_leads?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function createDeal(lead: Lead, totalValue: number, dueDates: string[]) {
  const deals = await dbRequest<Record<string, unknown>[]>('sales_deals', { method: 'POST', body: JSON.stringify({ lead_id: lead.id, name: `${lead.businessName} — ${lead.service}`, client_name: lead.businessName, currency: 'JOD', total_value: totalValue, status: 'won' }) });
  const dealId = String(deals[0].id);
  const percentages = [40,30,20,10]; const labels = ['Deposit','Midpoint','Pre-delivery','Final'];
  await dbRequest('sales_payment_milestones', { method: 'POST', body: JSON.stringify(percentages.map((percentage, i) => ({ deal_id: dealId, label: labels[i], percentage, amount: Math.round(totalValue * percentage) / 100, due_date: dueDates[i], status: 'upcoming' }))) });
  await patchLead(lead.id, { status: 'won', estimatedValue: totalValue });
  return dealId;
}

export async function payMilestone(id: string) {
  await dbRequest(`sales_payment_milestones?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status: 'paid', paid_at: new Date().toISOString() }) });
}
