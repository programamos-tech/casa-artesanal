-- Precio de transporte / domicilio en ventas (separado del subtotal de productos)
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS transport_price numeric(12, 2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.sales.transport_price IS 'Valor cobrado por domicilio/transporte; no forma parte del subtotal de productos.';
