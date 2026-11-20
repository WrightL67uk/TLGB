-- Plants are now individual supplier options (trees, shrubs, hedging, perennials and so on)
-- instead of one 'trees-plants' group. Anyone listed under the old group keeps trees, shrubs and hedging.
update suppliers
set categories = array(
  select distinct x from unnest(array_remove(categories, 'trees-plants') || array['trees', 'shrubs', 'hedging']) as x
)
where 'trees-plants' = any(categories);
