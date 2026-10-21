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
