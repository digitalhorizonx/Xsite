'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createDealFromLead, loadSalesState, markPaymentPaid, paymentStatus, saveSalesState, serviceLabel, updateLead } from '@/lib/sales-store';
import type { Lead, LeadStatus, SalesState } from '@/lib/sales-types';

const stages: Array<{ value: LeadStatus; label: string }> = [
  { value: 'new', label: 'New' }, { value: 'qualified', label: 'Qualified' }, { value: 'needs_clarification', label: 'Needs clarification' },
  { value: 'solution_ready', label: 'Solution ready' }, { value: 'proposal_sent', label: 'Proposal sent' }, { value: 'negotiation', label: 'Negotiation' },
  { value: 'won', label: 'Won' }, { value: 'lost', label: 'Lost' },
];

export default function SalesDashboardPage() {
  const [state, setState] = useState<SalesState>({ leads: [], deals: [], payments: [] });
  const [tab, setTab] = useState<'overview' | 'pipeline' | 'cashflow'>('overview');
  const refresh = () => setState(loadSalesState());
  useEffect(() => { refresh(); const handler = () => refresh(); window.addEventListener('xsite-sales-updated', handler); return () => window.removeEventListener('xsite-sales-updated', handler); }, []);

  const metrics = useMemo(() => {
    const openLeads = state.leads.filter((l) => !['won', 'lost'].includes(l.status));
    const pipeline = openLeads.reduce((sum, l) => sum + l.estimatedValue, 0);
    const paid = state.payments.filter((p) => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
    const outstanding = state.payments.filter((p) => p.status !== 'paid').reduce((sum, p) => sum + p.amount, 0);
    const overdue = state.payments.filter((p) => paymentStatus(p) === 'overdue').reduce((sum, p) => sum + p.amount, 0);
    return { openLeads: openLeads.length, pipeline, paid, outstanding, overdue };
  }, [state]);

  return <div className="space-y-7"><header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-orange-500">Revenue command center</p><h1 className="mt-1 text-3xl font-black">Sales & Cashflow</h1><p className="mt-1 text-sm text-slate-500">Turn XSite inquiries into defined solutions, deals and collected cash.</p></div><Link href="/start-project" className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-black">+ New project intake</Link></header>

  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><Metric label="Open leads" value={String(metrics.openLeads)} /><Metric label="Pipeline" value={`${metrics.pipeline.toLocaleString()} JOD`} /><Metric label="Collected" value={`${metrics.paid.toLocaleString()} JOD`} /><Metric label="Outstanding" value={`${metrics.outstanding.toLocaleString()} JOD`} /><Metric label="Overdue" value={`${metrics.overdue.toLocaleString()} JOD`} alert={metrics.overdue > 0} /></div>

  <div className="flex gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">{(['overview', 'pipeline', 'cashflow'] as const).map((item) => <button key={item} onClick={() => setTab(item)} className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize ${tab === item ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-500'}`}>{item}</button>)}</div>

  {tab === 'overview' && <Overview state={state} />}
  {tab === 'pipeline' && <Pipeline state={state} refresh={refresh} />}
  {tab === 'cashflow' && <Cashflow state={state} refresh={refresh} />}
  </div>;
}

function Overview({ state }: { state: SalesState }) {
  const priority = [...state.leads].filter((l) => !['won', 'lost'].includes(l.status)).sort((a, b) => b.score - a.score).slice(0, 5);
  const overdue = state.payments.filter((p) => paymentStatus(p) === 'overdue' && p.status !== 'paid');
  return <div className="grid gap-6 lg:grid-cols-2"><Panel title="Highest-priority leads">{priority.length ? <div className="space-y-3">{priority.map((lead) => <div key={lead.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800"><div><p className="font-bold">{lead.businessName}</p><p className="text-sm text-slate-500">{serviceLabel(lead.service)} · {lead.budget}</p><p className="mt-1 text-xs text-slate-400">Next: {lead.nextAction}</p></div><div className="text-right"><p className="text-2xl font-black text-orange-500">{lead.score}</p><p className="text-xs text-slate-400">score</p></div></div>)}</div> : <Empty text="No leads yet. Submit the project intake to create the first lead." />}</Panel><Panel title="Money needing attention">{overdue.length ? <div className="space-y-3">{overdue.map((payment) => <div key={payment.id} className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/20"><p className="font-bold text-red-700 dark:text-red-300">{payment.amount.toLocaleString()} JOD overdue</p><p className="text-sm text-slate-500">{payment.label} · due {payment.dueDate}</p></div>)}</div> : <Empty text="No overdue installments." />}</Panel></div>;
}

function Pipeline({ state, refresh }: { state: SalesState; refresh: () => void }) {
  return <div className="overflow-x-auto pb-3"><div className="flex min-w-max gap-4">{stages.map((stage) => { const leads = state.leads.filter((l) => l.status === stage.value); return <section key={stage.value} className="w-72 shrink-0"><div className="mb-3 flex items-center justify-between"><h2 className="font-bold">{stage.label}</h2><span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs dark:bg-slate-800">{leads.length}</span></div><div className="space-y-3">{leads.map((lead) => <LeadCard key={lead.id} lead={lead} refresh={refresh} />)}</div></section>; })}</div></div>;
}

function LeadCard({ lead, refresh }: { lead: Lead; refresh: () => void }) {
  const [showDeal, setShowDeal] = useState(false); const [value, setValue] = useState(lead.estimatedValue || 1000);
  const dates = [0, 14, 28, 35].map((days) => { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); });
  return <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex justify-between gap-2"><div><p className="font-bold">{lead.businessName}</p><p className="text-xs text-slate-500">{serviceLabel(lead.service)}</p></div><span className="font-black text-orange-500">{lead.score}</span></div><p className="mt-3 line-clamp-3 text-sm text-slate-600 dark:text-slate-400">{lead.problem}</p><p className="mt-3 text-xs font-semibold">{lead.estimatedValue.toLocaleString()} JOD estimated</p><select value={lead.status} onChange={(e) => { updateLead(lead.id, { status: e.target.value as LeadStatus }); refresh(); }} className="mt-3 w-full rounded-lg border border-slate-200 bg-transparent px-2 py-2 text-xs dark:border-slate-700">{stages.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select>{lead.status !== 'won' && <button onClick={() => setShowDeal((v) => !v)} className="mt-2 w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white dark:bg-white dark:text-slate-900">Convert to deal</button>}{showDeal && <div className="mt-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-950"><label className="text-xs text-slate-500">Contract value (JOD)</label><input type="number" value={value} onChange={(e) => setValue(Number(e.target.value))} className="input mt-1" /><button onClick={() => { createDealFromLead(lead, value, dates); setShowDeal(false); refresh(); }} className="mt-2 w-full rounded-lg bg-orange-500 px-3 py-2 text-xs font-black text-black">Create 40/30/20/10 schedule</button></div>}</article>;
}

function Cashflow({ state, refresh }: { state: SalesState; refresh: () => void }) {
  const payments = [...state.payments].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return <Panel title="Payment schedule"><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="text-xs uppercase text-slate-400"><tr><th className="pb-3">Client</th><th>Milestone</th><th>Due</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>{payments.map((payment) => { const deal = state.deals.find((d) => d.id === payment.dealId); const status = paymentStatus(payment); return <tr key={payment.id} className="border-t border-slate-200 dark:border-slate-800"><td className="py-4 font-semibold">{deal?.clientName ?? 'Client'}</td><td>{payment.label} ({payment.percentage}%)</td><td>{payment.dueDate}</td><td className="font-bold">{payment.amount.toLocaleString()} JOD</td><td><span className={`rounded-full px-2 py-1 text-xs font-bold ${status === 'paid' ? 'bg-emerald-100 text-emerald-700' : status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>{status}</span></td><td>{status !== 'paid' && <button onClick={() => { markPaymentPaid(payment.id); refresh(); }} className="text-xs font-bold text-emerald-600">Mark paid</button>}</td></tr>; })}</tbody></table>{!payments.length && <Empty text="No payment schedules yet. Convert a lead into a deal first." />}</div></Panel>;
}

function Metric({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) { return <div className={`rounded-xl border p-4 ${alert ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></div>; }
function Panel({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><h2 className="mb-4 font-black">{title}</h2>{children}</section>; }
function Empty({ text }: { text: string }) { return <p className="py-8 text-center text-sm text-slate-400">{text}</p>; }
