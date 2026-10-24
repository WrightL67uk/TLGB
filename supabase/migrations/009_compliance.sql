-- Compliance pack: members keep insurance, accreditations, RAMS and policies in one
-- place and share them with contractors through revocable links.

-- Private file store. 20MB per file; PDF, JPG and PNG only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('compliance', 'compliance', false, 20971520, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create table if not exists compliance_docs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  doc_type text not null,
  title text not null,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  size_bytes integer not null,
  expiry date,
  reviewed_on date,
  -- provided: member's own document, shown as is
  -- pending: insurance or accreditation waiting for an admin check (not shown to contractors)
  -- checked: admin has checked it
  -- rejected: admin did not accept it
  status text not null check (status in ('provided', 'pending', 'checked', 'rejected')),
  reject_reason text,
  replaces uuid references compliance_docs(id) on delete set null,
  checked_at timestamptz,
  checked_by text,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists compliance_docs_business_idx on compliance_docs (business_id) where archived_at is null;
create index if not exists compliance_docs_pending_idx on compliance_docs (status) where status = 'pending' and archived_at is null;

create table if not exists pack_links (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  token text not null unique,
  label text not null,
  include text[] not null,
  expires_at timestamptz,
  revoked_at timestamptz,
  open_count integer not null default 0,
  last_opened_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists pack_links_business_idx on pack_links (business_id);

create table if not exists pack_events (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references pack_links(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  kind text not null check (kind in ('open', 'download', 'zip')),
  detail text,
  created_at timestamptz not null default now()
);
create index if not exists pack_events_business_idx on pack_events (business_id, created_at desc);

-- One row per reminder sent, so the daily job never sends the same one twice.
create table if not exists compliance_reminders (
  doc_id uuid not null references compliance_docs(id) on delete cascade,
  kind text not null,
  sent_at timestamptz not null default now(),
  primary key (doc_id, kind)
);

alter table compliance_docs enable row level security;
alter table pack_links enable row level security;
alter table pack_events enable row level security;
alter table compliance_reminders enable row level security;
