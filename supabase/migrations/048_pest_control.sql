insert into trade_categories (slug, label, sort_order) values ('pest-control', 'Pest Controller', 147) on conflict (slug) do nothing;
