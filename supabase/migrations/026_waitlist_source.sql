-- Where each waiting list sign-up came from (homepage, waitlist page, QR code)
alter table waitlist add column if not exists source text;
