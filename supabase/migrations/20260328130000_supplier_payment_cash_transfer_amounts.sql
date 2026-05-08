-- Desglose efectivo / transferencia en abonos mixtos a proveedores
ALTER TABLE public.supplier_payment_records
  ADD COLUMN IF NOT EXISTS cash_amount NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS transfer_amount NUMERIC(14,2);

COMMENT ON COLUMN public.supplier_payment_records.cash_amount IS 'Parte en efectivo (solo método mixto)';
COMMENT ON COLUMN public.supplier_payment_records.transfer_amount IS 'Parte en transferencia (solo método mixto)';
