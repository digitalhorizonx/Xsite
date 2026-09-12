'use client';

import type { Deal, Lead, PaymentMilestone, SalesState } from './sales-types';

const STORAGE_KEY = 'xsite.sales.mvp.v1';

const emptyState: SalesState = { leads: [], deals: [], payments: [] };

function isBrowser() {
  return typeof window !== 'undefined';
}

export function loadSalesState(): SalesState {
  if (!isBrowser()) return emptyState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState;
    const parsed = JSON.parse(raw) as Partial<SalesState>;
    return {
      leads: Array.isArray(parsed.leads) ? parsed.leads : [],
      deals: Array.isArray(parsed.deals) ? parsed.deals : [],
      payments: Array.isArray(parsed.payments) ? parsed.payments : [],
    };
  } catch {
    return emptyState;
  }
}

export function saveSalesState(state: SalesState) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent('xsite-sales-updated'));
}

export function addLead(lead: Lead) {
  const state = loadSalesState();
  state.leads.unshift(lead);
  saveSalesState(state);
  return lead;
}

export function updateLead(id: string, patch: Partial<Lead>) {
  const state = loadSalesState();
  state.leads = state.leads.map((lead) => (lead.id === id ? { ...lead, ...patch } : lead));
  saveSalesState(state);
}

export function createDealFromLead(lead: Lead, totalValue: number, dueDates: string[]) {
  const state = loadSalesState();
  const deal: Deal = {
    id: crypto.randomUUID(),
    leadId: lead.id,
    name: `${lead.businessName} — ${serviceLabel(lead.service)}`,
    clientName: lead.businessName,
    currency: 'JOD',
    totalValue,
    status: 'won',
    createdAt: new Date().toISOString(),
  };

  const percentages = [40, 30, 20, 10];
  const labels = ['Deposit', 'Midpoint', 'Pre-delivery', 'Final'];
  const payments: PaymentMilestone[] = percentages.map((percentage, index) => ({
    id: crypto.randomUUID(),
    dealId: deal.id,
    label: labels[index],
    percentage,
    amount: Math.round(totalValue * (percentage / 100) * 1000) / 1000,
    dueDate: dueDates[index] || new Date().toISOString().slice(0, 10),
    status: 'upcoming',
  }));

  state.deals.unshift(deal);
  state.payments.push(...payments);
  state.leads = state.leads.map((item) =>
    item.id === lead.id ? { ...item, status: 'won' as const, estimatedValue: totalValue } : item,
  );
  saveSalesState(state);
  return deal;
}

export function markPaymentPaid(paymentId: string) {
  const state = loadSalesState();
  state.payments = state.payments.map((payment) =>
    payment.id === paymentId
      ? { ...payment, status: 'paid' as const, paidAt: new Date().toISOString() }
      : payment,
  );
  saveSalesState(state);
}

export function paymentStatus(payment: PaymentMilestone): PaymentMilestone['status'] {
  if (payment.status === 'paid') return 'paid';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${payment.dueDate}T00:00:00`);
  if (due.getTime() < today.getTime()) return 'overdue';
  if (due.getTime() === today.getTime()) return 'due';
  return 'upcoming';
}

export function scoreLead(input: Pick<Lead, 'budget' | 'timeline' | 'problem' | 'service'>) {
  let score = 35;
  if (/2,500|5,000|10,000/.test(input.budget)) score += 25;
  else if (/1,000/.test(input.budget)) score += 15;
  else if (/500/.test(input.budget)) score += 5;
  if (/Immediately|2 weeks|1 month/.test(input.timeline)) score += 20;
  if (input.problem.trim().length >= 80) score += 10;
  if (input.service !== 'recommend') score += 10;
  return Math.min(100, score);
}

export function budgetMidpoint(budget: string) {
  if (budget.includes('10,000+')) return 12000;
  const values = budget.match(/[\d,]+/g)?.map((value) => Number(value.replace(/,/g, ''))) ?? [];
  if (values.length >= 2) return Math.round((values[0] + values[1]) / 2);
  if (values.length === 1) return values[0];
  return 0;
}

export function serviceLabel(service: Lead['service']) {
  return {
    website: 'Website',
    app: 'Mobile app',
    business_system: 'Business system',
    ai_solution: 'AI solution',
    ecommerce: 'E-commerce',
    crm: 'CRM / sales system',
    recommend: 'Solution discovery',
  }[service];
}
