-- Agregar store_id a la tabla users
ALTER TABLE "public"."users"
ADD COLUMN IF NOT EXISTS "store_id" UUID;

-- Agregar store_id a la tabla clients
ALTER TABLE "public"."clients"
ADD COLUMN IF NOT EXISTS "store_id" UUID;

-- Agregar store_id a la tabla sales
ALTER TABLE "public"."sales"
ADD COLUMN IF NOT EXISTS "store_id" UUID;

-- Agregar store_id a la tabla sale_items (a través de sales)
-- Nota: sale_items ya tiene sale_id que referencia a sales, así que hereda el store_id

-- Agregar store_id a la tabla credits
ALTER TABLE "public"."credits"
ADD COLUMN IF NOT EXISTS "store_id" UUID;

-- Agregar store_id a la tabla payment_records
ALTER TABLE "public"."payment_records"
ADD COLUMN IF NOT EXISTS "store_id" UUID;

-- Agregar store_id a la tabla warranties
ALTER TABLE "public"."warranties"
ADD COLUMN IF NOT EXISTS "store_id" UUID;

-- Agregar store_id a la tabla warranty_products (a través de warranties)
-- Nota: warranty_products ya tiene warranty_id que referencia a warranties

-- Agregar store_id a la tabla logs
ALTER TABLE "public"."logs"
ADD COLUMN IF NOT EXISTS "store_id" UUID;

-- Agregar store_id a la tabla categories (opcional, para categorías por tienda)
ALTER TABLE "public"."categories"
ADD COLUMN IF NOT EXISTS "store_id" UUID;

-- Agregar foreign keys
ALTER TABLE "public"."users"
ADD CONSTRAINT "users_store_fkey" 
FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE SET NULL;

ALTER TABLE "public"."clients"
ADD CONSTRAINT "clients_store_fkey" 
FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE RESTRICT;

ALTER TABLE "public"."sales"
ADD CONSTRAINT "sales_store_fkey" 
FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE RESTRICT;

ALTER TABLE "public"."credits"
ADD CONSTRAINT "credits_store_fkey" 
FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE RESTRICT;

ALTER TABLE "public"."payment_records"
ADD CONSTRAINT "payment_records_store_fkey" 
FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE RESTRICT;

ALTER TABLE "public"."warranties"
ADD CONSTRAINT "warranties_store_fkey" 
FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE RESTRICT;

ALTER TABLE "public"."logs"
ADD CONSTRAINT "logs_store_fkey" 
FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE SET NULL;

ALTER TABLE "public"."categories"
ADD CONSTRAINT "categories_store_fkey" 
FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE SET NULL;

-- Crear índices para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS "idx_users_store" ON "public"."users" ("store_id");
CREATE INDEX IF NOT EXISTS "idx_clients_store" ON "public"."clients" ("store_id");
CREATE INDEX IF NOT EXISTS "idx_sales_store" ON "public"."sales" ("store_id");
CREATE INDEX IF NOT EXISTS "idx_credits_store" ON "public"."credits" ("store_id");
CREATE INDEX IF NOT EXISTS "idx_payment_records_store" ON "public"."payment_records" ("store_id");
CREATE INDEX IF NOT EXISTS "idx_warranties_store" ON "public"."warranties" ("store_id");
CREATE INDEX IF NOT EXISTS "idx_logs_store" ON "public"."logs" ("store_id");
CREATE INDEX IF NOT EXISTS "idx_categories_store" ON "public"."categories" ("store_id");

-- Actualizar todos los registros existentes para asignarlos a la tienda principal (Zona T)
UPDATE "public"."users"
SET "store_id" = '00000000-0000-0000-0000-000000000001'::UUID
WHERE "store_id" IS NULL;

UPDATE "public"."clients"
SET "store_id" = '00000000-0000-0000-0000-000000000001'::UUID
WHERE "store_id" IS NULL;

UPDATE "public"."sales"
SET "store_id" = '00000000-0000-0000-0000-000000000001'::UUID
WHERE "store_id" IS NULL;

UPDATE "public"."credits"
SET "store_id" = '00000000-0000-0000-0000-000000000001'::UUID
WHERE "store_id" IS NULL;

UPDATE "public"."payment_records"
SET "store_id" = '00000000-0000-0000-0000-000000000001'::UUID
WHERE "store_id" IS NULL;

UPDATE "public"."warranties"
SET "store_id" = '00000000-0000-0000-0000-000000000001'::UUID
WHERE "store_id" IS NULL;

UPDATE "public"."logs"
SET "store_id" = '00000000-0000-0000-0000-000000000001'::UUID
WHERE "store_id" IS NULL;

UPDATE "public"."categories"
SET "store_id" = '00000000-0000-0000-0000-000000000001'::UUID
WHERE "store_id" IS NULL;

-- Hacer store_id NOT NULL después de asignar valores (opcional, comentado por si hay problemas)
-- ALTER TABLE "public"."clients" ALTER COLUMN "store_id" SET NOT NULL;
-- ALTER TABLE "public"."sales" ALTER COLUMN "store_id" SET NOT NULL;
-- ALTER TABLE "public"."credits" ALTER COLUMN "store_id" SET NOT NULL;
-- ALTER TABLE "public"."payment_records" ALTER COLUMN "store_id" SET NOT NULL;
-- ALTER TABLE "public"."warranties" ALTER COLUMN "store_id" SET NOT NULL;
