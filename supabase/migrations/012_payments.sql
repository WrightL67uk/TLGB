-- Payment tracker: a member's jobs with their payment terms, each application and what happened
-- to it, and retentions. Dates are worked out in the app from the terms (lib/payDates.ts).

create table if not exists pay_jobs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  name text not null,
  contractor text not null,
  contractor_contact text,
  contractor_address text,
  contract_ref text,
  contract_sum numeric(14,2),
  terms text not null default 'scheme' check (terms in ('scheme', 'custom')),
  due_days integer not null default 0,
  final_days integer not null default 30,
  notice_days integer not null default 5,
  payless_days integer not null default 7,
  exclude_holidays boolean not null default true,
  retention_pct numeric(5,2) not null default 0,
  retention_override numeric(14,2),
  first_release_pct numeric(5,2) not null default 50,
  pc_date date,
  dlp_months integer not null default 12,
  first_released_on date,
  first_released_amount numeric(14,2),
  second_released_on date,
  second_released_amount numeric(14,2),
  notes text
);
create index if not exists pay_jobs_business_idx on pay_jobs (business_id);

create table if not exists pay_apps (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references pay_jobs(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  created_at timestamptz not null default now(),
  number integer not null,
  period_end date,
  applied_on date not null,
  gross_to_date numeric(14,2),
  amount_applied numeric(14,2) not null,
  payment_notice_on date,
  amount_notified numeric(14,2),
  payless_on date,
  amount_payless numeric(14,2),
  paid_on date,
  amount_paid numeric(14,2),
  notes text
);
create index if not exists pay_apps_job_idx on pay_apps (job_id);
create index if not exists pay_apps_business_idx on pay_apps (business_id);

-- Each reminder email is sent once
create table if not exists pay_reminders (
  ref_id uuid not null,
  kind text not null,
  sent_at timestamptz not null default now(),
  primary key (ref_id, kind)
);

alter table pay_jobs enable row level security;
alter table pay_apps enable row level security;
alter table pay_reminders enable row level security;
