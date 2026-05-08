-- ============================================
-- DESHABILITAR RLS PARA OPERACIONES ADMINISTRATIVAS
-- ============================================
-- Nota: Aunque supabaseAdmin debería hacer bypass de RLS,
-- hay casos donde las políticas se aplican de todas formas.
-- Esta migración deshabilita RLS en tablas críticas donde
-- las operaciones administrativas deben funcionar siempre.

-- Stores: Deshabilitar RLS ya que el servicio usa supabaseAdmin
-- y las políticas están causando problemas
ALTER TABLE public.stores DISABLE ROW LEVEL SECURITY;

-- Nota: Si en el futuro quieres habilitar RLS nuevamente,
-- puedes hacerlo con:
-- ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
-- Y luego recrear las políticas necesarias.
