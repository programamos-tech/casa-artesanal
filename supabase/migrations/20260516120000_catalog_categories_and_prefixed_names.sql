-- Catálogo CA-*: asegurar categorías (mismos UUID que import CSV), category_id por referencia,
-- y nombre visible "Categoría · nombre" (idempotente si ya viene con prefijo).
-- Ejecutar en producción si solo corriste INSERT de productos sin el bloque de categories.

-- 1) Categorías tienda principal (idempotente)
INSERT INTO public.categories (id, name, description, status, store_id)
VALUES
  ('6fc4c1d5-e806-5e12-a72f-359b4eea3a86'::uuid, 'Abanicos', 'Catálogo importado CSV Casa Artesanal', 'active', '00000000-0000-0000-0000-000000000001'::uuid),
  ('37006648-c43c-52f4-8d10-354b9dba8a8e'::uuid, 'Acceso', 'Catálogo importado CSV Casa Artesanal', 'active', '00000000-0000-0000-0000-000000000001'::uuid),
  ('f099bcef-fcdb-5ffd-b284-5f85eafbd4f4'::uuid, 'Alpargata 150', 'Catálogo importado CSV Casa Artesanal', 'active', '00000000-0000-0000-0000-000000000001'::uuid),
  ('ec9f2130-b8f8-59b2-91c7-73cec15facd2'::uuid, 'Alpargatas', 'Catálogo importado CSV Casa Artesanal', 'active', '00000000-0000-0000-0000-000000000001'::uuid),
  ('eb88efa0-64f8-5058-a5ce-e2c287f06728'::uuid, 'Arete', 'Catálogo importado CSV Casa Artesanal', 'active', '00000000-0000-0000-0000-000000000001'::uuid),
  ('72d78042-1302-5ca3-8796-cc1be754c2df'::uuid, 'Billetera', 'Catálogo importado CSV Casa Artesanal', 'active', '00000000-0000-0000-0000-000000000001'::uuid),
  ('0825f5cf-2a05-52eb-a452-be9a6e6de024'::uuid, 'Bolsos', 'Catálogo importado CSV Casa Artesanal', 'active', '00000000-0000-0000-0000-000000000001'::uuid),
  ('7da43242-f4e1-50b5-9afc-8987a860bba1'::uuid, 'Chivas', 'Catálogo importado CSV Casa Artesanal', 'active', '00000000-0000-0000-0000-000000000001'::uuid),
  ('19f25684-cd8c-58e7-a9d9-a9555631d0c4'::uuid, 'Correas', 'Catálogo importado CSV Casa Artesanal', 'active', '00000000-0000-0000-0000-000000000001'::uuid),
  ('63d53ce3-de0d-5864-8d9d-f2df96bee8bd'::uuid, 'Cuadros', 'Catálogo importado CSV Casa Artesanal', 'active', '00000000-0000-0000-0000-000000000001'::uuid),
  ('89bdc7c1-e3f5-578a-929e-c438b916d449'::uuid, 'Cuchara', 'Catálogo importado CSV Casa Artesanal', 'active', '00000000-0000-0000-0000-000000000001'::uuid),
  ('5652977b-48fc-5e15-939d-cc0ebcc43a71'::uuid, 'Gazas', 'Catálogo importado CSV Casa Artesanal', 'active', '00000000-0000-0000-0000-000000000001'::uuid),
  ('b3ec41e2-f7f2-5e0a-a931-35819124439c'::uuid, 'Hamaca', 'Catálogo importado CSV Casa Artesanal', 'active', '00000000-0000-0000-0000-000000000001'::uuid),
  ('9e99ee17-3dd1-5cad-bdd1-3d8371cf416c'::uuid, 'Imanes', 'Catálogo importado CSV Casa Artesanal', 'active', '00000000-0000-0000-0000-000000000001'::uuid),
  ('db7acdd4-eb87-549f-afa2-97daa3eb7633'::uuid, 'Llavero', 'Catálogo importado CSV Casa Artesanal', 'active', '00000000-0000-0000-0000-000000000001'::uuid),
  ('260d5bbc-f78d-57ac-b272-02b9e971e394'::uuid, 'Manilla', 'Catálogo importado CSV Casa Artesanal', 'active', '00000000-0000-0000-0000-000000000001'::uuid),
  ('9c6eae83-3f45-5c53-94d5-8db94f03e803'::uuid, 'Mochila', 'Catálogo importado CSV Casa Artesanal', 'active', '00000000-0000-0000-0000-000000000001'::uuid),
  ('5b01e9d4-3837-5a8f-8b76-43ceb2b41d66'::uuid, 'Monedero', 'Catálogo importado CSV Casa Artesanal', 'active', '00000000-0000-0000-0000-000000000001'::uuid),
  ('90ab7f4d-b0e3-593c-b182-d3de1f23680a'::uuid, 'Mulera', 'Catálogo importado CSV Casa Artesanal', 'active', '00000000-0000-0000-0000-000000000001'::uuid),
  ('bd21d6d4-8493-59ce-89ba-0f4645dd4181'::uuid, 'Ponchos', 'Catálogo importado CSV Casa Artesanal', 'active', '00000000-0000-0000-0000-000000000001'::uuid),
  ('3eb0c4a3-b770-5993-899a-bfecd47bf13a'::uuid, 'Tinteros', 'Catálogo importado CSV Casa Artesanal', 'active', '00000000-0000-0000-0000-000000000001'::uuid)
ON CONFLICT (id) DO NOTHING;

-- 2) Asignar categoría desde prefijo de referencia CA-{CODIGO}-{###}
UPDATE public.products AS p
SET
  category_id = CASE upper(split_part(p.reference::text, '-', 2))
    WHEN 'ABAN' THEN '6fc4c1d5-e806-5e12-a72f-359b4eea3a86'::uuid
    WHEN 'ACCE' THEN '37006648-c43c-52f4-8d10-354b9dba8a8e'::uuid
    WHEN 'A150' THEN 'f099bcef-fcdb-5ffd-b284-5f85eafbd4f4'::uuid
    WHEN 'ALPA' THEN 'ec9f2130-b8f8-59b2-91c7-73cec15facd2'::uuid
    WHEN 'ARET' THEN 'eb88efa0-64f8-5058-a5ce-e2c287f06728'::uuid
    WHEN 'BILL' THEN '72d78042-1302-5ca3-8796-cc1be754c2df'::uuid
    WHEN 'BOLS' THEN '0825f5cf-2a05-52eb-a452-be9a6e6de024'::uuid
    WHEN 'CHIV' THEN '7da43242-f4e1-50b5-9afc-8987a860bba1'::uuid
    WHEN 'CORR' THEN '19f25684-cd8c-58e7-a9d9-a9555631d0c4'::uuid
    WHEN 'CUAD' THEN '63d53ce3-de0d-5864-8d9d-f2df96bee8bd'::uuid
    WHEN 'CUCH' THEN '89bdc7c1-e3f5-578a-929e-c438b916d449'::uuid
    WHEN 'GAZA' THEN '5652977b-48fc-5e15-939d-cc0ebcc43a71'::uuid
    WHEN 'HAMA' THEN 'b3ec41e2-f7f2-5e0a-a931-35819124439c'::uuid
    WHEN 'IMAN' THEN '9e99ee17-3dd1-5cad-bdd1-3d8371cf416c'::uuid
    WHEN 'LLAV' THEN 'db7acdd4-eb87-549f-afa2-97daa3eb7633'::uuid
    WHEN 'MANI' THEN '260d5bbc-f78d-57ac-b272-02b9e971e394'::uuid
    WHEN 'MOCH' THEN '9c6eae83-3f45-5c53-94d5-8db94f03e803'::uuid
    WHEN 'MONE' THEN '5b01e9d4-3837-5a8f-8b76-43ceb2b41d66'::uuid
    WHEN 'MULE' THEN '90ab7f4d-b0e3-593c-b182-d3de1f23680a'::uuid
    WHEN 'PONC' THEN 'bd21d6d4-8493-59ce-89ba-0f4645dd4181'::uuid
    WHEN 'TINT' THEN '3eb0c4a3-b770-5993-899a-bfecd47bf13a'::uuid
    ELSE p.category_id
  END,
  updated_at = now()
WHERE p.reference::text ~ '^CA-[A-Za-z0-9]+-[0-9]+$'
  AND CASE upper(split_part(p.reference::text, '-', 2))
    WHEN 'ABAN' THEN '6fc4c1d5-e806-5e12-a72f-359b4eea3a86'::uuid
    WHEN 'ACCE' THEN '37006648-c43c-52f4-8d10-354b9dba8a8e'::uuid
    WHEN 'A150' THEN 'f099bcef-fcdb-5ffd-b284-5f85eafbd4f4'::uuid
    WHEN 'ALPA' THEN 'ec9f2130-b8f8-59b2-91c7-73cec15facd2'::uuid
    WHEN 'ARET' THEN 'eb88efa0-64f8-5058-a5ce-e2c287f06728'::uuid
    WHEN 'BILL' THEN '72d78042-1302-5ca3-8796-cc1be754c2df'::uuid
    WHEN 'BOLS' THEN '0825f5cf-2a05-52eb-a452-be9a6e6de024'::uuid
    WHEN 'CHIV' THEN '7da43242-f4e1-50b5-9afc-8987a860bba1'::uuid
    WHEN 'CORR' THEN '19f25684-cd8c-58e7-a9d9-a9555631d0c4'::uuid
    WHEN 'CUAD' THEN '63d53ce3-de0d-5864-8d9d-f2df96bee8bd'::uuid
    WHEN 'CUCH' THEN '89bdc7c1-e3f5-578a-929e-c438b916d449'::uuid
    WHEN 'GAZA' THEN '5652977b-48fc-5e15-939d-cc0ebcc43a71'::uuid
    WHEN 'HAMA' THEN 'b3ec41e2-f7f2-5e0a-a931-35819124439c'::uuid
    WHEN 'IMAN' THEN '9e99ee17-3dd1-5cad-bdd1-3d8371cf416c'::uuid
    WHEN 'LLAV' THEN 'db7acdd4-eb87-549f-afa2-97daa3eb7633'::uuid
    WHEN 'MANI' THEN '260d5bbc-f78d-57ac-b272-02b9e971e394'::uuid
    WHEN 'MOCH' THEN '9c6eae83-3f45-5c53-94d5-8db94f03e803'::uuid
    WHEN 'MONE' THEN '5b01e9d4-3837-5a8f-8b76-43ceb2b41d66'::uuid
    WHEN 'MULE' THEN '90ab7f4d-b0e3-593c-b182-d3de1f23680a'::uuid
    WHEN 'PONC' THEN 'bd21d6d4-8493-59ce-89ba-0f4645dd4181'::uuid
    WHEN 'TINT' THEN '3eb0c4a3-b770-5993-899a-bfecd47bf13a'::uuid
    ELSE NULL
  END IS NOT NULL;

-- 3) Prefijo en nombre: "Nombre categoría · resto" (no duplica si ya existe)
UPDATE public.products AS p
SET
  name = c.name || ' · ' || CASE
    WHEN p.name LIKE c.name || ' · %' THEN substring(p.name FROM (char_length(c.name || ' · ') + 1))
    ELSE p.name
  END,
  updated_at = now()
FROM public.categories AS c
WHERE p.category_id = c.id
  AND p.reference::text LIKE 'CA-%';
