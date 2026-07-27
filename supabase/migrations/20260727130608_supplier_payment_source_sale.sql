-- Vincular abonos a proveedor con cobro de una venta + egreso de cuenta generado

ALTER TABLE public.supplier_payment_records
  ADD COLUMN IF NOT EXISTS source_sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_channel TEXT
    CHECK (
      source_channel IS NULL
      OR source_channel IN ('cash', 'transfer', 'nequi', 'bancolombia', 'card')
    ),
  ADD COLUMN IF NOT EXISTS linked_egreso_id UUID REFERENCES public.egresos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_supplier_payment_source_sale
  ON public.supplier_payment_records(source_sale_id)
  WHERE source_sale_id IS NOT NULL AND status = 'active';

COMMENT ON COLUMN public.supplier_payment_records.source_sale_id IS
  'Venta cuyo cobro se destinó a este abono de proveedor';
COMMENT ON COLUMN public.supplier_payment_records.source_channel IS
  'Canal del cobro de la venta usado (nequi, bancolombia, transfer, cash, card)';
COMMENT ON COLUMN public.supplier_payment_records.linked_egreso_id IS
  'Egreso de cuenta creado automáticamente al destinar el cobro de la venta';
