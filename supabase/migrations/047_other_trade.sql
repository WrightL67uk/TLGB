-- "Other" trade or supply category: free text from the business, shown publicly only once an admin approves it
alter table businesses add column if not exists other_trade text;
alter table businesses add column if not exists other_trade_ok boolean not null default false;
alter table suppliers add column if not exists other_category text;
alter table suppliers add column if not exists other_category_ok boolean not null default false;
