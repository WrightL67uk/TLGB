-- Supplier plans: Appear (listed, contact details and company profile) and Match (also matched to
-- members' price requests). Paid yearly through Stripe. Suppliers log in like everyone else, by email.

-- A supplier signs up and pays before sending details, so 'started' is a new status
do $$ declare c text; begin
  for c in select conname from pg_constraint where conrelid = 'suppliers'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%status%' loop
    execute format('alter table suppliers drop constraint %I', c);
  end loop;
end $$;
alter table suppliers add constraint suppliers_status_check check (status in ('started', 'pending', 'approved', 'rejected'));

alter table suppliers add column if not exists tier text check (tier in ('appear', 'match'));
alter table suppliers add column if not exists subscription_status text not null default 'none';
alter table suppliers add column if not exists stripe_customer_id text;
alter table suppliers add column if not exists stripe_subscription_id text;
alter table suppliers add column if not exists billing_interval text;
alter table suppliers add column if not exists paid_until timestamptz;
alter table suppliers add column if not exists signup_code text;

-- Who they are
alter table suppliers add column if not exists slug text;
alter table suppliers add column if not exists contact_name text;
alter table suppliers add column if not exists business_type text check (business_type in ('ltd', 'sole_trader'));
alter table suppliers add column if not exists company_number text;
alter table suppliers add column if not exists ch_company_name text;
alter table suppliers add column if not exists ch_status text;
alter table suppliers add column if not exists ch_incorporated_on date;
alter table suppliers add column if not exists ch_registered_address text;
alter table suppliers add column if not exists vat_registered boolean;
alter table suppliers add column if not exists vat_number text;

-- Their company profile
alter table suppliers add column if not exists about text;
alter table suppliers add column if not exists address text;
alter table suppliers add column if not exists public_email text;
alter table suppliers add column if not exists year_established integer;
alter table suppliers add column if not exists delivery_options text[] not null default '{}';
alter table suppliers add column if not exists min_order text;
alter table suppliers add column if not exists trade_accounts boolean not null default false;
alter table suppliers add column if not exists trade_only boolean not null default false;
alter table suppliers add column if not exists standards text[] not null default '{}';
alter table suppliers add column if not exists standards_other text;
alter table suppliers add column if not exists product_liability boolean;
alter table suppliers add column if not exists logo_path text;
alter table suppliers add column if not exists submitted_at timestamptz;
alter table suppliers add column if not exists admin_notes text;
alter table suppliers add column if not exists rejection_reason text;
alter table suppliers add column if not exists reviewed_at timestamptz;

create unique index if not exists suppliers_slug_key on suppliers (slug) where slug is not null;
create index if not exists suppliers_stripe_sub on suppliers (stripe_subscription_id);
create index if not exists suppliers_email_idx on suppliers (lower(email));

-- Pictures of products and premises, with a caption each
create table if not exists supplier_photos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  supplier_id uuid not null references suppliers(id) on delete cascade,
  storage_path text not null,
  caption text,
  sort_order integer not null default 0
);
create index if not exists supplier_photos_supplier on supplier_photos (supplier_id, sort_order);
alter table supplier_photos enable row level security;

-- Discount codes work for suppliers too
alter table discount_redemptions add column if not exists supplier_id uuid references suppliers(id) on delete set null;

-- Starting prices (whole pounds a year, excluding VAT). Changeable on the admin Prices page.
insert into site_settings (key, value) values ('supplier_pricing', '{"appear": 195, "match": 495}'::jsonb)
on conflict (key) do nothing;

select count(*) as suppliers from suppliers;
