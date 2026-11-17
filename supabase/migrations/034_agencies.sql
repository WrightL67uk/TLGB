-- Recruitment agencies: their own sign-up and login (Recruitment area only), checked by admin,
-- paying for adverts with credits. Credits come from a monthly plan or from job seekers who
-- sign up through the agency's own link. Every agency advert is approved by admin before it shows.

create table if not exists agencies (
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
  email text not null,
  contact_name text not null,
  job_title text,
  roles text[] not null default '{}',
  placement_types text[] not null default '{}',
  covers text,
  el_expiry date,
  pl_expiry date,
  memberships text[] not null default '{}',
  glaa_licence text,
  rtw_confirmed boolean not null default false,
  terms_accepted_at timestamptz,
  referral_code text not null,
  referrals_per_credit integer,
  referral_monthly_cap integer,
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text not null default 'none',
  paid_until timestamptz,
  admin_notes text,
  rejection_reason text,
  approved_at timestamptz
);
create unique index if not exists agencies_email_key on agencies (lower(email));
create unique index if not exists agencies_code_key on agencies (referral_code);
create unique index if not exists agencies_company_live on agencies (company_number) where status in ('pending', 'approved', 'suspended');
create index if not exists agencies_sub on agencies (stripe_subscription_id);

-- Every credit in or out. The balance is the sum. A repeated (agency, reason, ref) is ignored, so a
-- Stripe invoice or a referral batch can never be credited twice.
create table if not exists agency_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  agency_id uuid not null references agencies(id) on delete cascade,
  delta integer not null,
  reason text not null,
  ref text,
  note text,
  unique (agency_id, reason, ref)
);
create index if not exists agency_ledger_agency on agency_credit_ledger (agency_id, created_at);

-- Job seekers who came through an agency's link and published their profile
create table if not exists agency_referrals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  agency_id uuid not null references agencies(id) on delete cascade,
  seeker_id uuid not null references job_seekers(id) on delete cascade,
  unique (seeker_id)
);
create index if not exists agency_referrals_agency on agency_referrals (agency_id);

alter table job_seekers add column if not exists referred_by_agency uuid references agencies(id) on delete set null;

-- Agencies post vacancies too, so a vacancy belongs to a business or to an agency
alter table vacancies alter column business_id drop not null;
alter table vacancies add column if not exists agency_id uuid references agencies(id) on delete cascade;
alter table vacancies add column if not exists client_name text;
alter table vacancies add column if not exists rejection_reason text;
alter table vacancies add column if not exists approved_at timestamptz;
do $$ declare c text; begin
  for c in select conname from pg_constraint where conrelid = 'vacancies'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%status%' loop
    execute format('alter table vacancies drop constraint %I', c);
  end loop;
end $$;
alter table vacancies add constraint vacancies_status_check check (status in ('pending', 'live', 'closed', 'removed', 'rejected'));
alter table vacancies drop constraint if exists vacancies_owner_check;
alter table vacancies add constraint vacancies_owner_check check (business_id is not null or agency_id is not null);
create index if not exists vacancies_agency on vacancies (agency_id);

alter table agencies enable row level security;
alter table agency_credit_ledger enable row level security;
alter table agency_referrals enable row level security;

insert into site_settings (key, value) values ('agency_plan', '{"price": 25, "credits": 10, "per_referral_credit": 3, "referral_cap": 10}'::jsonb)
on conflict (key) do nothing;

select count(*) as agencies from agencies;
