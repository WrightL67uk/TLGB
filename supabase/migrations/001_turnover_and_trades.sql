-- Only needed if you ran the original schema.sql before 18 Oct 2026.
alter table businesses add column if not exists turnover_band text
  check (turnover_band in ('under-100k', '100k-500k', '500k-2m', '2m-10m', 'over-10m'));

insert into trade_categories (slug, label, sort_order) values
  ('landscape-architect', 'Landscape Architect',           20),
  ('gritting',            'Gritting / Winter Maintenance',110),
  ('nursery',             'Nursery / Plant Supplier',     120),
  ('supplier',            'Materials Supplier',           130),
  ('training',            'Training Provider',            150)
on conflict (slug) do nothing;

update trade_categories set label = 'Garden / Landscape Designer' where slug = 'landscape-designer';
update trade_categories set label = 'Machine / Plant Hire'        where slug = 'plant-hire';
