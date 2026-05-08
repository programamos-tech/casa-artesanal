-- Agregar estado 'partially_received' a stock_transfers
ALTER TABLE "public"."stock_transfers"
DROP CONSTRAINT IF EXISTS "stock_transfers_status_check";

ALTER TABLE "public"."stock_transfers"
ADD CONSTRAINT "stock_transfers_status_check" 
CHECK (("status"::text = ANY ((ARRAY['pending'::character varying, 'in_transit'::character varying, 'received'::character varying, 'partially_received'::character varying, 'cancelled'::character varying])::text[])));

COMMENT ON COLUMN "public"."stock_transfers"."status" IS 'Estado de la transferencia: pending, in_transit, received, partially_received, cancelled';
