-- Garden buildings as a trade option
insert into trade_categories (slug, label, sort_order) values
  ('garden-buildings', 'Garden Buildings', 85)
on conflict (slug) do nothing;
