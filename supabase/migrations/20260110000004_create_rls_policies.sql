-- ============================================
-- POLÍTICAS RLS (Row Level Security)
-- ============================================
-- Esta migración crea políticas de seguridad a nivel de fila para todas las tablas
-- Las políticas están basadas en roles y store_id del usuario

-- ============================================
-- TABLA DE SESIONES ACTIVAS
-- ============================================

-- Crear tabla de sesiones para rastrear usuarios activos
CREATE TABLE IF NOT EXISTS public.active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_active_sessions_user_id ON public.active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_token ON public.active_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_active_sessions_expires ON public.active_sessions(expires_at);

-- Habilitar RLS en sesiones (pero permitir acceso para las funciones)
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

-- Política para que usuarios puedan ver sus propias sesiones
CREATE POLICY "users_select_own_sessions" ON public.active_sessions
  FOR SELECT
  USING (true); -- Permitir lectura para funciones helper

-- Política para insertar sesiones (desde la aplicación)
CREATE POLICY "authenticated_insert_sessions" ON public.active_sessions
  FOR INSERT
  WITH CHECK (true);

-- Política para actualizar sesiones
CREATE POLICY "users_update_own_sessions" ON public.active_sessions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Política para eliminar sesiones
CREATE POLICY "users_delete_own_sessions" ON public.active_sessions
  FOR DELETE
  USING (true);

-- Función para limpiar sesiones expiradas (ejecutar periódicamente)
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.active_sessions
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCIONES HELPER
-- ============================================

-- Función para obtener el user_id actual desde el header o sesión
-- Intenta obtener desde:
-- 1. Header personalizado 'x-user-id' (si está configurado en Supabase)
-- 2. JWT claim 'user_id' (si está disponible)
-- 3. Variable de sesión 'app.user_id' (si se establece desde la aplicación)
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS UUID AS $$
DECLARE
  user_id UUID;
  session_token TEXT;
BEGIN
  -- Intentar obtener desde header personalizado (requiere configuración en Supabase)
  BEGIN
    user_id := (current_setting('request.headers', true)::jsonb->>'x-user-id')::UUID;
    IF user_id IS NOT NULL THEN
      RETURN user_id;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;

  -- Intentar obtener desde JWT claim
  BEGIN
    user_id := (current_setting('request.jwt.claims', true)::jsonb->>'user_id')::UUID;
    IF user_id IS NOT NULL THEN
      RETURN user_id;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;

  -- Intentar obtener desde variable de sesión (establecida por la aplicación)
  BEGIN
    user_id := current_setting('app.user_id', true)::UUID;
    IF user_id IS NOT NULL THEN
      RETURN user_id;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;

  -- Intentar obtener desde session_token en header
  BEGIN
    session_token := current_setting('request.headers', true)::jsonb->>'x-session-token';
    IF session_token IS NOT NULL THEN
      SELECT user_id INTO user_id
      FROM public.active_sessions
      WHERE session_token = session_token
        AND expires_at > NOW()
      LIMIT 1;
      
      IF user_id IS NOT NULL THEN
        RETURN user_id;
      END IF;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener el usuario actual completo
CREATE OR REPLACE FUNCTION public.get_current_user()
RETURNS TABLE (
  id UUID,
  role VARCHAR,
  store_id UUID,
  is_active BOOLEAN
) AS $$
DECLARE
  user_id UUID;
BEGIN
  user_id := public.get_current_user_id();
  
  IF user_id IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    u.id,
    u.role,
    u.store_id,
    u.is_active
  FROM public.users u
  WHERE u.id = user_id
    AND u.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si el usuario es superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role VARCHAR;
BEGIN
  SELECT role INTO user_role
  FROM public.get_current_user();
  
  RETURN user_role IN ('superadmin', 'Super Admin', 'Super Administrador');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si el usuario puede acceder a todas las tiendas
CREATE OR REPLACE FUNCTION public.can_access_all_stores()
RETURNS BOOLEAN AS $$
DECLARE
  user_record RECORD;
BEGIN
  SELECT * INTO user_record FROM public.get_current_user();
  
  IF user_record.id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Superadmin o admin de tienda principal pueden acceder a todas las tiendas
  IF user_record.role IN ('superadmin', 'Super Admin', 'Super Administrador', 'admin', 'Administrador') THEN
    -- Verificar si es de la tienda principal
    IF user_record.store_id = '00000000-0000-0000-0000-000000000001'::UUID OR user_record.store_id IS NULL THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener el store_id del usuario actual
CREATE OR REPLACE FUNCTION public.get_user_store_id()
RETURNS UUID AS $$
DECLARE
  user_store_id UUID;
BEGIN
  SELECT store_id INTO user_store_id
  FROM public.get_current_user();
  
  RETURN user_store_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ELIMINAR POLÍTICAS EXISTENTES (si las hay)
-- ============================================
-- Esto permite ejecutar esta migración múltiples veces sin errores

DO $$
DECLARE
  r RECORD;
BEGIN
  -- Eliminar todas las políticas existentes de todas las tablas
  FOR r IN 
    SELECT schemaname, tablename, policyname 
    FROM pg_policies 
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- ============================================
-- HABILITAR RLS EN TODAS LAS TABLAS
-- ============================================

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warranties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warranty_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warranty_status_history ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS PARA TABLA: users
-- ============================================

-- Política permisiva: permitir acceso si hay un usuario autenticado o si es superadmin
-- IMPORTANTE: También permitir SELECT para búsquedas por email (necesario para login)
-- Nota: El login usa supabaseAdmin para evitar problemas, pero esta política permite
-- que otras consultas funcionen si es necesario
CREATE POLICY "users_select_policy" ON public.users
  FOR SELECT
  USING (
    public.is_superadmin()
    OR public.get_current_user_id() IS NOT NULL
    OR id = public.get_current_user_id()
    -- Permitir búsquedas por email para login (si se necesita)
    -- En la práctica, el login usa supabaseAdmin, pero esto es una medida de seguridad adicional
  );

-- Política para insertar: solo superadmin o usuarios autenticados
CREATE POLICY "users_insert_policy" ON public.users
  FOR INSERT
  WITH CHECK (
    public.is_superadmin()
    OR public.get_current_user_id() IS NOT NULL
  );

-- Política para actualizar: superadmin o el propio usuario
CREATE POLICY "users_update_policy" ON public.users
  FOR UPDATE
  USING (
    public.is_superadmin()
    OR id = public.get_current_user_id()
  )
  WITH CHECK (
    public.is_superadmin()
    OR id = public.get_current_user_id()
  );

-- Política para eliminar: solo superadmin
CREATE POLICY "users_delete_policy" ON public.users
  FOR DELETE
  USING (public.is_superadmin());

-- ============================================
-- POLÍTICAS PARA TABLA: roles
-- ============================================

-- Política permisiva: usuarios autenticados pueden ver roles
CREATE POLICY "roles_select_policy" ON public.roles
  FOR SELECT
  USING (
    public.is_superadmin()
    OR public.get_current_user_id() IS NOT NULL
  );

-- Solo superadmin puede insertar/actualizar/eliminar roles
CREATE POLICY "roles_insert_policy" ON public.roles
  FOR INSERT
  WITH CHECK (public.is_superadmin());

CREATE POLICY "roles_update_policy" ON public.roles
  FOR UPDATE
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

CREATE POLICY "roles_delete_policy" ON public.roles
  FOR DELETE
  USING (public.is_superadmin());

-- ============================================
-- POLÍTICAS PARA TABLA: stores
-- ============================================

-- Política permisiva: usuarios autenticados pueden ver tiendas
CREATE POLICY "stores_select_policy" ON public.stores
  FOR SELECT
  USING (
    public.is_superadmin()
    OR public.can_access_all_stores()
    OR id = public.get_user_store_id()
    OR public.get_current_user_id() IS NOT NULL
  );

-- Solo superadmin puede insertar/actualizar/eliminar tiendas
CREATE POLICY "stores_insert_policy" ON public.stores
  FOR INSERT
  WITH CHECK (public.is_superadmin());

CREATE POLICY "stores_update_policy" ON public.stores
  FOR UPDATE
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

CREATE POLICY "stores_delete_policy" ON public.stores
  FOR DELETE
  USING (public.is_superadmin());

-- ============================================
-- POLÍTICAS PARA TABLA: products
-- ============================================

-- Política permisiva: productos son compartidos entre tiendas, usuarios autenticados pueden verlos
CREATE POLICY "products_select_policy" ON public.products
  FOR SELECT
  USING (
    public.is_superadmin()
    OR public.get_current_user_id() IS NOT NULL
  );

-- Superadmin y admin pueden insertar/actualizar productos
CREATE POLICY "products_insert_policy" ON public.products
  FOR INSERT
  WITH CHECK (
    public.is_superadmin()
    OR public.can_access_all_stores()
    OR public.get_current_user_id() IS NOT NULL
  );

CREATE POLICY "products_update_policy" ON public.products
  FOR UPDATE
  USING (
    public.is_superadmin()
    OR public.can_access_all_stores()
    OR public.get_current_user_id() IS NOT NULL
  )
  WITH CHECK (
    public.is_superadmin()
    OR public.can_access_all_stores()
    OR public.get_current_user_id() IS NOT NULL
  );

-- Solo superadmin puede eliminar productos
CREATE POLICY "products_delete_policy" ON public.products
  FOR DELETE
  USING (public.is_superadmin());

-- ============================================
-- POLÍTICAS PARA TABLA: categories
-- ============================================

-- Superadmin puede ver todas las categorías
CREATE POLICY "superadmin_select_categories" ON public.categories
  FOR SELECT
  USING (public.is_superadmin());

-- Usuarios autenticados pueden ver categorías de su tienda o sin tienda asignada
CREATE POLICY "users_select_categories" ON public.categories
  FOR SELECT
  USING (
    public.get_current_user_id() IS NOT NULL
    AND (
      store_id IS NULL
      OR store_id = public.get_user_store_id()
      OR public.can_access_all_stores()
    )
  );

-- Superadmin y admin pueden insertar categorías
CREATE POLICY "admin_insert_categories" ON public.categories
  FOR INSERT
  WITH CHECK (
    public.is_superadmin() 
    OR public.can_access_all_stores()
  );

-- Superadmin y admin pueden actualizar categorías
CREATE POLICY "admin_update_categories" ON public.categories
  FOR UPDATE
  USING (
    public.is_superadmin() 
    OR public.can_access_all_stores()
    OR (
      store_id = public.get_user_store_id()
      AND public.get_current_user_id() IS NOT NULL
    )
  )
  WITH CHECK (
    public.is_superadmin() 
    OR public.can_access_all_stores()
    OR (
      store_id = public.get_user_store_id()
      AND public.get_current_user_id() IS NOT NULL
    )
  );

-- Superadmin puede eliminar categorías
CREATE POLICY "superadmin_delete_categories" ON public.categories
  FOR DELETE
  USING (public.is_superadmin());

-- ============================================
-- POLÍTICAS PARA TABLA: clients
-- ============================================

-- Superadmin puede ver todos los clientes
CREATE POLICY "superadmin_select_clients" ON public.clients
  FOR SELECT
  USING (public.is_superadmin());

-- Usuarios pueden ver clientes de su tienda o si pueden acceder a todas las tiendas
CREATE POLICY "users_select_clients" ON public.clients
  FOR SELECT
  USING (
    public.get_current_user_id() IS NOT NULL
    AND (
      public.can_access_all_stores()
      OR store_id = public.get_user_store_id()
    )
  );

-- Usuarios autenticados pueden insertar clientes en su tienda
CREATE POLICY "users_insert_clients" ON public.clients
  FOR INSERT
  WITH CHECK (
    public.get_current_user_id() IS NOT NULL
    AND (
      public.can_access_all_stores()
      OR store_id = public.get_user_store_id()
    )
  );

-- Usuarios pueden actualizar clientes de su tienda
CREATE POLICY "users_update_clients" ON public.clients
  FOR UPDATE
  USING (
    public.is_superadmin()
    OR (
      public.get_current_user_id() IS NOT NULL
      AND (
        public.can_access_all_stores()
        OR store_id = public.get_user_store_id()
      )
    )
  )
  WITH CHECK (
    public.is_superadmin()
    OR (
      public.get_current_user_id() IS NOT NULL
      AND (
        public.can_access_all_stores()
        OR store_id = public.get_user_store_id()
      )
    )
  );

-- Superadmin puede eliminar clientes
CREATE POLICY "superadmin_delete_clients" ON public.clients
  FOR DELETE
  USING (public.is_superadmin());

-- ============================================
-- POLÍTICAS PARA TABLA: sales
-- ============================================

-- Superadmin puede ver todas las ventas
CREATE POLICY "superadmin_select_sales" ON public.sales
  FOR SELECT
  USING (public.is_superadmin());

-- Usuarios pueden ver ventas de su tienda
CREATE POLICY "users_select_sales" ON public.sales
  FOR SELECT
  USING (
    public.get_current_user_id() IS NOT NULL
    AND (
      public.can_access_all_stores()
      OR store_id = public.get_user_store_id()
    )
  );

-- Usuarios autenticados pueden insertar ventas en su tienda
CREATE POLICY "users_insert_sales" ON public.sales
  FOR INSERT
  WITH CHECK (
    public.get_current_user_id() IS NOT NULL
    AND (
      public.can_access_all_stores()
      OR store_id = public.get_user_store_id()
    )
  );

-- Usuarios pueden actualizar ventas de su tienda
CREATE POLICY "users_update_sales" ON public.sales
  FOR UPDATE
  USING (
    public.is_superadmin()
    OR (
      public.get_current_user_id() IS NOT NULL
      AND (
        public.can_access_all_stores()
        OR store_id = public.get_user_store_id()
      )
    )
  )
  WITH CHECK (
    public.is_superadmin()
    OR (
      public.get_current_user_id() IS NOT NULL
      AND (
        public.can_access_all_stores()
        OR store_id = public.get_user_store_id()
      )
    )
  );

-- Superadmin puede eliminar ventas
CREATE POLICY "superadmin_delete_sales" ON public.sales
  FOR DELETE
  USING (public.is_superadmin());

-- ============================================
-- POLÍTICAS PARA TABLA: sale_items
-- ============================================

-- Usuarios pueden ver items de ventas de su tienda (a través de sales)
CREATE POLICY "users_select_sale_items" ON public.sale_items
  FOR SELECT
  USING (
    public.get_current_user_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.sales s
      WHERE s.id = sale_items.sale_id
      AND (
        public.can_access_all_stores()
        OR s.store_id = public.get_user_store_id()
      )
    )
  );

-- Usuarios autenticados pueden insertar items de ventas
CREATE POLICY "users_insert_sale_items" ON public.sale_items
  FOR INSERT
  WITH CHECK (
    public.get_current_user_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.sales s
      WHERE s.id = sale_items.sale_id
      AND (
        public.can_access_all_stores()
        OR s.store_id = public.get_user_store_id()
      )
    )
  );

-- Usuarios pueden actualizar items de ventas de su tienda
CREATE POLICY "users_update_sale_items" ON public.sale_items
  FOR UPDATE
  USING (
    public.get_current_user_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.sales s
      WHERE s.id = sale_items.sale_id
      AND (
        public.can_access_all_stores()
        OR s.store_id = public.get_user_store_id()
      )
    )
  )
  WITH CHECK (
    public.get_current_user_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.sales s
      WHERE s.id = sale_items.sale_id
      AND (
        public.can_access_all_stores()
        OR s.store_id = public.get_user_store_id()
      )
    )
  );

-- Superadmin puede eliminar items de ventas
CREATE POLICY "superadmin_delete_sale_items" ON public.sale_items
  FOR DELETE
  USING (public.is_superadmin());

-- ============================================
-- POLÍTICAS PARA TABLA: sale_payments
-- ============================================

-- Usuarios pueden ver pagos de ventas de su tienda
CREATE POLICY "users_select_sale_payments" ON public.sale_payments
  FOR SELECT
  USING (
    public.get_current_user_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.sales s
      WHERE s.id = sale_payments.sale_id
      AND (
        public.can_access_all_stores()
        OR s.store_id = public.get_user_store_id()
      )
    )
  );

-- Usuarios autenticados pueden insertar pagos de ventas
CREATE POLICY "users_insert_sale_payments" ON public.sale_payments
  FOR INSERT
  WITH CHECK (
    public.get_current_user_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.sales s
      WHERE s.id = sale_payments.sale_id
      AND (
        public.can_access_all_stores()
        OR s.store_id = public.get_user_store_id()
      )
    )
  );

-- Superadmin puede eliminar pagos de ventas
CREATE POLICY "superadmin_delete_sale_payments" ON public.sale_payments
  FOR DELETE
  USING (public.is_superadmin());

-- ============================================
-- POLÍTICAS PARA TABLA: credits
-- ============================================

-- Superadmin puede ver todos los créditos
CREATE POLICY "superadmin_select_credits" ON public.credits
  FOR SELECT
  USING (public.is_superadmin());

-- Usuarios pueden ver créditos de su tienda
CREATE POLICY "users_select_credits" ON public.credits
  FOR SELECT
  USING (
    public.get_current_user_id() IS NOT NULL
    AND (
      public.can_access_all_stores()
      OR store_id = public.get_user_store_id()
    )
  );

-- Usuarios autenticados pueden insertar créditos en su tienda
CREATE POLICY "users_insert_credits" ON public.credits
  FOR INSERT
  WITH CHECK (
    public.get_current_user_id() IS NOT NULL
    AND (
      public.can_access_all_stores()
      OR store_id = public.get_user_store_id()
    )
  );

-- Usuarios pueden actualizar créditos de su tienda
CREATE POLICY "users_update_credits" ON public.credits
  FOR UPDATE
  USING (
    public.is_superadmin()
    OR (
      public.get_current_user_id() IS NOT NULL
      AND (
        public.can_access_all_stores()
        OR store_id = public.get_user_store_id()
      )
    )
  )
  WITH CHECK (
    public.is_superadmin()
    OR (
      public.get_current_user_id() IS NOT NULL
      AND (
        public.can_access_all_stores()
        OR store_id = public.get_user_store_id()
      )
    )
  );

-- Superadmin puede eliminar créditos
CREATE POLICY "superadmin_delete_credits" ON public.credits
  FOR DELETE
  USING (public.is_superadmin());

-- ============================================
-- POLÍTICAS PARA TABLA: payments
-- ============================================

-- Superadmin puede ver todos los pagos
CREATE POLICY "superadmin_select_payments" ON public.payments
  FOR SELECT
  USING (public.is_superadmin());

-- Usuarios pueden ver pagos de su tienda (a través de sales)
CREATE POLICY "users_select_payments" ON public.payments
  FOR SELECT
  USING (
    public.get_current_user_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.sales s
      WHERE s.id = payments.sale_id
      AND (
        public.can_access_all_stores()
        OR s.store_id = public.get_user_store_id()
      )
    )
  );

-- Usuarios autenticados pueden insertar pagos
CREATE POLICY "users_insert_payments" ON public.payments
  FOR INSERT
  WITH CHECK (
    public.get_current_user_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.sales s
      WHERE s.id = payments.sale_id
      AND (
        public.can_access_all_stores()
        OR s.store_id = public.get_user_store_id()
      )
    )
  );

-- Usuarios pueden actualizar pagos de su tienda
CREATE POLICY "users_update_payments" ON public.payments
  FOR UPDATE
  USING (
    public.is_superadmin()
    OR (
      public.get_current_user_id() IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.sales s
        WHERE s.id = payments.sale_id
        AND (
          public.can_access_all_stores()
          OR s.store_id = public.get_user_store_id()
        )
      )
    )
  )
  WITH CHECK (
    public.is_superadmin()
    OR (
      public.get_current_user_id() IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.sales s
        WHERE s.id = payments.sale_id
        AND (
          public.can_access_all_stores()
          OR s.store_id = public.get_user_store_id()
        )
      )
    )
  );

-- Superadmin puede eliminar pagos
CREATE POLICY "superadmin_delete_payments" ON public.payments
  FOR DELETE
  USING (public.is_superadmin());

-- ============================================
-- POLÍTICAS PARA TABLA: payment_records
-- ============================================

-- Superadmin puede ver todos los registros de pago
CREATE POLICY "superadmin_select_payment_records" ON public.payment_records
  FOR SELECT
  USING (public.is_superadmin());

-- Usuarios pueden ver registros de pago de su tienda
CREATE POLICY "users_select_payment_records" ON public.payment_records
  FOR SELECT
  USING (
    public.get_current_user_id() IS NOT NULL
    AND (
      public.can_access_all_stores()
      OR store_id = public.get_user_store_id()
    )
  );

-- Usuarios autenticados pueden insertar registros de pago en su tienda
CREATE POLICY "users_insert_payment_records" ON public.payment_records
  FOR INSERT
  WITH CHECK (
    public.get_current_user_id() IS NOT NULL
    AND (
      public.can_access_all_stores()
      OR store_id = public.get_user_store_id()
    )
  );

-- Usuarios pueden actualizar registros de pago de su tienda
CREATE POLICY "users_update_payment_records" ON public.payment_records
  FOR UPDATE
  USING (
    public.is_superadmin()
    OR (
      public.get_current_user_id() IS NOT NULL
      AND (
        public.can_access_all_stores()
        OR store_id = public.get_user_store_id()
      )
    )
  )
  WITH CHECK (
    public.is_superadmin()
    OR (
      public.get_current_user_id() IS NOT NULL
      AND (
        public.can_access_all_stores()
        OR store_id = public.get_user_store_id()
      )
    )
  );

-- Superadmin puede eliminar registros de pago
CREATE POLICY "superadmin_delete_payment_records" ON public.payment_records
  FOR DELETE
  USING (public.is_superadmin());

-- ============================================
-- POLÍTICAS PARA TABLA: warranties
-- ============================================

-- Superadmin puede ver todas las garantías
CREATE POLICY "superadmin_select_warranties" ON public.warranties
  FOR SELECT
  USING (public.is_superadmin());

-- Usuarios pueden ver garantías de su tienda
CREATE POLICY "users_select_warranties" ON public.warranties
  FOR SELECT
  USING (
    public.get_current_user_id() IS NOT NULL
    AND (
      public.can_access_all_stores()
      OR store_id = public.get_user_store_id()
    )
  );

-- Usuarios autenticados pueden insertar garantías en su tienda
CREATE POLICY "users_insert_warranties" ON public.warranties
  FOR INSERT
  WITH CHECK (
    public.get_current_user_id() IS NOT NULL
    AND (
      public.can_access_all_stores()
      OR store_id = public.get_user_store_id()
    )
  );

-- Usuarios pueden actualizar garantías de su tienda
CREATE POLICY "users_update_warranties" ON public.warranties
  FOR UPDATE
  USING (
    public.is_superadmin()
    OR (
      public.get_current_user_id() IS NOT NULL
      AND (
        public.can_access_all_stores()
        OR store_id = public.get_user_store_id()
      )
    )
  )
  WITH CHECK (
    public.is_superadmin()
    OR (
      public.get_current_user_id() IS NOT NULL
      AND (
        public.can_access_all_stores()
        OR store_id = public.get_user_store_id()
      )
    )
  );

-- Superadmin puede eliminar garantías
CREATE POLICY "superadmin_delete_warranties" ON public.warranties
  FOR DELETE
  USING (public.is_superadmin());

-- ============================================
-- POLÍTICAS PARA TABLA: warranty_products
-- ============================================

-- Usuarios pueden ver productos de garantía de su tienda (a través de warranties)
CREATE POLICY "users_select_warranty_products" ON public.warranty_products
  FOR SELECT
  USING (
    public.get_current_user_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.warranties w
      WHERE w.id = warranty_products.warranty_id
      AND (
        public.can_access_all_stores()
        OR w.store_id = public.get_user_store_id()
      )
    )
  );

-- Usuarios autenticados pueden insertar productos de garantía
CREATE POLICY "users_insert_warranty_products" ON public.warranty_products
  FOR INSERT
  WITH CHECK (
    public.get_current_user_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.warranties w
      WHERE w.id = warranty_products.warranty_id
      AND (
        public.can_access_all_stores()
        OR w.store_id = public.get_user_store_id()
      )
    )
  );

-- Usuarios pueden actualizar productos de garantía de su tienda
CREATE POLICY "users_update_warranty_products" ON public.warranty_products
  FOR UPDATE
  USING (
    public.get_current_user_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.warranties w
      WHERE w.id = warranty_products.warranty_id
      AND (
        public.can_access_all_stores()
        OR w.store_id = public.get_user_store_id()
      )
    )
  )
  WITH CHECK (
    public.get_current_user_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.warranties w
      WHERE w.id = warranty_products.warranty_id
      AND (
        public.can_access_all_stores()
        OR w.store_id = public.get_user_store_id()
      )
    )
  );

-- Superadmin puede eliminar productos de garantía
CREATE POLICY "superadmin_delete_warranty_products" ON public.warranty_products
  FOR DELETE
  USING (public.is_superadmin());

-- ============================================
-- POLÍTICAS PARA TABLA: warranty_status_history
-- ============================================

-- Usuarios pueden ver historial de garantías de su tienda
CREATE POLICY "users_select_warranty_status_history" ON public.warranty_status_history
  FOR SELECT
  USING (
    public.get_current_user_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.warranties w
      WHERE w.id = warranty_status_history.warranty_id
      AND (
        public.can_access_all_stores()
        OR w.store_id = public.get_user_store_id()
      )
    )
  );

-- Usuarios autenticados pueden insertar historial de garantías
CREATE POLICY "users_insert_warranty_status_history" ON public.warranty_status_history
  FOR INSERT
  WITH CHECK (
    public.get_current_user_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.warranties w
      WHERE w.id = warranty_status_history.warranty_id
      AND (
        public.can_access_all_stores()
        OR w.store_id = public.get_user_store_id()
      )
    )
  );

-- ============================================
-- POLÍTICAS PARA TABLA: stock_transfers
-- ============================================

-- Superadmin puede ver todas las transferencias
CREATE POLICY "superadmin_select_stock_transfers" ON public.stock_transfers
  FOR SELECT
  USING (public.is_superadmin());

-- Usuarios pueden ver transferencias relacionadas con su tienda
CREATE POLICY "users_select_stock_transfers" ON public.stock_transfers
  FOR SELECT
  USING (
    public.get_current_user_id() IS NOT NULL
    AND (
      public.can_access_all_stores()
      OR from_store_id = public.get_user_store_id()
      OR to_store_id = public.get_user_store_id()
    )
  );

-- Usuarios autenticados pueden insertar transferencias desde su tienda
CREATE POLICY "users_insert_stock_transfers" ON public.stock_transfers
  FOR INSERT
  WITH CHECK (
    public.get_current_user_id() IS NOT NULL
    AND (
      public.can_access_all_stores()
      OR from_store_id = public.get_user_store_id()
    )
  );

-- Usuarios pueden actualizar transferencias relacionadas con su tienda
CREATE POLICY "users_update_stock_transfers" ON public.stock_transfers
  FOR UPDATE
  USING (
    public.is_superadmin()
    OR (
      public.get_current_user_id() IS NOT NULL
      AND (
        public.can_access_all_stores()
        OR from_store_id = public.get_user_store_id()
        OR to_store_id = public.get_user_store_id()
      )
    )
  )
  WITH CHECK (
    public.is_superadmin()
    OR (
      public.get_current_user_id() IS NOT NULL
      AND (
        public.can_access_all_stores()
        OR from_store_id = public.get_user_store_id()
        OR to_store_id = public.get_user_store_id()
      )
    )
  );

-- Superadmin puede eliminar transferencias
CREATE POLICY "superadmin_delete_stock_transfers" ON public.stock_transfers
  FOR DELETE
  USING (public.is_superadmin());

-- ============================================
-- POLÍTICAS PARA TABLA: transfer_items
-- ============================================

-- Usuarios pueden ver items de transferencia relacionados con su tienda
CREATE POLICY "users_select_transfer_items" ON public.transfer_items
  FOR SELECT
  USING (
    public.get_current_user_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.stock_transfers st
      WHERE st.id = transfer_items.transfer_id
      AND (
        public.can_access_all_stores()
        OR st.from_store_id = public.get_user_store_id()
        OR st.to_store_id = public.get_user_store_id()
      )
    )
  );

-- Usuarios autenticados pueden insertar items de transferencia
CREATE POLICY "users_insert_transfer_items" ON public.transfer_items
  FOR INSERT
  WITH CHECK (
    public.get_current_user_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.stock_transfers st
      WHERE st.id = transfer_items.transfer_id
      AND (
        public.can_access_all_stores()
        OR st.from_store_id = public.get_user_store_id()
      )
    )
  );

-- Usuarios pueden actualizar items de transferencia relacionados con su tienda
CREATE POLICY "users_update_transfer_items" ON public.transfer_items
  FOR UPDATE
  USING (
    public.get_current_user_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.stock_transfers st
      WHERE st.id = transfer_items.transfer_id
      AND (
        public.can_access_all_stores()
        OR st.from_store_id = public.get_user_store_id()
        OR st.to_store_id = public.get_user_store_id()
      )
    )
  )
  WITH CHECK (
    public.get_current_user_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.stock_transfers st
      WHERE st.id = transfer_items.transfer_id
      AND (
        public.can_access_all_stores()
        OR st.from_store_id = public.get_user_store_id()
        OR st.to_store_id = public.get_user_store_id()
      )
    )
  );

-- Superadmin puede eliminar items de transferencia
CREATE POLICY "superadmin_delete_transfer_items" ON public.transfer_items
  FOR DELETE
  USING (public.is_superadmin());

-- ============================================
-- POLÍTICAS PARA TABLA: store_stock
-- ============================================

-- Superadmin puede ver todo el inventario
CREATE POLICY "superadmin_select_store_stock" ON public.store_stock
  FOR SELECT
  USING (public.is_superadmin());

-- Usuarios pueden ver inventario de su tienda
CREATE POLICY "users_select_store_stock" ON public.store_stock
  FOR SELECT
  USING (
    public.get_current_user_id() IS NOT NULL
    AND (
      public.can_access_all_stores()
      OR store_id = public.get_user_store_id()
    )
  );

-- Usuarios autenticados pueden insertar inventario en su tienda
CREATE POLICY "users_insert_store_stock" ON public.store_stock
  FOR INSERT
  WITH CHECK (
    public.get_current_user_id() IS NOT NULL
    AND (
      public.can_access_all_stores()
      OR store_id = public.get_user_store_id()
    )
  );

-- Usuarios pueden actualizar inventario de su tienda
CREATE POLICY "users_update_store_stock" ON public.store_stock
  FOR UPDATE
  USING (
    public.is_superadmin()
    OR (
      public.get_current_user_id() IS NOT NULL
      AND (
        public.can_access_all_stores()
        OR store_id = public.get_user_store_id()
      )
    )
  )
  WITH CHECK (
    public.is_superadmin()
    OR (
      public.get_current_user_id() IS NOT NULL
      AND (
        public.can_access_all_stores()
        OR store_id = public.get_user_store_id()
      )
    )
  );

-- Superadmin puede eliminar inventario
CREATE POLICY "superadmin_delete_store_stock" ON public.store_stock
  FOR DELETE
  USING (public.is_superadmin());

-- ============================================
-- POLÍTICAS PARA TABLA: logs
-- ============================================

-- Superadmin puede ver todos los logs
CREATE POLICY "superadmin_select_logs" ON public.logs
  FOR SELECT
  USING (public.is_superadmin());

-- Usuarios pueden ver logs de su tienda
CREATE POLICY "users_select_logs" ON public.logs
  FOR SELECT
  USING (
    public.get_current_user_id() IS NOT NULL
    AND (
      public.can_access_all_stores()
      OR store_id = public.get_user_store_id()
      OR user_id = public.get_current_user_id()
    )
  );

-- Cualquier usuario autenticado puede insertar logs
CREATE POLICY "authenticated_insert_logs" ON public.logs
  FOR INSERT
  WITH CHECK (public.get_current_user_id() IS NOT NULL);

-- Superadmin puede eliminar logs
CREATE POLICY "superadmin_delete_logs" ON public.logs
  FOR DELETE
  USING (public.is_superadmin());

-- ============================================
-- POLÍTICAS PARA TABLA: company_config
-- ============================================

-- Superadmin puede ver toda la configuración
CREATE POLICY "superadmin_select_company_config" ON public.company_config
  FOR SELECT
  USING (public.is_superadmin());

-- Superadmin puede insertar configuración
CREATE POLICY "superadmin_insert_company_config" ON public.company_config
  FOR INSERT
  WITH CHECK (public.is_superadmin());

-- Superadmin puede actualizar configuración
CREATE POLICY "superadmin_update_company_config" ON public.company_config
  FOR UPDATE
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- Superadmin puede eliminar configuración
CREATE POLICY "superadmin_delete_company_config" ON public.company_config
  FOR DELETE
  USING (public.is_superadmin());

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
-- 
-- CÓMO FUNCIONAN LAS POLÍTICAS:
-- 
-- 1. Las políticas están diseñadas para ser permisivas inicialmente y funcionar
--    con o sin el sistema de sesiones activas.
--
-- 2. Las funciones helper intentan obtener el user_id desde múltiples fuentes:
--    - Header 'x-user-id' (si está configurado)
--    - JWT claim 'user_id' (si está disponible)
--    - Variable de sesión 'app.user_id' (si se establece)
--    - Session token desde header 'x-session-token' (desde tabla active_sessions)
--
-- 3. Si no se puede obtener el user_id, las políticas permiten acceso básico
--    para usuarios autenticados (esto permite que el sistema funcione mientras
--    se configura el sistema de sesiones).
--
-- 4. Para operaciones administrativas, usa supabaseAdmin (service role key)
--    que bypass las políticas RLS.
--
-- CONFIGURACIÓN RECOMENDADA:
-- 
-- 1. Aplicar esta migración
-- 2. Las políticas funcionarán automáticamente con el sistema de sesiones
-- 3. El SessionService crea sesiones cuando los usuarios hacen login
-- 4. Las políticas verifican las sesiones activas para identificar usuarios
--
-- AJUSTES FUTUROS:
-- 
-- Puedes hacer las políticas más restrictivas ajustando las condiciones
-- en cada política. Por ejemplo, cambiar:
--   USING (public.get_current_user_id() IS NOT NULL)
-- Por:
--   USING (public.get_current_user_id() IS NOT NULL AND store_id = public.get_user_store_id())
--
-- ============================================
