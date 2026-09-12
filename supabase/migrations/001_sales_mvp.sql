-- XSite Sales MVP persistence
-- Run in Supabase SQL editor or migration runner.
-- No anonymous/authenticated policies are created: all operational access is server-side
-- through the service-role key, which must never be exposed to browsers.

create extension if not exists pgcrypto;

create table if not exists sales_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  business_name text not null check (char_length(business_name) between 2 and 160),
  contact_name text not null check (char_length(contact_name) between 2 and 120),
  phone text not null check (char_length(phone) <= 40),
  whatsapp text not null check (char_length(whatsapp) <= 40),
  email text check (email is null or char_length(email) <= 200),
  country text not null check (char_length(country) <= 80),
  city text check (city is null or char_length(city) <= 100),
  industry text check (industry is null or char_length(industry) <= 120),
  service text not null check (service in ('website','app','business_system','ai_solution','ecommerce','crm','recommend')),
  goal text not null check (char_length(goal) <= 2000),
  problem text not null check (char_length(problem) between 10 and 6000),
  current_workflow text check (current_workflow is null or char_length(current_workflow) <= 3000),
  team_size text check (team_size is null or char_length(team_size) <= 80),
  maturity text check (maturity is null or char_length(maturity) <= 200),
  budget text not null check (char_length(budget) <= 80),
  timeline text not null check (char_length(timeline) <= 80),
  source text not null default 'xsite_project_intake' check (char_length(source) <= 500),
  status text not null default 'new' check (status in ('new','qualified','needs_clarification','solution_ready','proposal_sent','negotiation','won','lost')),
  score integer not null default 0 check (score between 0 and 100),
  estimated_value numeric(14,3) not null default 0 check (estimated_value >= 0),
  next_action text check (next_action is null or char_length(next_action) <= 1000),
  next_action_at timestamptz,
  solution_brief text check (solution_brief is null or char_length(solution_brief) <= 12000)
);

create index if not exists idx_sales_leads_status_created on sales_leads(status, created_at desc);
create index if not exists idx_sales_leads_score on sales_leads(score desc);

create table if not exists sales_proposals (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references sales_leads(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'draft' check (status in ('draft','sent','accepted','rejected','expired')),
  currency text not null default 'JOD' check (currency in ('JOD','USD','SAR','AED')),
  price numeric(14,3) not null check (price >= 0),
  title text not null check (char_length(title) <= 240),
  scope jsonb not null default '[]'::jsonb,
  timeline text not null check (char_length(timeline) <= 240),
  assumptions jsonb not null default '[]'::jsonb,
  exclusions jsonb not null default '[]'::jsonb,
  client_notes text check (client_notes is null or char_length(client_notes) <= 5000)
);

create index if not exists idx_sales_proposals_lead on sales_proposals(lead_id, created_at desc);

create table if not exists sales_deals (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null unique references sales_leads(id) on delete restrict,
  proposal_id uuid references sales_proposals(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null check (char_length(name) <= 240),
  client_name text not null check (char_length(client_name) <= 160),
  currency text not null default 'JOD' check (currency in ('JOD','USD','SAR','AED')),
  total_value numeric(14,3) not null check (total_value >= 0),
  status text not null default 'won' check (status in ('draft','proposal_sent','won','active','completed','lost'))
);

create index if not exists idx_sales_deals_status on sales_deals(status, created_at desc);

create table if not exists sales_payment_milestones (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references sales_deals(id) on delete cascade,
  created_at timestamptz not null default now(),
  label text not null check (char_length(label) <= 120),
  percentage integer not null check (percentage between 0 and 100),
  amount numeric(14,3) not null check (amount >= 0),
  due_date date not null,
  status text not null default 'upcoming' check (status in ('upcoming','due','overdue','paid')),
  paid_at timestamptz
);

create index if not exists idx_sales_payments_due on sales_payment_milestones(status, due_date);
create index if not exists idx_sales_payments_deal on sales_payment_milestones(deal_id);

create table if not exists sales_activity (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references sales_leads(id) on delete cascade,
  deal_id uuid references sales_deals(id) on delete cascade,
  created_at timestamptz not null default now(),
  event_type text not null check (char_length(event_type) <= 80),
  actor text not null default 'system' check (char_length(actor) <= 120),
  note text check (note is null or char_length(note) <= 4000),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_sales_activity_lead on sales_activity(lead_id, created_at desc);

alter table sales_leads enable row level security;
alter table sales_proposals enable row level security;
alter table sales_deals enable row level security;
alter table sales_payment_milestones enable row level security;
alter table sales_activity enable row level security;

-- SECURITY GATE:
-- Deliberately no anon/authenticated RLS policies. Browser clients cannot query these
-- tables directly. Next.js server routes are the only data boundary in the MVP.
