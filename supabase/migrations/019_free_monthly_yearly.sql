-- Free listing, or verified membership paid monthly or yearly with a free trial (prices on the admin Prices page).
alter table businesses add column if not exists free_listing boolean not null default false;
alter table businesses add column if not exists billing_interval text check (billing_interval in ('month','year'));

-- Search shows free listings too, marked unverified. "Verified members only" (ticked by default) still hides them.
drop function if exists search_businesses(double precision, double precision, text, text[], int, boolean);
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
             when not (b.founding_member or b.subscription_status in ('active', 'trialing', 'past_due'))
               then case when b.free_listing then 'free' else 'membership' end
             when b.pl_expiry is null or b.pl_expiry < current_date
               or (b.el_cover_amount is not null and (b.el_expiry is null or b.el_expiry < current_date)) then 'insurance'
           end as unverified_reason
    from businesses b
    where b.status = 'approved'
      and (b.founding_member or b.free_listing or b.subscription_status in ('active', 'trialing', 'past_due', 'cancelled'))
      and (trade_slug is null or trade_slug = any(b.trades))
      and (min_pl_cover is null or coalesce(b.pl_cover_amount, 0) >= min_pl_cover)
  ) x
  where x.distance_miles <= x.radius_miles
    and x.accreditations @> coalesce(required_accreds, '{}')
    and (not verified_only or x.verified)
  order by x.verified desc, x.distance_miles asc
  limit 100;
$$;

-- Default prices for the new option (not switched on until chosen on the Prices page).
update site_settings
set value = value || '{"membership": {"monthly": 30, "yearly": 300, "trial_days": 30}}'::jsonb
where key = 'pricing' and not (value ? 'membership');
