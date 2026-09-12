import 'server-only';
import { query, transaction } from './postgres';
import type { Lead, LeadStatus, SalesState } from '../sales-types';

function mapLead(row: Record<string, unknown>): Lead {
  return {
    id: String(row.id), createdAt: new Date(String(row.created_at)).toISOString(), businessName: String(row.business_name), contactName: String(row.contact_name),
    phone: String(row.phone), whatsapp: String(row.whatsapp), email: row.email ? String(row.email) : undefined, country: String(row.country), city: row.city ? String(row.city) : undefined,
    industry: row.industry ? String(row.industry) : undefined, service: row.service as Lead['service'], goal: String(row.goal), problem: String(row.problem),
    currentWorkflow: row.current_workflow ? String(row.current_workflow) : undefined, teamSize: row.team_size ? String(row.team_size) : undefined,
    maturity: row.maturity ? String(row.maturity) : undefined, budget: String(row.budget), timeline: String(row.timeline), source: String(row.source),
    status: row.status as LeadStatus, score: Number(row.score), estimatedValue: Number(row.estimated_value), nextAction: row.next_action ? String(row.next_action) : undefined,
    nextActionAt: row.next_action_at ? String(row.next_action_at) : undefined, solutionBrief: row.solution_brief ? String(row.solution_brief) : undefined,
  };
}

export async function createLead(input: Omit<Lead, 'id' | 'createdAt'>) {
  const result = await query<Record<string, unknown>>(
    `insert into sales_leads
      (business_name, contact_name, phone, whatsapp, email, country, city, industry, service, goal, problem, current_workflow, team_size, maturity, budget, timeline, source, status, score, estimated_value, next_action)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
     returning *`,
    [input.businessName, input.contactName, input.phone, input.whatsapp, input.email || null, input.country, input.city || null, input.industry || null, input.service, input.goal, input.problem, input.currentWorkflow || null, input.teamSize || null, input.maturity || null, input.budget, input.timeline, input.source, input.status, input.score, input.estimatedValue, input.nextAction || null],
  );
  return mapLead(result.rows[0]);
}

export async function getSalesState(): Promise<SalesState> {
  const [leadRows, dealRows, paymentRows] = await Promise.all([
    query<Record<string, unknown>>('select * from sales_leads order by created_at desc'),
    query<Record<string, unknown>>('select * from sales_deals order by created_at desc'),
    query<Record<string, unknown>>('select * from sales_payment_milestones order by due_date asc'),
  ]);
  return {
    leads: leadRows.rows.map(mapLead),
    deals: dealRows.rows.map((row) => ({ id: String(row.id), leadId: String(row.lead_id), name: String(row.name), clientName: String(row.client_name), currency: row.currency as 'JOD'|'USD'|'SAR'|'AED', totalValue: Number(row.total_value), status: row.status as 'draft'|'proposal_sent'|'won'|'active'|'completed'|'lost', createdAt: new Date(String(row.created_at)).toISOString() })),
    payments: paymentRows.rows.map((row) => ({ id: String(row.id), dealId: String(row.deal_id), label: String(row.label), percentage: Number(row.percentage), amount: Number(row.amount), dueDate: String(row.due_date).slice(0, 10), status: row.status as 'upcoming'|'due'|'overdue'|'paid', paidAt: row.paid_at ? new Date(String(row.paid_at)).toISOString() : undefined })),
  };
}

export async function patchLead(id: string, patch: Partial<Lead>) {
  const fields: string[] = [];
  const values: unknown[] = [];
  const add = (column: string, value: unknown) => { values.push(value); fields.push(`${column} = $${values.length}`); };
  if (patch.status) add('status', patch.status);
  if (patch.estimatedValue !== undefined) add('estimated_value', patch.estimatedValue);
  if (patch.nextAction !== undefined) add('next_action', patch.nextAction);
  if (patch.solutionBrief !== undefined) add('solution_brief', patch.solutionBrief);
  if (!fields.length) return;
  values.push(id);
  await query(`update sales_leads set ${fields.join(', ')}, updated_at = now() where id = $${values.length}`, values);
}

export async function createDeal(lead: Lead, totalValue: number, dueDates: string[]) {
  return transaction(async (client) => {
    const result = await client.query<{ id: string }>(
      `insert into sales_deals (lead_id, name, client_name, currency, total_value, status)
       values ($1,$2,$3,'JOD',$4,'won') returning id`,
      [lead.id, `${lead.businessName} — ${lead.service}`, lead.businessName, totalValue],
    );
    const dealId = result.rows[0].id;
    const percentages = [40, 30, 20, 10];
    const labels = ['Deposit', 'Midpoint', 'Pre-delivery', 'Final'];
    for (let i = 0; i < percentages.length; i += 1) {
      await client.query(
        `insert into sales_payment_milestones (deal_id, label, percentage, amount, due_date, status)
         values ($1,$2,$3,$4,$5,'upcoming')`,
        [dealId, labels[i], percentages[i], Math.round(totalValue * percentages[i]) / 100, dueDates[i]],
      );
    }
    await client.query(`update sales_leads set status='won', estimated_value=$1, updated_at=now() where id=$2`, [totalValue, lead.id]);
    await client.query(`insert into sales_activity (lead_id, deal_id, event_type, actor, note) values ($1,$2,'deal_created','system',$3)`, [lead.id, dealId, `Deal created for ${totalValue} JOD`]);
    return dealId;
  });
}

export async function payMilestone(id: string) {
  await query(`update sales_payment_milestones set status='paid', paid_at=now() where id=$1 and status <> 'paid'`, [id]);
}
