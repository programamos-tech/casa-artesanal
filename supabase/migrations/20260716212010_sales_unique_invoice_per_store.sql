-- Secuencia atómica de factura por tienda + unicidad (store_id, invoice_number)

CREATE OR REPLACE FUNCTION public.allocate_next_invoice_number(p_store_id uuid DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  main_id uuid := '00000000-0000-0000-0000-000000000001';
  second_id uuid := '8ad34b95-e611-4117-a03d-b44627297ae4';
  sid uuid := COALESCE(p_store_id, main_id);
  prefix text;
  max_n int := 0;
  next_n int;
BEGIN
  IF sid = main_id THEN
    prefix := 'CAP';
  ELSIF sid = second_id THEN
    prefix := 'CA2P';
  ELSE
    prefix := 'CA';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('invoice-seq:' || sid::text));

  IF sid = main_id THEN
    SELECT COALESCE(MAX(substring(invoice_number from '[0-9]+$')::int), 0)
    INTO max_n
    FROM sales
    WHERE (store_id IS NULL OR store_id = main_id)
      AND invoice_number LIKE prefix || '-%';
  ELSE
    SELECT COALESCE(MAX(substring(invoice_number from '[0-9]+$')::int), 0)
    INTO max_n
    FROM sales
    WHERE store_id = sid
      AND invoice_number LIKE prefix || '-%';
  END IF;

  next_n := max_n + 1;
  -- Importante: lpad(text, 3) en Postgres TRUNCA si hay más de 3 dígitos (1572 → 157)
  IF next_n < 1000 THEN
    RETURN prefix || '-' || lpad(next_n::text, 3, '0');
  END IF;
  RETURN prefix || '-' || next_n::text;
END;
$$;

REVOKE ALL ON FUNCTION public.allocate_next_invoice_number(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.allocate_next_invoice_number(uuid) TO anon, authenticated, service_role;

CREATE UNIQUE INDEX IF NOT EXISTS sales_unique_invoice_per_store
ON public.sales (
  (COALESCE(store_id, '00000000-0000-0000-0000-000000000001'::uuid)),
  invoice_number
)
WHERE invoice_number IS NOT NULL AND btrim(invoice_number) <> '';
