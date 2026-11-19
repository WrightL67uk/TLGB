-- Trades can say they cover the whole UK. It is stored as a coverage radius of 2000 miles,
-- so search, job matching and alerts include them with no other change.
alter table businesses drop constraint if exists businesses_radius_miles_check;
alter table businesses add constraint businesses_radius_miles_check
  check ((radius_miles between 5 and 300) or radius_miles = 2000);
