-- Proveedores y cuentas por pagar (facturas de proveedores + abonos)

CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact TEXT,
  phone TEXT,
  email TEXT,
  document TEXT,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_store_id ON public.suppliers(store_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON public.suppliers(store_id, is_active);

CREATE TABLE IF NOT EXISTS public.supplier_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  invoice_number TEXT NOT NULL,
  issue_date DATE NOT NULL,
  due_date DATE,
  total_amount NUMERIC(14,2) NOT NULL CHECK (total_amount >= 0),
  paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'cancelled')),
  image_url TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_invoices_store_id ON public.supplier_invoices(store_id);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_supplier_id ON public.supplier_invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_status ON public.supplier_invoices(store_id, status);

CREATE TABLE IF NOT EXISTS public.supplier_payment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.supplier_invoices(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  payment_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'transfer', 'card')),
  notes TEXT,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_payment_records_invoice ON public.supplier_payment_records(invoice_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payment_records_store ON public.supplier_payment_records(store_id);

-- Recalcular paid_amount y status desde abonos activos
CREATE OR REPLACE FUNCTION public.refresh_supplier_invoice_totals(p_invoice_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_total NUMERIC(14,2);
  v_paid NUMERIC(14,2);
  v_inv_status TEXT;
BEGIN
  SELECT si.total_amount, si.status INTO v_total, v_inv_status
  FROM public.supplier_invoices si
  WHERE si.id = p_invoice_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_inv_status = 'cancelled' THEN
    UPDATE public.supplier_invoices
    SET
      paid_amount = COALESCE((
        SELECT SUM(spr.amount)
        FROM public.supplier_payment_records spr
        WHERE spr.invoice_id = p_invoice_id AND spr.status = 'active'
      ), 0),
      updated_at = now()
    WHERE id = p_invoice_id;
    RETURN;
  END IF;

  v_paid := COALESCE((
    SELECT SUM(spr.amount)
    FROM public.supplier_payment_records spr
    WHERE spr.invoice_id = p_invoice_id AND spr.status = 'active'
  ), 0);

  UPDATE public.supplier_invoices
  SET
    paid_amount = v_paid,
    status = CASE
      WHEN v_paid >= v_total AND v_total > 0 THEN 'paid'
      WHEN v_paid > 0 THEN 'partial'
      ELSE 'pending'
    END,
    updated_at = now()
  WHERE id = p_invoice_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_supplier_payment_refresh_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  inv_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    inv_id := OLD.invoice_id;
  ELSE
    inv_id := NEW.invoice_id;
  END IF;
  PERFORM public.refresh_supplier_invoice_totals(inv_id);
  IF TG_OP = 'UPDATE' AND OLD.invoice_id IS DISTINCT FROM NEW.invoice_id THEN
    PERFORM public.refresh_supplier_invoice_totals(OLD.invoice_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS supplier_payment_records_refresh ON public.supplier_payment_records;
CREATE TRIGGER supplier_payment_records_refresh
  AFTER INSERT OR UPDATE OR DELETE ON public.supplier_payment_records
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_supplier_payment_refresh_invoice();

-- RLS deshabilitado en tablas (coherente con 20260110000008_remove_all_rls_policies)
ALTER TABLE public.suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_payment_records DISABLE ROW LEVEL SECURITY;

-- Bucket para comprobantes (10MB; imágenes)
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'supplier-invoices',
      'supplier-invoices',
      true,
      10485760,
      ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']::text[]
    )
    ON CONFLICT (id) DO UPDATE SET
      public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;
  END IF;

  IF to_regclass('storage.objects') IS NOT NULL THEN
    DROP POLICY IF EXISTS "supplier_invoices_storage_read" ON storage.objects;
    DROP POLICY IF EXISTS "supplier_invoices_storage_insert" ON storage.objects;
    DROP POLICY IF EXISTS "supplier_invoices_storage_update" ON storage.objects;
    DROP POLICY IF EXISTS "supplier_invoices_storage_delete" ON storage.objects;

    EXECUTE 'CREATE POLICY "supplier_invoices_storage_read"
      ON storage.objects FOR SELECT
      USING (bucket_id = ''supplier-invoices'')';

    EXECUTE 'CREATE POLICY "supplier_invoices_storage_insert"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = ''supplier-invoices'')';

    EXECUTE 'CREATE POLICY "supplier_invoices_storage_update"
      ON storage.objects FOR UPDATE
      USING (bucket_id = ''supplier-invoices'')';

    EXECUTE 'CREATE POLICY "supplier_invoices_storage_delete"
      ON storage.objects FOR DELETE
      USING (bucket_id = ''supplier-invoices'')';
  END IF;
END $$;

GRANT ALL ON TABLE public.suppliers TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.supplier_invoices TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.supplier_payment_records TO anon, authenticated, service_role;
