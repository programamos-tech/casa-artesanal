-- Agregar campos cost y price a store_stock para precios independientes por microtienda
-- Estos campos permiten que cada microtienda tenga su propio precio de compra y venta
-- independiente de la tienda principal y otras microtiendas

ALTER TABLE "public"."store_stock" 
ADD COLUMN IF NOT EXISTS "cost" NUMERIC(15,2),
ADD COLUMN IF NOT EXISTS "price" NUMERIC(15,2);

-- Agregar campo unit_price a transfer_items para guardar el precio de transferencia
-- Este precio se usará como cost en la microtienda al recibir la transferencia
ALTER TABLE "public"."transfer_items"
ADD COLUMN IF NOT EXISTS "unit_price" NUMERIC(15,2);

-- Comentarios
COMMENT ON COLUMN "public"."store_stock"."cost" IS 'Precio de compra del producto para esta tienda (generalmente el precio de transferencia desde la tienda principal)';
COMMENT ON COLUMN "public"."store_stock"."price" IS 'Precio de venta del producto para esta tienda (configurado por la microtienda, inicialmente 0)';
COMMENT ON COLUMN "public"."transfer_items"."unit_price" IS 'Precio unitario al que se transfiere el producto (se convierte en cost para la microtienda al recibir)';
