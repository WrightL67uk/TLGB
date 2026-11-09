-- Prices set from the admin Prices page, and which pricing members are charged.
create table if not exists site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table site_settings enable row level security;

insert into site_settings (key, value) values ('pricing', '{
  "mode": "bands",
  "bands": {"under-100k": 150, "100k-500k": 250, "500k-2m": 350, "2m-10m": 500, "over-10m": 750},
  "plans": {"verified": 295, "pro": 595}
}'::jsonb) on conflict (key) do nothing;

-- Which plan a member pays for when Verified and Pro pricing is switched on.
alter table businesses add column if not exists plan text check (plan in ('verified','pro'));
