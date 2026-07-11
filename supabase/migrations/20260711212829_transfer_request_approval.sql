-- Flujo de solicitud de traslado: requested → (aprobación por línea) → pending → received
-- Las solicitudes no descuentan stock hasta que la tienda origen aprueba las referencias.

ALTER TABLE public.stock_transfers
  DROP CONSTRAINT IF EXISTS stock_transfers_status_check;

ALTER TABLE public.stock_transfers
  ADD CONSTRAINT stock_transfers_status_check
  CHECK (
    (status)::text = ANY (
      (ARRAY[
        'requested'::character varying,
        'pending'::character varying,
        'in_transit'::character varying,
        'received'::character varying,
        'partially_received'::character varying,
        'cancelled'::character varying,
        'rejected'::character varying
      ])::text[]
    )
  );

COMMENT ON COLUMN public.stock_transfers.status IS
  'requested: solicitud esperando aprobación origen; pending: aprobado/listo para recibir; in_transit; received; partially_received; cancelled; rejected';

ALTER TABLE public.transfer_items
  ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS approved_by UUID,
  ADD COLUMN IF NOT EXISTS approved_by_name TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approval_notes TEXT;

ALTER TABLE public.transfer_items
  DROP CONSTRAINT IF EXISTS transfer_items_approval_status_check;

ALTER TABLE public.transfer_items
  ADD CONSTRAINT transfer_items_approval_status_check
  CHECK (
    (approval_status)::text = ANY (
      (ARRAY[
        'pending'::character varying,
        'approved'::character varying,
        'rejected'::character varying
      ])::text[]
    )
  );

COMMENT ON COLUMN public.transfer_items.approval_status IS
  'pending: esperando aprobación de la tienda origen; approved: aceptada; rejected: rechazada';
COMMENT ON COLUMN public.transfer_items.approved_by IS 'Usuario que aprobó o rechazó la línea';
COMMENT ON COLUMN public.transfer_items.approved_at IS 'Momento de la decisión de aprobación';

CREATE INDEX IF NOT EXISTS idx_stock_transfers_status_from_store
  ON public.stock_transfers (status, from_store_id);

CREATE INDEX IF NOT EXISTS idx_transfer_items_approval_status
  ON public.transfer_items (approval_status);
