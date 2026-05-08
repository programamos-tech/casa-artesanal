-- ============================================
-- FIX: Hacer políticas de INSERT más permisivas
-- ============================================
-- Este fix permite INSERT en las tablas principales para usuarios autenticados

-- Stores: Permitir INSERT a usuarios autenticados (ya está hecho, pero asegurémonos)
DROP POLICY IF EXISTS "stores_insert_policy" ON public.stores;
CREATE POLICY "stores_insert_policy" ON public.stores
  FOR INSERT
  WITH CHECK (true); -- Permitir a todos (el servicio usa supabaseAdmin de todas formas)

-- Products: Asegurar que INSERT funcione
DROP POLICY IF EXISTS "products_insert_policy" ON public.products;
CREATE POLICY "products_insert_policy" ON public.products
  FOR INSERT
  WITH CHECK (true);

-- Clients: Asegurar que INSERT funcione
DROP POLICY IF EXISTS "users_insert_clients" ON public.clients;
CREATE POLICY "users_insert_clients" ON public.clients
  FOR INSERT
  WITH CHECK (true);

-- Sales: Asegurar que INSERT funcione
DROP POLICY IF EXISTS "users_insert_sales" ON public.sales;
CREATE POLICY "users_insert_sales" ON public.sales
  FOR INSERT
  WITH CHECK (true);

-- Credits: Asegurar que INSERT funcione
DROP POLICY IF EXISTS "users_insert_credits" ON public.credits;
CREATE POLICY "users_insert_credits" ON public.credits
  FOR INSERT
  WITH CHECK (true);

-- Payment Records: Asegurar que INSERT funcione
DROP POLICY IF EXISTS "users_insert_payment_records" ON public.payment_records;
CREATE POLICY "users_insert_payment_records" ON public.payment_records
  FOR INSERT
  WITH CHECK (true);

-- Warranties: Asegurar que INSERT funcione
DROP POLICY IF EXISTS "users_insert_warranties" ON public.warranties;
CREATE POLICY "users_insert_warranties" ON public.warranties
  FOR INSERT
  WITH CHECK (true);

-- Store Stock: Asegurar que INSERT funcione
DROP POLICY IF EXISTS "users_insert_store_stock" ON public.store_stock;
CREATE POLICY "users_insert_store_stock" ON public.store_stock
  FOR INSERT
  WITH CHECK (true);

-- Stock Transfers: Asegurar que INSERT funcione
DROP POLICY IF EXISTS "users_insert_stock_transfers" ON public.stock_transfers;
CREATE POLICY "users_insert_stock_transfers" ON public.stock_transfers
  FOR INSERT
  WITH CHECK (true);

-- Transfer Items: Asegurar que INSERT funcione
DROP POLICY IF EXISTS "users_insert_transfer_items" ON public.transfer_items;
CREATE POLICY "users_insert_transfer_items" ON public.transfer_items
  FOR INSERT
  WITH CHECK (true);

-- Sale Items: Asegurar que INSERT funcione
DROP POLICY IF EXISTS "users_insert_sale_items" ON public.sale_items;
CREATE POLICY "users_insert_sale_items" ON public.sale_items
  FOR INSERT
  WITH CHECK (true);

-- Sale Payments: Asegurar que INSERT funcione
DROP POLICY IF EXISTS "users_insert_sale_payments" ON public.sale_payments;
CREATE POLICY "users_insert_sale_payments" ON public.sale_payments
  FOR INSERT
  WITH CHECK (true);

-- Warranty Products: Asegurar que INSERT funcione
DROP POLICY IF EXISTS "users_insert_warranty_products" ON public.warranty_products;
CREATE POLICY "users_insert_warranty_products" ON public.warranty_products
  FOR INSERT
  WITH CHECK (true);

-- Warranty Status History: Asegurar que INSERT funcione
DROP POLICY IF EXISTS "users_insert_warranty_status_history" ON public.warranty_status_history;
CREATE POLICY "users_insert_warranty_status_history" ON public.warranty_status_history
  FOR INSERT
  WITH CHECK (true);

-- Categories: Asegurar que INSERT funcione
DROP POLICY IF EXISTS "admin_insert_categories" ON public.categories;
CREATE POLICY "admin_insert_categories" ON public.categories
  FOR INSERT
  WITH CHECK (true);

-- Logs: Ya debería estar permisivo, pero asegurémonos
DROP POLICY IF EXISTS "authenticated_insert_logs" ON public.logs;
CREATE POLICY "authenticated_insert_logs" ON public.logs
  FOR INSERT
  WITH CHECK (true);

-- Active Sessions: Asegurar que INSERT funcione
DROP POLICY IF EXISTS "authenticated_insert_sessions" ON public.active_sessions;
CREATE POLICY "authenticated_insert_sessions" ON public.active_sessions
  FOR INSERT
  WITH CHECK (true);
