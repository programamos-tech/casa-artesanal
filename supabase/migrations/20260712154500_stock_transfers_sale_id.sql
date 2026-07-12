-- Vincular factura de traslado a la transferencia (para distinguir iconos / anulación)

ALTER TABLE public.stock_transfers
  ADD COLUMN IF NOT EXISTS sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_stock_transfers_sale_id
  ON public.stock_transfers (sale_id)
  WHERE sale_id IS NOT NULL;

COMMENT ON COLUMN public.stock_transfers.sale_id IS
  'Factura generada al enviar/aprobar el traslado (distinta de método de pago transferencia)';
