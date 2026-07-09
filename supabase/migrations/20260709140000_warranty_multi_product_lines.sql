-- Líneas múltiples por garantía (recibidos / entregados) vinculadas a factura
ALTER TABLE public.warranties
  ADD COLUMN IF NOT EXISTS sale_total_snapshot numeric(12, 2) NOT NULL DEFAULT 0;

ALTER TABLE public.warranty_products
  ADD COLUMN IF NOT EXISTS role character varying(20) NOT NULL DEFAULT 'received';

ALTER TABLE public.warranty_products
  ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1;

ALTER TABLE public.warranty_products
  ADD COLUMN IF NOT EXISTS unit_price numeric(12, 2) NOT NULL DEFAULT 0;

ALTER TABLE public.warranty_products
  ADD COLUMN IF NOT EXISTS line_total numeric(12, 2) NOT NULL DEFAULT 0;

ALTER TABLE public.warranty_products
  ADD COLUMN IF NOT EXISTS product_name character varying(255);

ALTER TABLE public.warranty_products
  ADD COLUMN IF NOT EXISTS sale_item_id uuid REFERENCES public.sale_items(id) ON DELETE SET NULL;

ALTER TABLE public.warranty_products
  DROP CONSTRAINT IF EXISTS warranty_products_role_check;

ALTER TABLE public.warranty_products
  ADD CONSTRAINT warranty_products_role_check
  CHECK (role::text = ANY (ARRAY['received'::character varying, 'delivered'::character varying]::text[]));

COMMENT ON COLUMN public.warranties.sale_total_snapshot IS 'Total de la factura al momento de registrar la garantía.';
COMMENT ON COLUMN public.warranty_products.role IS 'received = devuelto por cliente; delivered = entregado en reemplazo.';
