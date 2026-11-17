-- Office support trades our members can need: virtual assistants and business development.
insert into trade_categories (slug, label, sort_order) values
  ('virtual-assistant',    'Virtual Assistant / Admin Support', 160),
  ('business-development', 'Business Development / Tendering',  170)
on conflict (slug) do update set label = excluded.label, sort_order = excluded.sort_order;
select slug, label from trade_categories order by sort_order;
