-- Domestic work: trades and suppliers say whether they work for homeowners.
-- Homeowners get a free account and only ever see those who said yes. Existing listings start at "no" until they tick it.
alter table businesses add column if not exists does_domestic boolean not null default false;
alter table suppliers add column if not exists does_domestic boolean not null default false;

-- Free accounts for the general public (homeowners). Log in by emailed link, like job seekers.
create table if not exists home_users (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text not null,
  first_name text not null,
  last_name text not null,
  postcode text,
  status text not null default 'active' check (status in ('active', 'removed'))
);
create unique index if not exists home_users_email_key on home_users (lower(email));
alter table home_users enable row level security;

select count(*) as home_users from home_users;
