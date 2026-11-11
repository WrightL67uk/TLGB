-- Where each waiting list sign-up came from (homepage, waitlist page, QR code), and whether they are a trade or a supplier.
alter table waitlist add column if not exists source text;
alter table waitlist add column if not exists member_type text check (member_type in ('trade', 'supplier'));
-- Copy the trade/supplier choices saved before this column existed
update waitlist w set member_type = s.value->>'type'
  from site_settings s where s.key = 'waitlist_type:' || lower(w.email) and w.member_type is null;
