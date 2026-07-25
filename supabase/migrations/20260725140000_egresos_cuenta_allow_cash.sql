-- Permitir egresos de cuenta en efectivo (contra el efectivo recaudado del mes)
ALTER TABLE public.egresos
  DROP CONSTRAINT IF EXISTS egresos_cuenta_no_cash;
