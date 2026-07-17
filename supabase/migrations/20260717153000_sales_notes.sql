-- Notas libres por factura de venta
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN public.sales.notes IS 'Notas u observaciones de la factura de venta';
