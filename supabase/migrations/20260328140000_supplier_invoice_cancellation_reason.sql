-- Motivo de anulación (Facturador)
ALTER TABLE public.supplier_invoices
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

COMMENT ON COLUMN public.supplier_invoices.cancellation_reason IS 'Motivo indicado al anular la factura';
