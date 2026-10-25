-- Job seekers: free profiles for people looking for landscaping and external works jobs.
-- Anyone can see an anonymised summary; names and contact details are shown only to
-- paying members and approved main contractors.

create table if not exists job_seekers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- draft: not finished; live: on the board; paused: hidden by the seeker or expired; removed: taken down by admin
  status text not null default 'draft' check (status in ('draft', 'live', 'paused', 'removed')),
  published_at timestamptz,
  expires_at timestamptz,
  expiry_warned_at timestamptz,
  removed_reason text,
  first_name text not null,
  last_name text not null,
  show_full_name boolean not null default false,
  headline text,
  about text,
  postcode text,
  lat double precision,
  lng double precision,
  area text,
  travel_miles integer not null default 20,
  stay_away boolean not null default false,
  years_experience integer,
  level text,
  skills text[] not null default '{}',
  other_skills text,
  cards text[] not null default '{}',
  other_cards text,
  licences text[] not null default '{}',
  vehicle text,
  tools text,
  work_types text[] not null default '{}',
  team_size integer not null default 1,
  available_from date,
  available_until date,
  pay_min numeric,
  pay_max numeric,
  pay_period text,
  past_employers text,
  phone text,
  show_phone boolean not null default false,
  show_email boolean not null default true,
  view_count integer not null default 0
);
create unique index if not exists job_seekers_email_idx on job_seekers (email) where status <> 'removed';
create index if not exists job_seekers_live_idx on job_seekers (status, expires_at) where status = 'live';

alter table job_seekers enable row level security;
