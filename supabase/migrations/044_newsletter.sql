-- Newsletter sign-ups. Each person ticks a consent box (unticked by default), then confirms by email (double opt-in).
create table if not exists newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  consent_text text not null,
  consented_at timestamptz not null default now(),
  ip_hash text,
  source text,
  confirm_token_hash text,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz
);
create unique index if not exists newsletter_email_key on newsletter_subscribers (lower(email));
alter table newsletter_subscribers enable row level security;

select count(*) as newsletter_rows from newsletter_subscribers;
