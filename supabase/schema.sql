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

-- 005: more lead types (contractor wins, upcoming tenders, planning applications, tree works)
alter table leads drop constraint if exists leads_source_check;
alter table leads add constraint leads_source_check check (source in ('fts', 'cf', 'pcs', 's2w', 'planit'));
alter table leads add column if not exists kind text not null default 'tender';
alter table leads drop constraint if exists leads_kind_check;
alter table leads add constraint leads_kind_check check (kind in ('tender', 'pipeline', 'award', 'planning', 'trees'));
alter table leads add column if not exists contractor text;
alter table leads add column if not exists status text;
alter table leads add column if not exists meta jsonb not null default '{}';
create index if not exists leads_kind_idx on leads (kind, published_at desc);

-- 006: suppliers directory, help board, accreditation help enquiries

create table if not exists suppliers (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  name          text not null,
  categories    text[] not null default '{}',
  description   text,
  website       text,
  phone         text,
  email         text,
  town          text,
  postcode      text,
  lat           double precision,
  lng           double precision,
  delivers_nationally boolean not null default false,
  submitted_by  text
);
create index if not exists suppliers_status_idx on suppliers (status);
create index if not exists suppliers_categories_idx on suppliers using gin (categories);
alter table suppliers enable row level security;

create table if not exists help_requests (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  status        text not null default 'open' check (status in ('open', 'closed', 'removed')),
  email         text not null,
  business_name text,
  kind          text not null,
  title         text not null,
  details       text not null,
  trades        text[] not null default '{}',
  postcode      text,
  town          text,
  lat           double precision,
  lng           double precision,
  needed_from   date,
  needed_until  date
);
create index if not exists help_requests_status_idx on help_requests (status, created_at desc);
alter table help_requests enable row level security;

create table if not exists service_enquiries (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  service       text not null,
  name          text not null,
  business_name text,
  email         text not null,
  phone         text,
  schemes       text[] not null default '{}',
  message       text,
  handled       boolean not null default false
);
alter table service_enquiries enable row level security;

-- Starter suppliers (checked against each company's own website, October 2026)
insert into suppliers (status, name, categories, description, website, phone, town, postcode, delivers_nationally) values
('approved','Melcourt Industries',array['soil-aggregates'],'Peat-free composts, topsoils, mulches, natural play surfaces and decorative grits and gravels for trade customers.','https://www.melcourt.co.uk','01666 502711','Tetbury, Gloucestershire','GL8 8RT',true),
('approved','Boughton Loam',array['soil-aggregates'],'Topsoils, subsoils, SuDS soils, green roof substrates, cricket loams and lawn dressings. UK distributor of British Sugar TOPSOIL.','https://www.boughton.co.uk','01536 510515','Burton Latimer, Northamptonshire','NN15 5TB',true),
('approved','Bourne Amenity',array['soil-aggregates','turf-seed'],'Topsoils, subsoils, sports sands, barks, grass seed, fertilisers, aggregates and decorative stone.','https://www.bourneamenity.co.uk','01797 252299','Newenden, Kent','TN18 5QG',false),
('approved','Rolawn',array['turf-seed','soil-aggregates'],'Lawn turf, topsoil, bark and mulch, compost, decorative aggregates and green roof kits.','https://www.rolawn.co.uk','01904 757372','Seaton Ross, York','YO42 4NF',true),
('approved','Tillers Turf',array['turf-seed'],'Landscape, golf and wildflower turf delivered across the UK.','https://www.tillersturf.co.uk','01522 704444','Thorney, Newark','NG23 7DR',true),
('approved','Q Lawns',array['turf-seed','soil-aggregates'],'Lawn turf, topsoil and Meadowmat wildflower matting grown in Norfolk and delivered across the UK.','https://www.qlawns.co.uk',null,'Norfolk',null,true),
('approved','Emorsgate Seeds',array['turf-seed'],'Native British wildflower seed, grasses, sedges and seed mixtures.','https://wildseed.co.uk',null,'Somerset and Norfolk',null,true),
('approved','Rigby Taylor',array['turf-seed','landscape-products'],'Grass seed, fertilisers, plant protection, irrigation and line marking for sports and amenity turf.','https://www.rigbytaylor.com','0800 138 7222','Royston, Hertfordshire',null,true),
('approved','Barcham Trees',array['trees-plants'],'Container-grown trees, from young stock to semi-mature, for landscape schemes.','https://www.barcham.co.uk','01353 720950','Ely, Cambridgeshire','CB7 5XF',true),
('approved','Majestic Trees',array['trees-plants'],'Mature and semi-mature trees, pleached trees, hedging and fruit trees.','https://www.majestictrees.co.uk','01582 843881','Flamstead, Hertfordshire',null,true),
('approved','Deepdale Trees',array['trees-plants'],'Air-Pot and field-grown semi-mature trees, shrubs and hedging for the trade.','https://www.deepdale-trees.co.uk','01767 262636','Bedfordshire',null,true),
('approved','Palmstead Nurseries',array['trees-plants'],'Wholesale trees, shrubs and perennials for the landscape trade.','https://www.palmstead.co.uk','01233 813340','Kent',null,true),
('approved','Crowders Nurseries',array['trees-plants'],'Wholesale nursery stock, forestry and hedging transplants, cell-grown plants and tree protection.','https://www.crowdersnurseries.co.uk','01507 525000','Lincolnshire',null,true),
('approved','Frank P Matthews',array['trees-plants'],'Fruit and ornamental trees, soft fruit, hedging and rootstocks. Wholesale line shown.','https://www.frankpmatthews.com','01584 810214','Tenbury Wells, Worcestershire','WR15 8TH',true),
('approved','Hopes Grove Nurseries',array['trees-plants'],'Hedging (bare root, potted, rootball and instant), garden trees, shrubs and topiary.','https://www.hopesgrovenurseries.co.uk','01580 765600','Weald of Kent',null,true),
('approved','Jacksons Fencing',array['fencing-gates'],'Timber and metal fencing, gates, acoustic and security fencing, decking and landscaping products.','https://www.jacksons-fencing.co.uk','0800 408 2234','Stowting, Kent',null,true),
('approved','Zaun',array['fencing-gates'],'Welded and woven mesh fencing, security and sports fencing, gates and bollards.','https://www.zaun.co.uk','01902 796699','Wolverhampton','WV10 9ED',true),
('approved','CLD Fencing Systems',array['fencing-gates'],'Rigid mesh security fencing, gates, sports, decorative and temporary fencing.','https://www.cld-fencing.com','0800 074 2861',null,null,true),
('approved','Grange Fencing',array['fencing-gates'],'Fencing panels, gates, garden structures and landscaping products.','https://www.grangefencing.co.uk',null,null,null,true),
('approved','Marshalls',array['paving-stone','soil-aggregates'],'Paving, kerbs, walling, drainage, aggregates and landscape products for commercial and domestic work.','https://www.marshalls.co.uk',null,'Elland, West Yorkshire','HX5 9HT',true),
('approved','Stonemarket',array['paving-stone'],'Garden and driveway paving, kerbs, edging and walling, sold through independent stockists.','https://www.stonemarket.co.uk',null,'Elland, West Yorkshire','HX5 9HT',true),
('approved','London Stone',array['paving-stone'],'Paving, steps, copings, cladding, decking and bespoke stonework, with showrooms across the UK.','https://www.londonstone.co.uk',null,null,null,true),
('approved','CED Stone Group',array['paving-stone'],'Natural stone, paving, setts, gravels and hard landscaping materials for commercial and private projects.','https://www.cedstone.co.uk','01708 867237','Essex',null,true),
('approved','GreenBlue Urban',array['landscape-products'],'Tree pits and soil cells, root barriers, underground guying and SuDS tree pit systems.','https://www.greenblue.com/gb/',null,null,null,true),
('approved','Namgrass',array['artificial-play'],'Artificial grass for residential, commercial, school and sports projects.','https://www.namgrass.co.uk','03330 151853','Oakham, Rutland','LE15 7TP',true),
('approved','Honey Brothers',array['tools-machinery'],'Arborist climbing and rigging gear, PPE, forestry and landscaping tools and machinery.','https://www.honeybros.com','01483 561362','Peasmarsh, Surrey',null,true);

-- 007: Stripe subscriptions
alter table businesses add column if not exists stripe_customer_id text;
alter table businesses add column if not exists stripe_subscription_id text;
alter table businesses add column if not exists paid_until timestamptz;
alter table businesses drop constraint if exists businesses_subscription_status_check;
alter table businesses add constraint businesses_subscription_status_check
  check (subscription_status in ('none', 'trialing', 'active', 'past_due', 'cancelled'));
create index if not exists businesses_stripe_customer_idx on businesses (stripe_customer_id);
alter table review_events drop constraint if exists review_events_action_check;
alter table review_events add constraint review_events_action_check
  check (action in ('submitted', 'approved', 'rejected', 'suspended', 'note',
                    'changed', 'resubmitted', 'rechecked', 'login_link', 'billing'));


-- Stripe sends each event at least once; this stops us acting on one twice
create table if not exists stripe_events (
  id          text primary key,
  type        text not null,
  received_at timestamptz not null default now()
);
alter table stripe_events enable row level security;

-- Search. A listing is verified when its membership is paid (or founding) AND its
-- public liability, and employers liability if it has any, are in date. Paid listings with
-- lapsed insurance and members whose membership has ended stay listed, marked unverified,
-- unless the searcher asks for verified only.
-- (The signature changes, so the old version is dropped first.)
drop function if exists search_businesses(double precision, double precision, text, text[], int);
create or replace function search_businesses(
  job_lat        double precision,
  job_lng        double precision,
  trade_slug     text default null,
  required_accreds text[] default '{}',
  min_pl_cover   int default null,
  verified_only  boolean default true
)
returns table (
  id uuid, trading_name text, business_type text, trades text[],
  accreditations text[], pl_cover_amount int, pl_expiry date,
  base_postcode text, radius_miles int, website text, description text,
  distance_miles double precision, verified boolean, unverified_reason text
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
           )) as distance_miles,
           (
             (b.founding_member or b.subscription_status in ('active', 'trialing', 'past_due'))
             and b.pl_expiry >= current_date
             and (b.el_cover_amount is null or b.el_expiry >= current_date)
           ) as verified,
           case
             when not (b.founding_member or b.subscription_status in ('active', 'trialing', 'past_due')) then 'membership'
             when b.pl_expiry is null or b.pl_expiry < current_date
               or (b.el_cover_amount is not null and (b.el_expiry is null or b.el_expiry < current_date)) then 'insurance'
           end as unverified_reason
    from businesses b
    where b.status = 'approved'
      and (b.founding_member or b.subscription_status in ('active', 'trialing', 'past_due', 'cancelled'))
      and (trade_slug is null or trade_slug = any(b.trades))
      and (min_pl_cover is null or coalesce(b.pl_cover_amount, 0) >= min_pl_cover)
  ) x
  where x.distance_miles <= x.radius_miles
    and x.accreditations @> coalesce(required_accreds, '{}')
    and (not verified_only or x.verified)
  order by x.verified desc, x.distance_miles asc
  limit 100;
$$;

-- 008: insurance and accreditation dates only count once an admin has confirmed them.
-- A trade's new or renewed dates wait here until then:
--   { "pl": {"expiry": "2027-05-01", "cover": 5000000},
--     "el": {"expiry": "2027-05-01", "cover": 10000000},
--     "acc": {"chas": "2027-03-31"} }
alter table businesses add column if not exists pending_dates jsonb not null default '{}';
-- Compliance pack: members keep insurance, accreditations, RAMS and policies in one
-- place and share them with contractors through revocable links.

-- Private file store. 20MB per file; PDF, JPG and PNG only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('compliance', 'compliance', false, 20971520, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create table if not exists compliance_docs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  doc_type text not null,
  title text not null,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  size_bytes integer not null,
  expiry date,
  reviewed_on date,
  -- provided: member's own document, shown as is
  -- pending: insurance or accreditation waiting for an admin check (not shown to contractors)
  -- checked: admin has checked it
  -- rejected: admin did not accept it
  status text not null check (status in ('provided', 'pending', 'checked', 'rejected')),
  reject_reason text,
  replaces uuid references compliance_docs(id) on delete set null,
  checked_at timestamptz,
  checked_by text,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists compliance_docs_business_idx on compliance_docs (business_id) where archived_at is null;
create index if not exists compliance_docs_pending_idx on compliance_docs (status) where status = 'pending' and archived_at is null;

create table if not exists pack_links (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  token text not null unique,
  label text not null,
  include text[] not null,
  expires_at timestamptz,
  revoked_at timestamptz,
  open_count integer not null default 0,
  last_opened_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists pack_links_business_idx on pack_links (business_id);

create table if not exists pack_events (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references pack_links(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  kind text not null check (kind in ('open', 'download', 'zip')),
  detail text,
  created_at timestamptz not null default now()
);
create index if not exists pack_events_business_idx on pack_events (business_id, created_at desc);

-- One row per reminder sent, so the daily job never sends the same one twice.
create table if not exists compliance_reminders (
  doc_id uuid not null references compliance_docs(id) on delete cascade,
  kind text not null,
  sent_at timestamptz not null default now(),
  primary key (doc_id, kind)
);

alter table compliance_docs enable row level security;
alter table pack_links enable row level security;
alter table pack_events enable row level security;
alter table compliance_reminders enable row level security;
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
