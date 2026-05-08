-- Nequi y Bancolombia como canales de transferencia explícitos (se conserva 'transfer' por datos históricos)
ALTER TABLE public.sales
  DROP CONSTRAINT IF EXISTS sales_payment_method_check;

ALTER TABLE public.sales
  ADD CONSTRAINT sales_payment_method_check
  CHECK (
    (payment_method)::text = ANY (
      ARRAY[
        'cash'::character varying,
        'credit'::character varying,
        'transfer'::character varying,
        'nequi'::character varying,
        'bancolombia'::character varying,
        'warranty'::character varying,
        'mixed'::character varying,
        'card'::character varying
      ]::text[]
    )
  );

ALTER TABLE public.sale_payments
  DROP CONSTRAINT IF EXISTS sale_payments_payment_type_check;

ALTER TABLE public.sale_payments
  ADD CONSTRAINT sale_payments_payment_type_check
  CHECK (
    (payment_type)::text = ANY (
      ARRAY[
        'cash'::character varying,
        'transfer'::character varying,
        'nequi'::character varying,
        'bancolombia'::character varying,
        'credit'::character varying,
        'card'::character varying
      ]::text[]
    )
  );

ALTER TABLE public.payment_records
  DROP CONSTRAINT IF EXISTS payment_records_payment_method_check;

ALTER TABLE public.payment_records
  ADD CONSTRAINT payment_records_payment_method_check
  CHECK (
    (payment_method)::text = ANY (
      ARRAY[
        'cash'::character varying,
        'transfer'::character varying,
        'nequi'::character varying,
        'bancolombia'::character varying,
        'card'::character varying
      ]::text[]
    )
  );
