-- 015: price requests. Members send one list of plants or materials to several
-- suppliers, suppliers price it on the site, members compare and accept, then rate.

-- Suppliers choose to receive price requests. Listing stays free; receiving requests
-- is the paid supplier registration (free for founding suppliers).
alter table suppliers add column if not exists quote_requests boolean not null default false;
alter table suppliers add column if not exists quote_plan text check (quote_plan in ('founding', 'paid'));
alter table suppliers add column if not exists quote_paid_until date;
alter table suppliers add column if not exists wants_requests boolean not null default false;
alter table suppliers add column if not exists marketing_ok boolean not null default true;

create table if not exists quote_requests (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  business_id     uuid not null references businesses(id) on delete cascade,
  email           text not null,
  reference       text not null,
  postcode        text not null,
  area            text,
  lat             double precision,
  lng             double precision,
  needed_by       date,
  delivery_notes  text,
  closes_at       timestamptz not null,
  status          text not null default 'open' check (status in ('open', 'closed', 'accepted', 'cancelled')),
  accepted_invite uuid,
  closed_emailed  boolean not null default false
);
create index if not exists quote_requests_business_idx on quote_requests (business_id, created_at desc);
create index if not exists quote_requests_open_idx on quote_requests (status, closes_at);
alter table quote_requests enable row level security;

create table if not exists quote_lines (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references quote_requests(id) on delete cascade,
  position    int not null,
  category    text not null,
  item        text not null,
  spec        text,
  root        text,
  qty         numeric not null check (qty > 0),
  unit        text not null,
  notes       text,
  listed      boolean not null default false
);
create index if not exists quote_lines_request_idx on quote_lines (request_id, position);
alter table quote_lines enable row level security;

create table if not exists quote_invites (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  request_id      uuid not null references quote_requests(id) on delete cascade,
  supplier_id     uuid not null references suppliers(id) on delete cascade,
  token_hash      text not null unique,
  status          text not null default 'invited' check (status in ('invited', 'quoted', 'declined', 'won', 'lost')),
  viewed_at       timestamptz,
  quoted_at       timestamptz,
  goods_total     numeric,
  delivery_charge numeric,
  lead_days       int,
  valid_until     date,
  notes           text,
  decline_reason  text,
  reminded_at     timestamptz,
  unique (request_id, supplier_id)
);
create index if not exists quote_invites_request_idx on quote_invites (request_id);
alter table quote_invites enable row level security;

create table if not exists quote_prices (
  invite_id   uuid not null references quote_invites(id) on delete cascade,
  line_id     uuid not null references quote_lines(id) on delete cascade,
  available   text not null default 'yes' check (available in ('yes', 'no', 'sub')),
  unit_price  numeric check (unit_price >= 0),
  substitute  text,
  note        text,
  primary key (invite_id, line_id)
);
alter table quote_prices enable row level security;

create table if not exists supplier_ratings (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  supplier_id uuid not null references suppliers(id) on delete cascade,
  request_id  uuid not null unique references quote_requests(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  stars       int not null check (stars between 1 and 5),
  comment     text,
  hidden      boolean not null default false
);
create index if not exists supplier_ratings_supplier_idx on supplier_ratings (supplier_id) where not hidden;
alter table supplier_ratings enable row level security;
