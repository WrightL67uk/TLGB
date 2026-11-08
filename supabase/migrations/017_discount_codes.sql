-- Discount codes made in the TLGB admin. Each one is a Stripe coupon plus a Stripe promotion code.
create table if not exists discount_codes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  code text not null unique,
  kind text not null check (kind in ('percent','amount')),
  value numeric not null check (value > 0),
  duration text not null check (duration in ('once','repeating','forever')),
  duration_months int,
  max_uses int,
  expires_on date,
  first_time_only boolean not null default false,
  note text,
  active boolean not null default true,
  stripe_coupon_id text,
  stripe_promo_id text unique
);

-- One row per paid checkout that used a code (from the Stripe webhook).
create table if not exists discount_redemptions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  code_id uuid references discount_codes(id) on delete set null,
  business_id uuid references businesses(id) on delete set null,
  stripe_session_id text unique,
  amount_off_pence int
);

-- The code a trade arrived with (from a shared link), kept for tracking and applied at payment.
alter table businesses add column if not exists signup_code text;

alter table discount_codes enable row level security;
alter table discount_redemptions enable row level security;
