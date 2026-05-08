-- Agregar campos para recepciones parciales en transfer_items
ALTER TABLE "public"."transfer_items"
ADD COLUMN IF NOT EXISTS "quantity_received" INTEGER,
ADD COLUMN IF NOT EXISTS "notes" TEXT;

-- Comentarios
COMMENT ON COLUMN "public"."transfer_items"."quantity_received" IS 'Cantidad recibida del producto (puede ser menor a quantity si es recepción parcial)';
COMMENT ON COLUMN "public"."transfer_items"."notes" IS 'Nota específica del item al recibir';
