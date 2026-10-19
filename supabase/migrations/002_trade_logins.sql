-- Trade logins and change checks (added 18 Oct 2026).
-- Only needed if you ran schema.sql before this date.

alter table businesses add column if not exists recheck_required boolean not null default false;
alter table businesses add column if not exists recheck_reason text;

alter table review_events drop constraint if exists review_events_action_check;
alter table review_events add constraint review_events_action_check
  check (action in ('submitted', 'approved', 'rejected', 'suspended', 'note',
                    'changed', 'resubmitted', 'rechecked', 'login_link'));

create table if not exists login_tokens (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  email       text not null,
  token_hash  text not null unique,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_by  text not null default 'self'
);
create index if not exists login_tokens_email_idx on login_tokens (email, created_at);

create table if not exists sessions (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  email       text not null,
  token_hash  text not null unique,
  expires_at  timestamptz not null
);

create index if not exists businesses_email_idx on businesses (email);

alter table login_tokens enable row level security;
alter table sessions     enable row level security;
