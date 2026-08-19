-- Comprobante visual opcional por abono a crédito
ALTER TABLE public.payment_records
  ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN public.payment_records.image_url IS
  'Ruta en bucket credit-payments (receipts/…) o URL pública del comprobante del abono';

-- Bucket público para fotos de comprobantes de abonos (máx. 2 MB, imágenes)
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'credit-payments',
      'credit-payments',
      true,
      2097152,
      ARRAY[
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/gif'
      ]::text[]
    )
    ON CONFLICT (id) DO UPDATE SET
      public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;
  END IF;

  IF to_regclass('storage.objects') IS NOT NULL THEN
    DROP POLICY IF EXISTS "credit_payments_storage_read" ON storage.objects;
    DROP POLICY IF EXISTS "credit_payments_storage_insert" ON storage.objects;
    DROP POLICY IF EXISTS "credit_payments_storage_update" ON storage.objects;
    DROP POLICY IF EXISTS "credit_payments_storage_delete" ON storage.objects;

    EXECUTE 'CREATE POLICY "credit_payments_storage_read"
      ON storage.objects FOR SELECT
      USING (bucket_id = ''credit-payments'')';

    EXECUTE 'CREATE POLICY "credit_payments_storage_insert"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = ''credit-payments'')';

    EXECUTE 'CREATE POLICY "credit_payments_storage_update"
      ON storage.objects FOR UPDATE
      USING (bucket_id = ''credit-payments'')';

    EXECUTE 'CREATE POLICY "credit_payments_storage_delete"
      ON storage.objects FOR DELETE
      USING (bucket_id = ''credit-payments'')';
  END IF;
END $$;
