-- Primero crear la tabla transfer_items si no existe
CREATE TABLE IF NOT EXISTS "public"."transfer_items" (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "transfer_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "product_name" VARCHAR(255) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    CONSTRAINT "transfer_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "transfer_items_transfer_fkey" FOREIGN KEY ("transfer_id") REFERENCES "public"."stock_transfers"("id") ON DELETE CASCADE,
    CONSTRAINT "transfer_items_product_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT
);

-- Índices para transfer_items
CREATE INDEX IF NOT EXISTS "idx_transfer_items_transfer" ON "public"."transfer_items" ("transfer_id");
CREATE INDEX IF NOT EXISTS "idx_transfer_items_product" ON "public"."transfer_items" ("product_id");

-- Agregar from_location y product_reference a transfer_items
ALTER TABLE "public"."transfer_items"
ADD COLUMN IF NOT EXISTS "from_location" VARCHAR(50),
ADD COLUMN IF NOT EXISTS "product_reference" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Crear trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_transfer_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_transfer_items_updated_at_trigger ON "public"."transfer_items";
CREATE TRIGGER update_transfer_items_updated_at_trigger
    BEFORE UPDATE ON "public"."transfer_items"
    FOR EACH ROW
    EXECUTE FUNCTION update_transfer_items_updated_at();

-- Comentarios
COMMENT ON TABLE "public"."transfer_items" IS 'Items individuales de una transferencia (permite múltiples productos por transferencia)';
COMMENT ON COLUMN "public"."transfer_items"."from_location" IS 'Ubicación de origen: warehouse (bodega) o store (local)';
COMMENT ON COLUMN "public"."transfer_items"."product_reference" IS 'Referencia del producto';
