-- Las mensualidades no pueden pagarse en efectivo: el efectivo de la gaveta
-- es siempre caja del turno (entra al cierre). NOT VALID: hay filas históricas
-- cuenta+cash que no se reescriben.

ALTER TABLE public.egresos
  DROP CONSTRAINT IF EXISTS egresos_cuenta_no_cash;

ALTER TABLE public.egresos
  ADD CONSTRAINT egresos_cuenta_no_cash CHECK (
    expense_kind <> 'cuenta'
    OR payment_method <> 'cash'
  ) NOT VALID;

COMMENT ON CONSTRAINT egresos_cuenta_no_cash ON public.egresos IS
  'Egresos de cuenta (mensualidad) no pueden pagarse en efectivo. El efectivo de la gaveta es caja del turno.';
