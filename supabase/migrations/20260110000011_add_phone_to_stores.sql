-- Agregar teléfono a la tabla stores (para facturas e información de la tienda)
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

COMMENT ON COLUMN public.stores.phone IS 'Teléfono de contacto de la tienda';
