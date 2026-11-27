-- Partner programme: people and firms who introduce trades to TLGB and earn a recurring commission.
create table if not exists partners (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  kind text,
  code text not null unique,
  -- A long private address for the partner's own dashboard: /partner/<dashboard_token>
  dashboard_token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  status text not null default 'approved' check (status in ('approved','suspended')),
  -- Earned for each paid monthly payment, and for each paid yearly payment
  monthly_pence int not null default 1000 check (monthly_pence >= 0),
  yearly_pence int not null default 10000 check (yearly_pence >= 0),
  note text
);

-- One row per visit to a partner link (counts only, no personal data)
create table if not exists partner_clicks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  partner_id uuid not null references partners(id) on delete cascade
);
create index if not exists partner_clicks_partner_idx on partner_clicks (partner_id, created_at);

-- Which partner introduced a business (set at sign-up, never changed by the member)
alter table businesses add column if not exists partner_id uuid references partners(id) on delete set null;
alter table businesses add column if not exists partner_at timestamptz;
create index if not exists businesses_partner_idx on businesses (partner_id) where partner_id is not null;

-- The ledger: one row for each paid Stripe invoice from a referred member.
-- earned = owed to the partner, paid = you have paid it out, reversed = refunded or removed.
create table if not exists partner_commissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  partner_id uuid not null references partners(id) on delete cascade,
  business_id uuid references businesses(id) on delete set null,
  business_name text,
  stripe_invoice_id text not null unique,
  amount_pence int not null check (amount_pence >= 0),
  status text not null default 'earned' check (status in ('earned','paid','reversed')),
  paid_at timestamptz,
  note text
);
create index if not exists partner_commissions_partner_idx on partner_commissions (partner_id, status);

alter table partners enable row level security;
alter table partner_clicks enable row level security;
alter table partner_commissions enable row level security;
