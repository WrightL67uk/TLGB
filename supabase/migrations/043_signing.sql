-- Document signing: members upload their own PDF, name the signers, and each signer signs from an emailed link.
-- TLGB only runs the signing. It does not write, review or take part in the contract.
insert into storage.buckets (id, name, public, file_size_limit)
values ('signing', 'signing', false, 20971520)
on conflict (id) do nothing;

create table if not exists signing_envelopes (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  owner_email     text not null,
  title           text not null,
  message         text,
  status          text not null default 'sent' check (status in ('sent', 'completed', 'declined', 'cancelled', 'expired')),
  original_path   text not null,
  original_name   text not null,
  original_sha256 text not null,
  final_path      text,
  final_sha256    text,
  expires_at      timestamptz not null,
  completed_at    timestamp with time zone
);
create index if not exists signing_envelopes_owner_idx on signing_envelopes (owner_email, created_at desc);

create table if not exists signing_signers (
  id             uuid primary key default gen_random_uuid(),
  envelope_id    uuid not null references signing_envelopes(id) on delete cascade,
  position       int not null,
  name           text not null,
  email          text not null,
  token_hash     text not null unique,
  status         text not null default 'waiting' check (status in ('waiting', 'viewed', 'signed', 'declined')),
  viewed_at      timestamptz,
  signed_at      timestamptz,
  ip             text,
  user_agent     text,
  signature_png  text,
  signed_name    text,
  decline_reason text,
  last_reminded_at timestamptz
);
create index if not exists signing_signers_env_idx on signing_signers (envelope_id, position);

create table if not exists signing_events (
  id          uuid primary key default gen_random_uuid(),
  envelope_id uuid not null references signing_envelopes(id) on delete cascade,
  signer_id   uuid,
  created_at  timestamptz not null default now(),
  action      text not null,
  detail      text,
  ip          text
);
create index if not exists signing_events_env_idx on signing_events (envelope_id, created_at);

alter table signing_envelopes enable row level security;
alter table signing_signers enable row level security;
alter table signing_events enable row level security;
