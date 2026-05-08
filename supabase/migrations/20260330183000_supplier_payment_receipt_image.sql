-- Comprobante visual opcional por abono a factura de proveedor
ALTER TABLE public.supplier_payment_records
  ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN public.supplier_payment_records.image_url IS 'Ruta en bucket supplier-invoices (payments/…) o URL pública del comprobante del abono';
