-- TLGB (The Little Green Book) Phase 1 schema
-- Already ran an earlier version? Run the files in supabase/migrations/ in order instead
-- (only the ones added since you last ran it).
-- Run this in the Supabase SQL editor on a fresh project.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------
-- Trade categories (seeded below, editable by admin later)
-- ---------------------------------------------------------------
create table if not exists trade_categories (
  slug        text primary key,
  label       text not null,
  sort_order  int  not null default 0
);

insert into trade_categories (slug, label, sort_order) values
  ('landscaper',          'Landscaper',                    10),
  ('landscape-architect', 'Landscape Architect',           20),
  ('landscape-designer',  'Garden / Landscape Designer',   30),
  ('arborist',            'Arborist / Tree Surgeon',       40),
  ('groundworks',         'Groundworker',                  50),
  ('grounds-maintenance', 'Grounds Maintenance',           60),
  ('hard-landscaping',    'Hard Landscaping / Paving',     70),
  ('fencing',             'Fencing Contractor',            80),
  ('irrigation',          'Irrigation',                    90),
  ('play-sports',         'Play & Sports Surfacing',      100),
  ('gritting',            'Gritting / Winter Maintenance',110),
  ('nursery',             'Nursery / Plant Supplier',     120),
  ('supplier',            'Materials Supplier',           130),
  ('plant-hire',          'Machine / Plant Hire',         140),
  ('training',            'Training Provider',            150)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------
-- Businesses (one row per application / listing)
-- ---------------------------------------------------------------
create table if not exists businesses (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  -- Legal form: drives which verification path is used
  business_type         text not null check (business_type in ('ltd', 'sole_trader')),

  -- Ltd: filled from Companies House at application time
  company_number        text,
  ch_company_name       text,
  ch_status             text,
  ch_incorporated_on    date,
  ch_registered_address text,
  ch_raw                jsonb,

  -- Sole trader: owner details (letterhead goes in business_documents)
  owner_full_name       text,

  -- Common
  trading_name          text not null,
  contact_name          text not null,
  email                 text not null,
  phone                 text not null,
  website               text,
  business_address      text,
  description           text,

  base_postcode         text not null,
  lat                   double precision not null,
  lng                   double precision not null,
  radius_miles          int not null default 30 check (radius_miles between 5 and 300),

  trades                text[] not null default '{}',
  accreditations        text[] not null default '{}',

  -- Annual turnover band, used for banded listing prices (see lib/config.ts)
  turnover_band         text check (turnover_band in
                          ('under-100k', '100k-500k', '500k-2m', '2m-10m', 'over-10m')),

  pl_cover_amount       int,          -- public liability, GBP
  pl_expiry             date,
  el_cover_amount       int,          -- employers liability, GBP (optional)
  el_expiry             date,

  -- Review workflow
  -- draft = form saved, files still uploading; becomes pending_review on completion
  status                text not null default 'draft'
                        check (status in ('draft', 'pending_review', 'approved', 'rejected', 'suspended')),
  upload_token          text,
  reviewed_at           timestamptz,
  reviewed_by           text,
  rejection_reason      text,
  admin_notes           text,

  -- Set when an approved trade changes something that needs checking
  -- (insurance, accreditations, name...). Listing stays live meanwhile.
  recheck_required      boolean not null default false,
  recheck_reason        text,

  -- Billing (Stripe comes later; founding members can be marked free)
  founding_member       boolean not null default false,
  subscription_status   text not null default 'none'
                        check (subscription_status in ('none', 'active', 'past_due', 'cancelled')),

  constraint ltd_needs_company_number
    check (business_type <> 'ltd' or company_number is not null),
  constraint sole_trader_needs_owner
    check (business_type <> 'sole_trader' or owner_full_name is not null)
);

create index if not exists businesses_status_idx on businesses (status);
create index if not exists businesses_trades_idx on businesses using gin (trades);
create index if not exists businesses_accreds_idx on businesses using gin (accreditations);
create unique index if not exists businesses_company_number_uniq
  on businesses (company_number) where company_number is not null and status not in ('rejected', 'draft');

-- ---------------------------------------------------------------
-- Uploaded documents (private bucket "documents")
-- ---------------------------------------------------------------
create table if not exists business_documents (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references businesses(id) on delete cascade,
  created_at    timestamptz not null default now(),
  doc_type      text not null check (doc_type in (
                  'letterhead', 'public_liability', 'employers_liability',
                  'accreditation', 'other')),
  storage_path  text not null,
  file_name     text not null,
  mime_type     text not null,
  size_bytes    int  not null
);

create index if not exists business_documents_business_idx on business_documents (business_id);

-- ---------------------------------------------------------------
-- Portfolio photos (public bucket "portfolio")
-- ---------------------------------------------------------------
create table if not exists business_photos (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references businesses(id) on delete cascade,
  created_at    timestamptz not null default now(),
  storage_path  text not null,
  caption       text,
  sort_order    int not null default 0
);

create index if not exists business_photos_business_idx on business_photos (business_id);

-- ---------------------------------------------------------------
-- Audit trail of admin decisions
-- ---------------------------------------------------------------
create table if not exists review_events (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses(id) on delete cascade,
  created_at   timestamptz not null default now(),
  action       text not null check (action in ('submitted', 'approved', 'rejected', 'suspended', 'note',
                                                 'changed', 'resubmitted', 'rechecked', 'login_link')),
  actor        text not null,
  detail       text
);

-- ---------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists businesses_updated_at on businesses;
create trigger businesses_updated_at before update on businesses
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------
-- Search: approved listings whose coverage area reaches the job
-- postcode. Distance in miles via haversine (no PostGIS needed).
-- ---------------------------------------------------------------
create or replace function search_businesses(
  job_lat        double precision,
  job_lng        double precision,
  trade_slug     text default null,
  required_accreds text[] default '{}',
  min_pl_cover   int default null
)
returns table (
  id uuid, trading_name text, business_type text, trades text[],
  accreditations text[], pl_cover_amount int, pl_expiry date,
  base_postcode text, radius_miles int, website text, description text,
  distance_miles double precision
)
language sql stable as $$
  select * from (
    select b.id, b.trading_name, b.business_type, b.trades, b.accreditations,
           b.pl_cover_amount, b.pl_expiry, b.base_postcode, b.radius_miles,
           b.website, b.description,
           3958.8 * 2 * asin(sqrt(
             power(sin(radians(b.lat - job_lat) / 2), 2) +
             cos(radians(job_lat)) * cos(radians(b.lat)) *
             power(sin(radians(b.lng - job_lng) / 2), 2)
           )) as distance_miles
    from businesses b
    where b.status = 'approved'
      and (b.founding_member or b.subscription_status = 'active')
      and (trade_slug is null or trade_slug = any(b.trades))
      and (b.accreditations @> coalesce(required_accreds, '{}'))
      and (min_pl_cover is null or coalesce(b.pl_cover_amount, 0) >= min_pl_cover)
      and (b.pl_expiry is null or b.pl_expiry >= current_date)
  ) x
  where x.distance_miles <= x.radius_miles
  order by x.distance_miles asc
  limit 100;
$$;

-- ---------------------------------------------------------------
-- Row level security: everything goes through the server using the
-- service role key, so lock tables down for anon/auth clients.
-- ---------------------------------------------------------------
-- ---------------------------------------------------------------
-- Trade logins: one-time email links and browser sessions.
-- Only hashes of tokens are stored.
-- ---------------------------------------------------------------
create table if not exists login_tokens (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  email       text not null,
  token_hash  text not null unique,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_by  text not null default 'self'   -- 'self' or the admin who made it
);
create index if not exists login_tokens_email_idx on login_tokens (email, created_at);

create table if not exists sessions (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  email       text not null,
  token_hash  text not null unique,
  expires_at  timestamptz not null
);

create index if not exists businesses_email_idx on businesses (email);

alter table login_tokens        enable row level security;
alter table sessions            enable row level security;
alter table businesses          enable row level security;
alter table business_documents  enable row level security;
alter table business_photos     enable row level security;
alter table review_events       enable row level security;
alter table trade_categories    enable row level security;

drop policy if exists "public read categories" on trade_categories;
create policy "public read categories" on trade_categories for select using (true);

-- ---------------------------------------------------------------
-- Storage buckets
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('portfolio', 'portfolio', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------
-- Expiry reminders (same as migrations/003_expiry_reminders.sql)
-- ---------------------------------------------------------------
alter table businesses
  add column if not exists accreditation_expiries jsonb not null default '{}'::jsonb;

-- One row per reminder sent, so the daily job never sends the same one twice.
create table if not exists expiry_notices (
  business_id  uuid not null references businesses(id) on delete cascade,
  item         text not null,          -- public_liability, employers_liability, acc:<name>
  expiry       date not null,
  stage        text not null check (stage in ('30d', '7d', 'expired')),
  sent_at      timestamptz not null default now(),
  primary key (business_id, item, expiry, stage)
);
alter table expiry_notices enable row level security;

-- Search: expired accreditations no longer count and are not shown.
create or replace function search_businesses(
  job_lat        double precision,
  job_lng        double precision,
  trade_slug     text default null,
  required_accreds text[] default '{}',
  min_pl_cover   int default null
)
returns table (
  id uuid, trading_name text, business_type text, trades text[],
  accreditations text[], pl_cover_amount int, pl_expiry date,
  base_postcode text, radius_miles int, website text, description text,
  distance_miles double precision
)
language sql stable as $$
  select * from (
    select b.id, b.trading_name, b.business_type, b.trades,
           array(
             select a from unnest(b.accreditations) a
             where coalesce((b.accreditation_expiries->>a)::date, current_date) >= current_date
           ) as accreditations,
           b.pl_cover_amount, b.pl_expiry, b.base_postcode, b.radius_miles,
           b.website, b.description,
           3958.8 * 2 * asin(sqrt(
             power(sin(radians(b.lat - job_lat) / 2), 2) +
             cos(radians(job_lat)) * cos(radians(b.lat)) *
             power(sin(radians(b.lng - job_lng) / 2), 2)
           )) as distance_miles
    from businesses b
    where b.status = 'approved'
      and (b.founding_member or b.subscription_status = 'active')
      and (trade_slug is null or trade_slug = any(b.trades))
      and (min_pl_cover is null or coalesce(b.pl_cover_amount, 0) >= min_pl_cover)
      and (b.pl_expiry is null or b.pl_expiry >= current_date)
  ) x
  where x.distance_miles <= x.radius_miles
    and x.accreditations @> coalesce(required_accreds, '{}')
  order by x.distance_miles asc
  limit 100;
$$;

-- ---------------------------------------------------------------
-- Leads (same as migrations/004_leads.sql)
-- ---------------------------------------------------------------
create table if not exists leads (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  source        text not null check (source in ('fts', 'cf', 'pcs', 's2w')),
  source_id     text not null,
  title         text not null,
  description   text,
  buyer         text,
  postcode      text,
  region        text,
  lat           double precision,
  lng           double precision,
  value_amount  numeric,
  currency      text,
  published_at  timestamptz,
  deadline      timestamptz,
  url           text,
  cpv           text[] not null default '{}',
  trades        text[] not null default '{}',
  unique (source, source_id)
);
create index if not exists leads_published_idx on leads (published_at desc);
create index if not exists leads_deadline_idx on leads (deadline);
create index if not exists leads_trades_idx on leads using gin (trades);
alter table leads enable row level security;
