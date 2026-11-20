-- Suppliers can say how far they deliver from their yard or depot (miles).
-- Blank means not stated. "Delivers nationally" still overrides it.
alter table suppliers add column if not exists delivery_radius_miles int;
alter table suppliers drop constraint if exists suppliers_delivery_radius_miles_check;
alter table suppliers add constraint suppliers_delivery_radius_miles_check
  check (delivery_radius_miles is null or delivery_radius_miles between 5 and 1000);
