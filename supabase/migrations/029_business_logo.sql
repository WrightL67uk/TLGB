-- A logo for each trade listing, shown on search results and the listing page for verified members.
alter table businesses add column if not exists logo_path text;
select count(*) as businesses from businesses;
