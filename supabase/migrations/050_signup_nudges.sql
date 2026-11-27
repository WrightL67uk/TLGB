-- Sign-up nudge series and "I'm stuck" flag
alter table businesses add column if not exists nudge_count int not null default 0;
alter table businesses add column if not exists stuck_at timestamptz;
alter table businesses add column if not exists stuck_note text;
alter table businesses add column if not exists stuck_handled_at timestamptz;
update businesses set nudge_count = 1 where nudged_at is not null and nudge_count = 0;
alter table businesses add column if not exists nudges_stopped_at timestamptz;
