-- ============================================
-- MIGRACIÓN URGENTE: Cambiar foreign key de payment_records.user_id
-- ============================================
-- Cambiar de ON DELETE CASCADE a ON DELETE SET NULL
-- Esto evita que se eliminen los abonos cuando se elimina un usuario
-- 
-- IMPORTANTE: Aplicar esta migración ANTES de eliminar cualquier usuario
-- ============================================

-- Paso 1: Eliminar la constraint actual
ALTER TABLE "public"."payment_records"
DROP CONSTRAINT IF EXISTS "fk_payment_records_user_id";

-- Paso 2: Crear la nueva constraint con ON DELETE SET NULL
-- Ahora cuando se elimine un usuario, los payment_records se mantendrán
-- pero con user_id = NULL (el user_name se conserva como texto)
ALTER TABLE "public"."payment_records"
ADD CONSTRAINT "fk_payment_records_user_id" 
FOREIGN KEY ("user_id") 
REFERENCES "public"."users"("id") 
ON DELETE SET NULL;

-- ============================================
-- RESULTADO:
-- ============================================
-- Después de esta migración:
-- - Los abonos NO se eliminarán cuando se elimine un usuario
-- - Los abonos mantendrán el user_name (texto) aunque user_id sea NULL
-- - Los abonos seguirán siendo visibles en el historial
-- 
-- NOTA: Esta migración NO recupera los abonos que ya se eliminaron.
-- Solo previene que se eliminen en el futuro.
