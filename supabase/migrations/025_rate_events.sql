-- Simple rate limiting for public forms (sign-ups, listings, posts). Rows older than a day are cleared daily.
create table if not exists rate_events (
  id bigint generated always as identity primary key,
  bucket text not null,
  who text not null,
  created_at timestamptz not null default now()
);
create index if not exists rate_events_lookup on rate_events (bucket, who, created_at);
alter table rate_events enable row level security;

-- Abandoned sign-up reminder: sent once
alter table businesses add column if not exists nudged_at timestamptz;

select count(*) as rate_events from rate_events;
