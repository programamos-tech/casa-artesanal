-- ============================================
-- REMOVER TODAS LAS POLÍTICAS RLS
-- ============================================
-- Esta migración deshabilita RLS y elimina todas las políticas
-- para simplificar el sistema y evitar problemas de acceso

-- Lista de todas las tablas
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Deshabilitar RLS en todas las tablas
    FOR r IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT LIKE 'pg_%'
    LOOP
        EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', r.tablename);
    END LOOP;
END $$;

-- Eliminar todas las políticas existentes
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
            r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Verificar que RLS está deshabilitado
DO $$
DECLARE
    r RECORD;
    enabled_count INTEGER := 0;
BEGIN
    FOR r IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND rowsecurity = true
    LOOP
        enabled_count := enabled_count + 1;
        RAISE NOTICE 'Tabla % todavía tiene RLS habilitado', r.tablename;
    END LOOP;
    
    IF enabled_count = 0 THEN
        RAISE NOTICE '✅ Todas las tablas tienen RLS deshabilitado';
    ELSE
        RAISE NOTICE '⚠️ % tablas todavía tienen RLS habilitado', enabled_count;
    END IF;
END $$;
