-- Free Companies House risk check on limited companies, admin only
alter table businesses add column if not exists risk_level text check (risk_level in ('green','amber','red'));
alter table businesses add column if not exists risk_check jsonb;
alter table businesses add column if not exists risk_checked_at timestamptz;
