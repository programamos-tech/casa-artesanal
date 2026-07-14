-- Sesiones de caja: abrir con fondo base y cerrar con resumen de ingresos/egresos

CREATE TABLE IF NOT EXISTS public.cash_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'closed', 'cancelled')),
  opening_cash NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (opening_cash >= 0),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  opened_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  opened_by_name TEXT NOT NULL DEFAULT '',
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  closed_by_name TEXT,
  -- Snapshot al cerrar
  sales_cash NUMERIC(14,2) NOT NULL DEFAULT 0,
  sales_transfer NUMERIC(14,2) NOT NULL DEFAULT 0,
  sales_nequi NUMERIC(14,2) NOT NULL DEFAULT 0,
  sales_bancolombia NUMERIC(14,2) NOT NULL DEFAULT 0,
  sales_card NUMERIC(14,2) NOT NULL DEFAULT 0,
  sales_other NUMERIC(14,2) NOT NULL DEFAULT 0,
  sales_credit NUMERIC(14,2) NOT NULL DEFAULT 0,
  credit_abonos_cash NUMERIC(14,2) NOT NULL DEFAULT 0,
  credit_abonos_other NUMERIC(14,2) NOT NULL DEFAULT 0,
  egresos_cash NUMERIC(14,2) NOT NULL DEFAULT 0,
  egresos_other NUMERIC(14,2) NOT NULL DEFAULT 0,
  sales_count INTEGER NOT NULL DEFAULT 0,
  egresos_count INTEGER NOT NULL DEFAULT 0,
  total_ingresos NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_egresos NUMERIC(14,2) NOT NULL DEFAULT 0,
  expected_cash NUMERIC(14,2) NOT NULL DEFAULT 0,
  counted_cash NUMERIC(14,2),
  difference NUMERIC(14,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Solo una caja abierta por tienda
CREATE UNIQUE INDEX IF NOT EXISTS idx_cash_sessions_one_open_per_store
  ON public.cash_sessions (store_id)
  WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_cash_sessions_store_opened
  ON public.cash_sessions (store_id, opened_at DESC);

CREATE INDEX IF NOT EXISTS idx_cash_sessions_status
  ON public.cash_sessions (store_id, status);

COMMENT ON TABLE public.cash_sessions IS 'Apertura y cierre de caja por tienda, con fondo inicial y resumen al cerrar';
COMMENT ON COLUMN public.cash_sessions.opening_cash IS 'Dinero base con el que se abre la caja';
COMMENT ON COLUMN public.cash_sessions.expected_cash IS 'Fondo + efectivo ingresado - egresos en efectivo';
