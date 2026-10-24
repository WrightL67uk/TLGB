-- Main contractor accounts: free to join, post jobs and keep a shortlist of trades.
-- Every company has a plan, so contractor features can be charged for later without a rebuild.

create table if not exists contractor_companies (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'suspended')),
  name text not null,
  company_number text,
  ch_company_name text,
  ch_status text,
  ch_registered_address text,
  website text,
  email_domain text,
  phone text,
  plan text not null default 'free',
  plan_overrides jsonb not null default '{}'::jsonb,
  founding boolean not null default true,
  rejection_reason text,
  approved_at timestamptz,
  terms_accepted_at timestamptz
);
create unique index if not exists contractor_companies_number_idx on contractor_companies (company_number)
  where company_number is not null and status <> 'rejected';

create table if not exists contractor_users (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references contractor_companies(id) on delete cascade,
  email text not null,
  name text not null,
  job_title text,
  role text not null default 'member' check (role in ('owner', 'member')),
  added_by text,
  created_at timestamptz not null default now(),
  removed_at timestamptz
);
create unique index if not exists contractor_users_email_idx on contractor_users (email) where removed_at is null;
create index if not exists contractor_users_company_idx on contractor_users (company_id);

-- Shortlist of trades, shared by everyone at the company
create table if not exists contractor_favourites (
  company_id uuid not null references contractor_companies(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  note text,
  added_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (company_id, business_id)
);

create table if not exists contractor_lists (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references contractor_companies(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (company_id, name)
);

create table if not exists contractor_list_items (
  list_id uuid not null references contractor_lists(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  primary key (list_id, business_id)
);

-- Jobs (work packages) posted by contractors
create table if not exists contractor_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references contractor_companies(id) on delete cascade,
  posted_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  status text not null default 'draft' check (status in ('draft', 'open', 'closed', 'removed')),
  title text not null,
  description text not null,
  trades text[] not null default '{}',
  postcode text not null,
  lat double precision,
  lng double precision,
  town text,
  region text,
  value_band text,
  start_date date,
  return_date date,
  min_pl bigint,
  accreditations text[] not null default '{}',
  docs_url text,
  contact_name text,
  contact_email text,
  notified_count integer not null default 0,
  closed_reason text
);
create index if not exists contractor_jobs_status_idx on contractor_jobs (status, published_at desc);
create index if not exists contractor_jobs_company_idx on contractor_jobs (company_id);

create table if not exists contractor_job_files (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references contractor_jobs(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes integer not null,
  created_at timestamptz not null default now()
);

create table if not exists contractor_job_invites (
  job_id uuid not null references contractor_jobs(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  invited_by text,
  invited_at timestamptz not null default now(),
  primary key (job_id, business_id)
);

create table if not exists contractor_job_replies (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references contractor_jobs(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  replied_by text not null,
  created_at timestamptz not null default now(),
  message text,
  pack_link_id uuid references pack_links(id) on delete set null,
  status text not null default 'new' check (status in ('new', 'shortlisted', 'declined')),
  contractor_note text,
  unique (job_id, business_id)
);

create table if not exists contractor_job_reports (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references contractor_jobs(id) on delete cascade,
  email text not null,
  reason text,
  created_at timestamptz not null default now()
);

-- Members can turn job alert emails off
alter table businesses add column if not exists job_alerts boolean not null default true;

-- Private bucket for job drawings and documents
insert into storage.buckets (id, name, public, file_size_limit)
values ('contractor-jobs', 'contractor-jobs', false, 26214400)
on conflict (id) do nothing;

-- Everything is read and written by the server with the service key; nothing is open to browsers
alter table contractor_companies enable row level security;
alter table contractor_users enable row level security;
alter table contractor_favourites enable row level security;
alter table contractor_lists enable row level security;
alter table contractor_list_items enable row level security;
alter table contractor_jobs enable row level security;
alter table contractor_job_files enable row level security;
alter table contractor_job_invites enable row level security;
alter table contractor_job_replies enable row level security;
alter table contractor_job_reports enable row level security;
