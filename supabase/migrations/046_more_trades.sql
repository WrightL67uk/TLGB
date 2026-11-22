-- More trade options so every kind of business finds its niche at sign-up
insert into trade_categories (slug, label, sort_order) values
  ('gardener', 'Gardener / Garden Maintenance', 65),
  ('turfing', 'Turfing and Seeding', 72),
  ('artificial-grass', 'Artificial Grass Installer', 74),
  ('surfacing', 'Tarmac, Resin and Driveway Surfacing', 76),
  ('walling', 'Walling, Brickwork and Stonemasonry', 78),
  ('decking-timber', 'Decking, Pergolas and Timber Structures', 86),
  ('drainage', 'Drainage and SuDS', 55),
  ('green-roofs', 'Green Roofs and Living Walls', 92),
  ('water-features', 'Water Features and Ponds', 94),
  ('lighting', 'External and Garden Lighting', 96),
  ('ecology', 'Ecology and Biodiversity', 22),
  ('arb-consultant', 'Arboricultural Consultant / Tree Survey', 24),
  ('surveying', 'Land and Topographical Surveying', 26),
  ('invasive-species', 'Invasive Weed Control', 45),
  ('rail-highways', 'Rail and Highways Vegetation Management', 112),
  ('waste-muckaway', 'Waste, Skips and Muckaway', 145)
on conflict (slug) do nothing;
