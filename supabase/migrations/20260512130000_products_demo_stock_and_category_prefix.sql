-- Demo: stock en bodega/local para catálogo importado (referencias CA-*) y nombre con categoría al inicio.
-- Idempotente en nombre: no duplica el prefijo si ya existe.

UPDATE public.products AS p
SET
  stock_warehouse = 5 + (abs(hashtext(p.reference::text)) % 42),
  stock_store = 3 + (abs(hashtext(p.reference::text || '|store')) % 30),
  updated_at = now()
WHERE p.reference LIKE 'CA-%';

UPDATE public.products AS p
SET
  name = c.name || ' · ' || p.name,
  updated_at = now()
FROM public.categories AS c
WHERE p.category_id = c.id
  AND p.reference LIKE 'CA-%'
  AND p.name NOT LIKE c.name || ' · %';
