-- Alinear límite del bucket con la app (comprobantes comprimidos en cliente + validación API)
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    UPDATE storage.buckets
    SET file_size_limit = 2097152
    WHERE id = 'supplier-invoices';
  END IF;
END $$;
