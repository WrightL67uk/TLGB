-- 005: more lead types (contractor wins, upcoming tenders, planning applications, tree works)
alter table leads drop constraint if exists leads_source_check;
alter table leads add constraint leads_source_check check (source in ('fts', 'cf', 'pcs', 's2w', 'planit'));
alter table leads add column if not exists kind text not null default 'tender';
alter table leads drop constraint if exists leads_kind_check;
alter table leads add constraint leads_kind_check check (kind in ('tender', 'pipeline', 'award', 'planning', 'trees'));
alter table leads add column if not exists contractor text;
alter table leads add column if not exists status text;
alter table leads add column if not exists meta jsonb not null default '{}';
create index if not exists leads_kind_idx on leads (kind, published_at desc);
