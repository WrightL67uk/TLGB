-- Videos are checked by an admin before they show on a company profile.
alter table supplier_videos add column if not exists status text not null default 'pending';
alter table supplier_videos drop constraint if exists supplier_videos_status_check;
alter table supplier_videos add constraint supplier_videos_status_check check (status in ('pending', 'approved'));
select count(*) as video_status_ready from supplier_videos;
