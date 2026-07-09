-- Tipo de descuento a nivel de venta (monto fijo o porcentaje), igual que en líneas
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS discount_type character varying(20) NOT NULL DEFAULT 'amount';

ALTER TABLE public.sales
  DROP CONSTRAINT IF EXISTS sales_discount_type_check;

ALTER TABLE public.sales
  ADD CONSTRAINT sales_discount_type_check
  CHECK (discount_type::text = ANY (ARRAY['amount'::character varying, 'percentage'::character varying]::text[]));

COMMENT ON COLUMN public.sales.discount_type IS 'Tipo de descuento al total de la venta: amount (COP) o percentage.';
