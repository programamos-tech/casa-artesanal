-- Bucket público para logos de tiendas (alineado con /api/storage/upload-store-logo: máx. 2MB, imágenes)
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'store-logos',
      'store-logos',
      true,
      2097152,
      ARRAY[
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/gif',
        'image/svg+xml'
      ]::text[]
    )
    ON CONFLICT (id) DO UPDATE SET
      public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;
  END IF;

  IF to_regclass('storage.objects') IS NOT NULL THEN
    DROP POLICY IF EXISTS "store_logos_storage_read" ON storage.objects;
    DROP POLICY IF EXISTS "store_logos_storage_insert" ON storage.objects;
    DROP POLICY IF EXISTS "store_logos_storage_update" ON storage.objects;
    DROP POLICY IF EXISTS "store_logos_storage_delete" ON storage.objects;

    EXECUTE 'CREATE POLICY "store_logos_storage_read"
      ON storage.objects FOR SELECT
      USING (bucket_id = ''store-logos'')';

    EXECUTE 'CREATE POLICY "store_logos_storage_insert"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = ''store-logos'')';

    EXECUTE 'CREATE POLICY "store_logos_storage_update"
      ON storage.objects FOR UPDATE
      USING (bucket_id = ''store-logos'')';

    EXECUTE 'CREATE POLICY "store_logos_storage_delete"
      ON storage.objects FOR DELETE
      USING (bucket_id = ''store-logos'')';
  END IF;
END $$;
