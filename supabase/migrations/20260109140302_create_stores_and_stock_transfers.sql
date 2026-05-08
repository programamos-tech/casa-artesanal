-- Crear tabla de tiendas (stores)
CREATE TABLE IF NOT EXISTS "public"."stores" (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "nit" VARCHAR(50),
    "logo_url" TEXT,
    "address" TEXT,
    "city" VARCHAR(100),
    "is_active" BOOLEAN DEFAULT true NOT NULL,
    "deleted_at" TIMESTAMP WITH TIME ZONE,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- Índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS "idx_stores_is_active" ON "public"."stores" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_stores_deleted_at" ON "public"."stores" ("deleted_at");

-- Comentarios
COMMENT ON TABLE "public"."stores" IS 'Tabla de micro tiendas del sistema';
COMMENT ON COLUMN "public"."stores"."is_active" IS 'Indica si la tienda está activa';
COMMENT ON COLUMN "public"."stores"."deleted_at" IS 'Fecha de eliminación (soft delete)';

-- Crear tabla de transferencias de stock
CREATE TABLE IF NOT EXISTS "public"."stock_transfers" (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "from_store_id" UUID NOT NULL,
    "to_store_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" VARCHAR(50) DEFAULT 'pending' NOT NULL,
    "notes" TEXT,
    "created_by" UUID,
    "created_by_name" VARCHAR(255),
    "received_by" UUID,
    "received_by_name" VARCHAR(255),
    "received_at" TIMESTAMP WITH TIME ZONE,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    CONSTRAINT "stock_transfers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "stock_transfers_status_check" CHECK (("status"::text = ANY ((ARRAY['pending'::character varying, 'in_transit'::character varying, 'received'::character varying, 'cancelled'::character varying])::text[]))),
    CONSTRAINT "stock_transfers_from_store_fkey" FOREIGN KEY ("from_store_id") REFERENCES "public"."stores"("id") ON DELETE RESTRICT,
    CONSTRAINT "stock_transfers_to_store_fkey" FOREIGN KEY ("to_store_id") REFERENCES "public"."stores"("id") ON DELETE RESTRICT,
    CONSTRAINT "stock_transfers_product_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT
);

-- Índices para transferencias
CREATE INDEX IF NOT EXISTS "idx_stock_transfers_from_store" ON "public"."stock_transfers" ("from_store_id");
CREATE INDEX IF NOT EXISTS "idx_stock_transfers_to_store" ON "public"."stock_transfers" ("to_store_id");
CREATE INDEX IF NOT EXISTS "idx_stock_transfers_status" ON "public"."stock_transfers" ("status");
CREATE INDEX IF NOT EXISTS "idx_stock_transfers_product" ON "public"."stock_transfers" ("product_id");

-- Comentarios
COMMENT ON TABLE "public"."stock_transfers" IS 'Registro de transferencias de stock entre tiendas';
COMMENT ON COLUMN "public"."stock_transfers"."status" IS 'Estado de la transferencia: pending, in_transit, received, cancelled';

-- Crear tabla para stock por tienda
CREATE TABLE IF NOT EXISTS "public"."store_stock" (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "store_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" INTEGER DEFAULT 0 NOT NULL,
    "location" VARCHAR(100),
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    CONSTRAINT "store_stock_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "store_stock_store_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE,
    CONSTRAINT "store_stock_product_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE,
    CONSTRAINT "store_stock_unique" UNIQUE ("store_id", "product_id")
);

-- Índices para stock por tienda
CREATE INDEX IF NOT EXISTS "idx_store_stock_store" ON "public"."store_stock" ("store_id");
CREATE INDEX IF NOT EXISTS "idx_store_stock_product" ON "public"."store_stock" ("product_id");
CREATE INDEX IF NOT EXISTS "idx_store_stock_store_product" ON "public"."store_stock" ("store_id", "product_id");

-- Comentarios
COMMENT ON TABLE "public"."store_stock" IS 'Stock de productos por tienda';
COMMENT ON COLUMN "public"."store_stock"."quantity" IS 'Cantidad disponible del producto en la tienda';

-- Insertar tienda principal (Zona T) si no existe
INSERT INTO "public"."stores" ("id", "name", "nit", "address", "city", "is_active", "created_at", "updated_at")
SELECT 
    '00000000-0000-0000-0000-000000000001'::UUID,
    'Zona T',
    NULL,
    NULL,
    NULL,
    true,
    now(),
    now()
WHERE NOT EXISTS (
    SELECT 1 FROM "public"."stores" WHERE "id" = '00000000-0000-0000-0000-000000000001'::UUID
);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para actualizar updated_at
DROP TRIGGER IF EXISTS update_stores_updated_at ON "public"."stores";
CREATE TRIGGER update_stores_updated_at
    BEFORE UPDATE ON "public"."stores"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_stock_transfers_updated_at ON "public"."stock_transfers";
CREATE TRIGGER update_stock_transfers_updated_at
    BEFORE UPDATE ON "public"."stock_transfers"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_store_stock_updated_at ON "public"."store_stock";
CREATE TRIGGER update_store_stock_updated_at
    BEFORE UPDATE ON "public"."store_stock"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
