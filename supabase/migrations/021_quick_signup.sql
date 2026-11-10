-- Quick sign-up: name, turnover, email and password first, then plan and payment, then the
-- rest of the details (saved as they type), then "Send for approval".
-- New status 'started' = signed up online, details not yet sent. Hidden from search like drafts,
-- but the owner can log in to it.
do $$
declare c text;
begin
  select conname into c from pg_constraint
  where conrelid = 'businesses'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%pending_review%';
  if c is not null then execute format('alter table businesses drop constraint %I', c); end if;
end $$;
alter table businesses add constraint businesses_status_check
  check (status in ('draft', 'started', 'pending_review', 'approved', 'rejected', 'suspended'));

-- Details not known yet at the first step
alter table businesses alter column contact_name drop not null;
alter table businesses alter column phone drop not null;
alter table businesses alter column base_postcode drop not null;
alter table businesses alter column lat drop not null;
alter table businesses alter column lng drop not null;

-- Answers saved as they type, before sending for approval
alter table businesses add column if not exists draft_data jsonb;

-- Sole traders give their full name at the details step
alter table businesses drop constraint if exists sole_trader_needs_owner;
alter table businesses add constraint sole_trader_needs_owner
  check (business_type <> 'sole_trader' or owner_full_name is not null or status = 'started');
