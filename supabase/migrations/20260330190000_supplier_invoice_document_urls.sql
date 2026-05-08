-- Varios comprobantes por factura (imágenes y PDF), máx. 5 referencias en JSON
ALTER TABLE public.supplier_invoices
  ADD COLUMN IF NOT EXISTS document_urls JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.supplier_invoices.document_urls IS 'Array JSON de rutas/URLs en bucket supplier-invoices (invoices/…), hasta 5 archivos';

-- Migrar comprobante único legado hacia el arreglo
UPDATE public.supplier_invoices
SET document_urls = jsonb_build_array(trim(both from image_url::text))
WHERE image_url IS NOT NULL
  AND trim(both from image_url::text) <> ''
  AND jsonb_array_length(document_urls) = 0;
