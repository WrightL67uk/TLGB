-- Domestic work: trades and suppliers say whether they work for homeowners.
-- Existing listings start at "no" until they tick it.
alter table businesses add column if not exists does_domestic boolean not null default false;
alter table suppliers add column if not exists does_domestic boolean not null default false;
select (select count(*) from businesses) as businesses, (select count(*) from suppliers) as suppliers;
