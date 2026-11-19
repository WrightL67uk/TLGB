-- Member tenders: any member with an approved listing can post tenders, approved by admin first.
-- Each member gets a hidden "member company" so tenders reuse the existing job system.
alter table contractor_companies add column if not exists business_id uuid references businesses(id) on delete cascade;
create unique index if not exists contractor_companies_business_idx on contractor_companies (business_id) where business_id is not null;

-- Tenders waiting for admin approval, and why one was turned down
alter table contractor_jobs drop constraint if exists contractor_jobs_status_check;
alter table contractor_jobs add constraint contractor_jobs_status_check check (status in ('draft', 'pending', 'open', 'closed', 'removed'));
alter table contractor_jobs add column if not exists rejection_reason text;

-- Commercial, domestic or both
alter table contractor_jobs add column if not exists sector text not null default 'commercial';
alter table contractor_jobs drop constraint if exists contractor_jobs_sector_check;
alter table contractor_jobs add constraint contractor_jobs_sector_check check (sector in ('commercial', 'domestic', 'both'));
select count(*) as jobs from contractor_jobs;
