-- 004: leads (public sector tenders pulled from the free government feeds)
create table if not exists leads (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  source        text not null check (source in ('fts', 'cf', 'pcs', 's2w')),
  source_id     text not null,
  title         text not null,
  description   text,
  buyer         text,
  postcode      text,
  region        text,
  lat           double precision,
  lng           double precision,
  value_amount  numeric,
  currency      text,
  published_at  timestamptz,
  deadline      timestamptz,
  url           text,
  cpv           text[] not null default '{}',
  trades        text[] not null default '{}',
  unique (source, source_id)
);
create index if not exists leads_published_idx on leads (published_at desc);
create index if not exists leads_deadline_idx on leads (deadline);
create index if not exists leads_trades_idx on leads using gin (trades);
alter table leads enable row level security;
