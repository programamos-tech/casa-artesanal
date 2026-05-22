-- Precios de venta dual: cliente final (retail) y mayorista (wholesale)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS retail_price numeric(15,2),
  ADD COLUMN IF NOT EXISTS wholesale_price numeric(15,2);

UPDATE public.products
SET
  retail_price = COALESCE(retail_price, price),
  wholesale_price = COALESCE(wholesale_price, price)
WHERE retail_price IS NULL OR wholesale_price IS NULL;

ALTER TABLE public.products
  ALTER COLUMN retail_price SET NOT NULL,
  ALTER COLUMN wholesale_price SET NOT NULL;

COMMENT ON COLUMN public.products.cost IS 'Precio de adquisición / costo';
COMMENT ON COLUMN public.products.retail_price IS 'Precio de venta a cliente final (minorista / consumidor final)';
COMMENT ON COLUMN public.products.wholesale_price IS 'Precio de venta a cliente mayorista';
COMMENT ON COLUMN public.products.price IS 'Precio legado; se mantiene sincronizado con retail_price';
