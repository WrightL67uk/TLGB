-- Discount codes that set the monthly price (for example 25 pounds a month for life), as well as money or a percentage off.
do $$ declare c text; begin
  for c in select conname from pg_constraint where conrelid = 'discount_codes'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%percent%' loop
    execute format('alter table discount_codes drop constraint %I', c);
  end loop;
end $$;
alter table discount_codes add constraint discount_codes_kind_check check (kind in ('percent', 'amount', 'price'));
select count(*) as codes from discount_codes;
