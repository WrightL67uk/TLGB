-- Short videos on a paying supplier's company profile. Files are in the public "portfolio" bucket.
create table if not exists supplier_videos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  supplier_id uuid not null references suppliers(id) on delete cascade,
  storage_path text not null,
  caption text,
  sort_order integer not null default 0
);
create index if not exists supplier_videos_supplier on supplier_videos (supplier_id, sort_order);
alter table supplier_videos enable row level security;

select count(*) as video_ready from suppliers;
