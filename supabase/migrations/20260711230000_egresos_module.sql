-- Módulo de egresos operativos del negocio (arriendo, servicios, nómina, etc.)

CREATE TABLE IF NOT EXISTS public.egresos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  concept TEXT NOT NULL,
  concept_other TEXT,
  description TEXT,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  expense_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  payment_method TEXT NOT NULL DEFAULT 'cash'
    CHECK (payment_method IN ('cash', 'transfer', 'nequi', 'bancolombia', 'card', 'other')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'cancelled')),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_by_name TEXT NOT NULL DEFAULT '',
  cancelled_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  cancelled_by_name TEXT,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT egresos_concept_other_required CHECK (
    (concept <> 'otro') OR (concept_other IS NOT NULL AND length(trim(concept_other)) > 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_egresos_store_id ON public.egresos(store_id);
CREATE INDEX IF NOT EXISTS idx_egresos_expense_date ON public.egresos(store_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_egresos_status ON public.egresos(store_id, status);
CREATE INDEX IF NOT EXISTS idx_egresos_concept ON public.egresos(store_id, concept);

COMMENT ON TABLE public.egresos IS 'Egresos operativos del negocio (arriendo, servicios, nómina, deudas, etc.)';
