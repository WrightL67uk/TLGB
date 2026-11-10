-- Recruitment both ways: members post vacancies (paid members, 5 posts each unless admin adds more),
-- employers save searches for new job seekers, and job seekers get emailed matching vacancies.

alter table businesses add column if not exists vacancy_limit integer not null default 5;

create table if not exists vacancies (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'live' check (status in ('live', 'closed', 'removed')),
  expires_at timestamptz not null,
  title text not null,
  level text,
  skills text[] not null default '{}',
  cards text[] not null default '{}',
  work_types text[] not null default '{}',
  description text not null,
  postcode text not null,
  area text,
  lat double precision,
  lng double precision,
  pay_min numeric,
  pay_max numeric,
  pay_period text,
  start_date date,
  own_vehicle boolean not null default false,
  apply_email text,
  apply_phone text,
  apply_url text,
  view_count integer not null default 0,
  alerts_done_at timestamptz
);
create index if not exists vacancies_live on vacancies (status, expires_at);
create index if not exists vacancies_business on vacancies (business_id);

-- Job seekers choose whether to get emailed matching vacancies (on unless they untick it)
alter table job_seekers add column if not exists vacancy_alerts boolean not null default true;

-- Saved searches: email me when new people match
create table if not exists recruit_alerts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text not null,
  skill text,
  level text,
  card text,
  postcode text,
  lat double precision,
  lng double precision,
  own_vehicle boolean not null default false,
  available_now boolean not null default false,
  token text not null,
  last_checked_at timestamptz not null default now()
);
create index if not exists recruit_alerts_email on recruit_alerts (email);

-- What has been emailed, so nobody gets the same match twice
create table if not exists recruit_sent (
  kind text not null,
  to_email text not null,
  item_id uuid not null,
  sent_at timestamptz not null default now(),
  primary key (kind, to_email, item_id)
);

alter table vacancies enable row level security;
alter table recruit_alerts enable row level security;
alter table recruit_sent enable row level security;

select count(*) as vacancies from vacancies;
