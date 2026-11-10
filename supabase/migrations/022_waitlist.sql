-- Coming soon page: waiting list sign-ups, and a switch for the homepage.
create table if not exists waitlist (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  business_name text not null,
  email text not null,
  phone text not null,
  ip_hash text,
  code_sent_at timestamptz,
  joined_business_id uuid references businesses(id) on delete set null
);
create unique index if not exists waitlist_email_key on waitlist (lower(email));
alter table waitlist enable row level security;

-- Homepage shows the coming soon page until switched off in admin
insert into site_settings (key, value) values ('launch', '{"coming_soon": true}'::jsonb)
on conflict (key) do nothing;

select count(*) as waitlist_rows from waitlist;
