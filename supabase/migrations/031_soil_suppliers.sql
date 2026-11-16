-- Soil suppliers: extra questions, test certificates, and a separate admin check.
alter table suppliers add column if not exists soil jsonb;
alter table suppliers add column if not exists soil_status text not null default 'none';
alter table suppliers add column if not exists soil_checked_at timestamptz;
alter table suppliers add column if not exists soil_note text;
alter table suppliers drop constraint if exists suppliers_soil_status_check;
alter table suppliers add constraint suppliers_soil_status_check check (soil_status in ('none', 'pending', 'approved', 'rejected'));

-- Test certificates and other evidence a supplier uploads. Files are in the private "documents" bucket.
create table if not exists supplier_docs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  supplier_id uuid not null references suppliers(id) on delete cascade,
  kind text not null default 'stockpile-test',
  title text,
  tested_on date,
  file_name text,
  storage_path text not null
);
create index if not exists supplier_docs_supplier on supplier_docs (supplier_id, created_at);
alter table supplier_docs enable row level security;

select count(*) as soil_ready from suppliers;
