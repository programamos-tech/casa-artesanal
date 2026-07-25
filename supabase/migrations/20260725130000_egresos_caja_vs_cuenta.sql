-- Egresos de caja (turno) vs egresos de cuenta (mensuales / montos altos)

ALTER TABLE public.egresos
  ADD COLUMN IF NOT EXISTS expense_kind TEXT NOT NULL DEFAULT 'caja'
    CHECK (expense_kind IN ('caja', 'cuenta'));

ALTER TABLE public.egresos
  ADD COLUMN IF NOT EXISTS period_month DATE;

COMMENT ON COLUMN public.egresos.expense_kind IS
  'caja = gasto operativo del turno (puede afectar efectivo); cuenta = sale de Nequi/Bancolombia/etc. y NO afecta caja';
COMMENT ON COLUMN public.egresos.period_month IS
  'Mes al que aplica el egreso de cuenta (primer día del mes). Null en egresos de caja.';

CREATE INDEX IF NOT EXISTS idx_egresos_expense_kind
  ON public.egresos (store_id, expense_kind);

CREATE INDEX IF NOT EXISTS idx_egresos_period_month
  ON public.egresos (store_id, period_month DESC)
  WHERE period_month IS NOT NULL;

-- Egresos de cuenta no pueden pagarse en efectivo (deben salir de una cuenta)
ALTER TABLE public.egresos
  DROP CONSTRAINT IF EXISTS egresos_cuenta_no_cash;

ALTER TABLE public.egresos
  ADD CONSTRAINT egresos_cuenta_no_cash CHECK (
    expense_kind <> 'cuenta'
    OR payment_method <> 'cash'
  );
