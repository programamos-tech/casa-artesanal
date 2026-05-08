-- Abonos a proveedores: tarjeta → mixto (transferencia, efectivo, mixto)
ALTER TABLE public.supplier_payment_records
  DROP CONSTRAINT IF EXISTS supplier_payment_records_payment_method_check;

UPDATE public.supplier_payment_records
SET payment_method = 'mixed'
WHERE payment_method = 'card';

ALTER TABLE public.supplier_payment_records
  ADD CONSTRAINT supplier_payment_records_payment_method_check
  CHECK (payment_method IN ('cash', 'transfer', 'mixed'));
