-- 003: accreditation expiry dates and expiry reminders

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
