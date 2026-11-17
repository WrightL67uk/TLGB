-- Job seeker profiles are approved by admin before they go on the board.
alter table job_seekers add column if not exists approved_at timestamptz;
alter table job_seekers drop constraint if exists job_seekers_status_check;
alter table job_seekers add constraint job_seekers_status_check check (status in ('draft', 'pending', 'live', 'paused', 'removed'));
-- Profiles already published stay approved
update job_seekers set approved_at = coalesce(published_at, now()) where approved_at is null and published_at is not null and status in ('live', 'paused');
select status, count(*) filter (where approved_at is not null) as approved, count(*) as total from job_seekers group by status;
