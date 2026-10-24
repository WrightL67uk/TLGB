-- Team and training: members record each person's cards and tickets with expiry dates.
-- No copies of cards are stored, only the details.

create table if not exists team_people (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  role text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists team_people_business_idx on team_people (business_id);

create table if not exists team_quals (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references team_people(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  qual_type text not null,
  detail text,
  number text,
  achieved_on date,
  expiry date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists team_quals_person_idx on team_quals (person_id);
create index if not exists team_quals_expiry_idx on team_quals (expiry) where expiry is not null;

-- One row per reminder sent. Keyed on the expiry date, so a renewal starts the reminders again.
create table if not exists team_reminders (
  qual_id uuid not null references team_quals(id) on delete cascade,
  kind text not null,
  expiry date not null,
  sent_at timestamptz not null default now(),
  primary key (qual_id, kind, expiry)
);

-- Shortlist alerts: what each contractor last knew about each saved trade's paperwork,
-- so the daily job only emails about changes.
create table if not exists shortlist_watch (
  company_id uuid not null references contractor_companies(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  item text not null,
  expiry date,
  state text not null,
  updated_at timestamptz not null default now(),
  primary key (company_id, business_id, item)
);

alter table contractor_users add column if not exists shortlist_alerts boolean not null default true;

alter table team_people enable row level security;
alter table team_quals enable row level security;
alter table team_reminders enable row level security;
alter table shortlist_watch enable row level security;
