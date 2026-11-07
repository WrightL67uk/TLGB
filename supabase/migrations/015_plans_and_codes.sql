-- 015: Verified and Pro plans, and marketing codes: free Pro for a set time, money off, or a percentage off

-- Which plan a member pays for. Pro can also come free for a while from a code (pro_until).
alter table businesses add column if not exists plan text not null default 'verified';
alter table businesses drop constraint if exists businesses_plan_check;
alter table businesses add constraint businesses_plan_check check (plan in ('verified', 'pro'));
alter table businesses add column if not exists pro_until timestamptz;
alter table businesses add column if not exists promo_code text;
-- 0 = no reminder sent yet, 60 / 30 = the reminder sent that many days before free Pro ends
alter table businesses add column if not exists pro_reminder smallint not null default 0;

-- Codes handed out with marketing (tape measures, seed packets, brokers...). One code per channel
-- shows which marketing brings paying members. Each code is one kind of offer:
--   pro_free     pay for Verified, get Pro free for pro_months
--   amount_off   pounds off the membership price
--   percent_off  a percentage off the membership price
-- Money off applies to the first year only ('once') or every year ('forever').
create table if not exists promo_codes (
  code             text primary key check (code ~ '^[A-Z0-9]{3,20}$'),
  label            text not null,
  kind             text not null default 'pro_free' check (kind in ('pro_free', 'amount_off', 'percent_off')),
  pro_months       int  not null default 12 check (pro_months between 1 and 24),
  amount_off       int  check (amount_off is null or amount_off between 1 and 10000),
  percent_off      int  check (percent_off is null or percent_off between 1 and 100),
  duration         text not null default 'once' check (duration in ('once', 'forever')),
  stripe_coupon_id text,
  max_redemptions  int  check (max_redemptions is null or max_redemptions > 0),
  redeem_by        date,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  check (kind <> 'amount_off' or amount_off is not null),
  check (kind <> 'percent_off' or percent_off is not null)
);
alter table promo_codes enable row level security;

-- One free Pro upgrade per listing, ever
create table if not exists promo_redemptions (
  business_id uuid primary key references businesses(id) on delete cascade,
  code        text not null references promo_codes(code),
  redeemed_at timestamptz not null default now(),
  pro_until   timestamptz            -- only for free Pro codes
);
create index if not exists promo_redemptions_code_idx on promo_redemptions (code);
alter table promo_redemptions enable row level security;

-- Search: Pro members (paid or free from a code) come first among verified members in their area
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
  select x.id, x.trading_name, x.business_type, x.trades, x.accreditations, x.pl_cover_amount, x.pl_expiry,
         x.base_postcode, x.radius_miles, x.website, x.description, x.distance_miles, x.verified, x.unverified_reason
  from (
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
           end as unverified_reason,
           (b.founding_member or b.plan = 'pro' or b.pro_until > now()) as pro
    from businesses b
    where b.status = 'approved'
      and (b.founding_member or b.subscription_status in ('active', 'trialing', 'past_due', 'cancelled'))
      and (trade_slug is null or trade_slug = any(b.trades))
      and (min_pl_cover is null or coalesce(b.pl_cover_amount, 0) >= min_pl_cover)
  ) x
  where x.distance_miles <= x.radius_miles
    and x.accreditations @> coalesce(required_accreds, '{}')
    and (not verified_only or x.verified)
  order by x.verified desc, (x.verified and x.pro) desc, x.distance_miles asc
  limit 100;
$$;
