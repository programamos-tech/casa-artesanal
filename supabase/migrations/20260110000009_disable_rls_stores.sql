-- ============================================
-- DESHABILITAR RLS EN TABLAS ADMINISTRATIVAS
-- ============================================
-- Esta migración deshabilita RLS en tablas críticas
-- para permitir operaciones administrativas sin restricciones
-- ya que el servicio usa supabaseAdmin que debería hacer bypass,
-- pero en algunos casos RLS puede seguir aplicándose

-- Deshabilitar RLS en stores
ALTER TABLE public.stores DISABLE ROW LEVEL SECURITY;

-- Deshabilitar RLS en store_stock (necesario para crear stock inicial de nuevas tiendas)
ALTER TABLE public.store_stock DISABLE ROW LEVEL SECURITY;

-- Deshabilitar RLS en stock_transfers (necesario para crear transferencias)
ALTER TABLE public.stock_transfers DISABLE ROW LEVEL SECURITY;

-- Deshabilitar RLS en transfer_items (necesario para crear items de transferencia)
ALTER TABLE public.transfer_items DISABLE ROW LEVEL SECURITY;

-- Verificar que RLS está deshabilitado
DO $$
DECLARE
    stores_rls BOOLEAN;
    store_stock_rls BOOLEAN;
    stock_transfers_rls BOOLEAN;
    transfer_items_rls BOOLEAN;
BEGIN
    SELECT rowsecurity INTO stores_rls
    FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'stores';
    
    SELECT rowsecurity INTO store_stock_rls
    FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'store_stock';
    
    SELECT rowsecurity INTO stock_transfers_rls
    FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'stock_transfers';
    
    SELECT rowsecurity INTO transfer_items_rls
    FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'transfer_items';
    
    IF stores_rls THEN
        RAISE NOTICE '⚠️ RLS todavía está habilitado en stores';
    ELSE
        RAISE NOTICE '✅ RLS deshabilitado correctamente en stores';
    END IF;
    
    IF store_stock_rls THEN
        RAISE NOTICE '⚠️ RLS todavía está habilitado en store_stock';
    ELSE
        RAISE NOTICE '✅ RLS deshabilitado correctamente en store_stock';
    END IF;
    
    IF stock_transfers_rls THEN
        RAISE NOTICE '⚠️ RLS todavía está habilitado en stock_transfers';
    ELSE
        RAISE NOTICE '✅ RLS deshabilitado correctamente en stock_transfers';
    END IF;
    
    IF transfer_items_rls THEN
        RAISE NOTICE '⚠️ RLS todavía está habilitado en transfer_items';
    ELSE
        RAISE NOTICE '✅ RLS deshabilitado correctamente en transfer_items';
    END IF;
END $$;
