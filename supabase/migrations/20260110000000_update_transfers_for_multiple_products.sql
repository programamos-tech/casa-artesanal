-- Actualizar estructura de transferencias para soportar múltiples productos
-- Crear tabla de items de transferencia (un producto por fila)
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

-- Agregar campos adicionales a stock_transfers si no existen
ALTER TABLE "public"."stock_transfers" 
ADD COLUMN IF NOT EXISTS "transfer_number" VARCHAR(50),
ADD COLUMN IF NOT EXISTS "description" TEXT;

-- Agregar constraint UNIQUE a transfer_number si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'stock_transfers_transfer_number_key'
    ) THEN
        ALTER TABLE "public"."stock_transfers" 
        ADD CONSTRAINT "stock_transfers_transfer_number_key" UNIQUE ("transfer_number");
    END IF;
END $$;

-- Crear función para generar número de transferencia único
CREATE OR REPLACE FUNCTION generate_transfer_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.transfer_number IS NULL THEN
        NEW.transfer_number := 'TRF-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('transfer_number_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear secuencia para números de transferencia
CREATE SEQUENCE IF NOT EXISTS transfer_number_seq START 1;

-- Crear trigger para generar número de transferencia automáticamente
DROP TRIGGER IF EXISTS generate_transfer_number_trigger ON "public"."stock_transfers";
CREATE TRIGGER generate_transfer_number_trigger
    BEFORE INSERT ON "public"."stock_transfers"
    FOR EACH ROW
    EXECUTE FUNCTION generate_transfer_number();

-- Migrar datos existentes de stock_transfers a transfer_items (si hay datos)
-- Esto es para mantener compatibilidad con transferencias existentes
INSERT INTO "public"."transfer_items" ("transfer_id", "product_id", "product_name", "quantity")
SELECT 
    st.id as transfer_id,
    st.product_id,
    COALESCE(p.name, 'Producto Desconocido') as product_name,
    st.quantity
FROM "public"."stock_transfers" st
LEFT JOIN "public"."products" p ON st.product_id = p.id
WHERE NOT EXISTS (
    SELECT 1 FROM "public"."transfer_items" ti WHERE ti.transfer_id = st.id
);

-- Comentarios
COMMENT ON TABLE "public"."transfer_items" IS 'Items individuales de una transferencia (permite múltiples productos por transferencia)';
COMMENT ON COLUMN "public"."stock_transfers"."transfer_number" IS 'Número único de transferencia (ej: TRF-20260110-0001)';
COMMENT ON COLUMN "public"."stock_transfers"."description" IS 'Descripción general de la transferencia';
