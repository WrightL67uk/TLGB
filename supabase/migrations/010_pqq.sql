-- PQQ answer bank: members save their standard answers once and reuse them on every
-- questionnaire and supplier portal. Question wording lives in lib/pqq.ts; only answers here.

create table if not exists pqq_answers (
  business_id uuid not null references businesses(id) on delete cascade,
  key text not null,
  short_text text,
  long_text text,
  data jsonb,
  updated_at timestamptz not null default now(),
  primary key (business_id, key)
);

create table if not exists pqq_projects (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  title text not null,
  client text,
  location text,
  value_gbp numeric,
  start_date date,
  end_date date,
  scope text,
  outcome text,
  ref_name text,
  ref_role text,
  ref_email text,
  ref_phone text,
  share_reference boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists pqq_projects_business_idx on pqq_projects (business_id);

-- One reminder a year to update turnover and accident figures.
create table if not exists pqq_reminders (
  business_id uuid not null references businesses(id) on delete cascade,
  period text not null,
  sent_at timestamptz not null default now(),
  primary key (business_id, period)
);

alter table pqq_answers enable row level security;
alter table pqq_projects enable row level security;
alter table pqq_reminders enable row level security;
