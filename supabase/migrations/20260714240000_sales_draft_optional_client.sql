-- Borradores: permiten guardar solo con productos (cliente y medio de pago se completan al facturar)

ALTER TABLE public.sales
  ALTER COLUMN client_id DROP NOT NULL;

ALTER TABLE public.sales
  DROP CONSTRAINT IF EXISTS sales_payment_method_check;

ALTER TABLE public.sales
  ADD CONSTRAINT sales_payment_method_check
  CHECK (
    (payment_method)::text = ANY (
      ARRAY[
        'cash'::text,
        'credit'::text,
        'transfer'::text,
        'nequi'::text,
        'bancolombia'::text,
        'warranty'::text,
        'mixed'::text,
        'card'::text,
        'pending'::text
      ]
    )
  );

COMMENT ON COLUMN public.sales.client_id IS 'Cliente de la venta; puede ser NULL en borradores hasta finalizar.';
COMMENT ON CONSTRAINT sales_payment_method_check ON public.sales IS 'Incluye pending para borradores incompletos.';
