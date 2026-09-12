import type { Lead, ServiceType } from './sales-types';

const serviceBlueprints: Record<ServiceType, { title: string; deliverables: string[]; weeks: string }> = {
  website: { title: 'Conversion-focused website', deliverables: ['UX and conversion architecture', 'Responsive website', 'Lead capture and analytics', 'SEO-ready technical foundation'], weeks: '2–4 weeks' },
  app: { title: 'Customer mobile application', deliverables: ['Product flow and UX', 'Mobile application MVP', 'Backend/API integration', 'Analytics and release readiness'], weeks: '6–10 weeks' },
  business_system: { title: 'Custom business operations system', deliverables: ['Workflow mapping', 'Role-based operational dashboard', 'Core workflow automation', 'Reporting and audit trail'], weeks: '4–8 weeks' },
  ai_solution: { title: 'Applied AI automation system', deliverables: ['AI use-case design', 'Knowledge/context layer', 'Agent or automation workflow', 'Human review and safety controls'], weeks: '3–6 weeks' },
  ecommerce: { title: 'E-commerce sales platform', deliverables: ['Storefront and product UX', 'Checkout/payment integration', 'Order operations', 'Analytics and conversion tracking'], weeks: '3–6 weeks' },
  crm: { title: 'Sales CRM and revenue workflow', deliverables: ['Lead pipeline', 'Follow-up workflow', 'Deal and proposal tracking', 'Revenue and collection dashboard'], weeks: '3–6 weeks' },
  recommend: { title: 'Digital solution discovery', deliverables: ['Business process assessment', 'Solution architecture', 'Prioritized MVP scope', 'Implementation roadmap'], weeks: '1–2 weeks discovery + build' },
};

export function buildSolutionBrief(lead: Lead) {
  const blueprint = serviceBlueprints[lead.service];
  const gaps = [
    lead.problem.length < 80 ? 'Clarify the problem and expected measurable outcome.' : '',
    !lead.industry ? 'Confirm industry and operating context.' : '',
    lead.budget === 'Not sure' ? 'Confirm commercial budget before proposal approval.' : '',
  ].filter(Boolean);
  return {
    title: blueprint.title,
    summary: `${lead.businessName} needs ${blueprint.title.toLowerCase()} to support: ${lead.goal}.`,
    problem: lead.problem,
    deliverables: blueprint.deliverables,
    implementation: blueprint.weeks,
    commercialRange: commercialRange(lead),
    questions: gaps.length ? gaps : ['Confirm final scope, integrations and launch owner.'],
    confidence: Math.min(95, Math.max(45, lead.score)),
  };
}

export function buildProposal(lead: Lead, price?: number) {
  const brief = buildSolutionBrief(lead);
  const investment = price || lead.estimatedValue || 1000;
  return {
    title: `${brief.title} for ${lead.businessName}`,
    executiveSummary: `HorizonX proposes a focused ${brief.title.toLowerCase()} designed around the business outcome supplied during qualification: ${lead.goal}.`,
    scope: brief.deliverables,
    timeline: brief.implementation,
    investment,
    currency: 'JOD' as const,
    paymentPlan: [40, 30, 20, 10],
    assumptions: ['Client provides required approvals and source information on time.', 'Third-party subscriptions and usage fees are excluded unless explicitly listed.', 'Material scope changes are quoted separately.'],
    nextStep: 'Review scope and commercial terms, then approve the proposal to schedule the project.',
  };
}

export function commercialRange(lead: Lead) {
  const midpoint = lead.estimatedValue || 1000;
  return { min: Math.max(300, Math.round(midpoint * 0.8)), max: Math.max(500, Math.round(midpoint * 1.25)), currency: 'JOD' as const };
}

export function qualificationLabel(score: number) {
  if (score >= 80) return 'Hot';
  if (score >= 60) return 'Warm';
  if (score >= 40) return 'Nurture';
  return 'Low priority';
}
