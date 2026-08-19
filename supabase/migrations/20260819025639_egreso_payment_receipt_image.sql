-- Comprobante visual opcional de la transferencia (p. ej. abono a proveedor con cobro de venta)
ALTER TABLE public.egresos
  ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN public.egresos.image_url IS
  'Ruta o URL pública del comprobante de pago (transferencia Nequi/Bancolombia, etc.)';
