export type LeadStatus =
  | 'new'
  | 'qualified'
  | 'needs_clarification'
  | 'solution_ready'
  | 'proposal_sent'
  | 'negotiation'
  | 'won'
  | 'lost';

export type ServiceType =
  | 'website'
  | 'app'
  | 'business_system'
  | 'ai_solution'
  | 'ecommerce'
  | 'crm'
  | 'recommend';

export interface Lead {
  id: string;
  createdAt: string;
  businessName: string;
  contactName: string;
  phone: string;
  whatsapp: string;
  email?: string;
  country: string;
  city?: string;
  industry?: string;
  service: ServiceType;
  goal: string;
  problem: string;
  currentWorkflow?: string;
  teamSize?: string;
  maturity?: string;
  budget: string;
  timeline: string;
  source: string;
  status: LeadStatus;
  score: number;
  estimatedValue: number;
  nextAction?: string;
  nextActionAt?: string;
  solutionBrief?: string;
}

export interface Deal {
  id: string;
  leadId: string;
  name: string;
  clientName: string;
  currency: 'JOD' | 'USD' | 'SAR' | 'AED';
  totalValue: number;
  status: 'draft' | 'proposal_sent' | 'won' | 'active' | 'completed' | 'lost';
  createdAt: string;
}

export interface PaymentMilestone {
  id: string;
  dealId: string;
  label: string;
  percentage: number;
  amount: number;
  dueDate: string;
  status: 'upcoming' | 'due' | 'overdue' | 'paid';
  paidAt?: string;
}

export interface SalesState {
  leads: Lead[];
  deals: Deal[];
  payments: PaymentMilestone[];
}
