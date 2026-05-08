


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";





SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "status" character varying(50) DEFAULT 'active'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "categories_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'inactive'::character varying])::"text"[])))
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "email" character varying(255),
    "phone" character varying(50),
    "document" character varying(50) NOT NULL,
    "document_number" character varying(50),
    "address" "text",
    "city" character varying(100),
    "state" character varying(100),
    "postal_code" character varying(20),
    "country" character varying(255) DEFAULT 'Colombia'::character varying,
    "type" character varying(50) DEFAULT 'individual'::character varying NOT NULL,
    "credit_limit" numeric(15,2) DEFAULT 0,
    "current_debt" numeric(15,2) DEFAULT 0,
    "status" character varying(50) DEFAULT 'active'::character varying,
    "is_active" boolean DEFAULT true,
    "notes" "text",
    "created_by" "uuid",
    "created_by_name" character varying(255),
    "assigned_to" "uuid",
    "assigned_to_name" character varying(255),
    "preferences" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "clients_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'suspended'::character varying])::"text"[]))),
    CONSTRAINT "clients_type_check" CHECK ((("type")::"text" = ANY ((ARRAY['mayorista'::character varying, 'minorista'::character varying, 'consumidor_final'::character varying, 'individual'::character varying])::"text"[])))
);


ALTER TABLE "public"."clients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" character varying(255) NOT NULL,
    "value" "text",
    "nit" character varying(50),
    "name" character varying(255),
    "address" "text",
    "phone" character varying(50),
    "email" character varying(255),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."company_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."credits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sale_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "client_name" character varying(255) NOT NULL,
    "invoice_number" character varying(100),
    "total_amount" numeric(15,2) NOT NULL,
    "paid_amount" numeric(15,2) DEFAULT 0,
    "pending_amount" numeric(15,2) NOT NULL,
    "subtotal" numeric(15,2) DEFAULT 0,
    "discount_percentage" numeric(5,2) DEFAULT 0.00,
    "discount_amount" numeric(15,2) DEFAULT 0.00,
    "tax_percentage" numeric(5,2) DEFAULT 0.00,
    "tax_amount" numeric(15,2) DEFAULT 0.00,
    "status" character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    "due_date" timestamp with time zone,
    "interest_rate" numeric(5,2) DEFAULT 0.00,
    "payment_frequency" character varying(50) DEFAULT 'monthly'::character varying,
    "minimum_payment" numeric(15,2) DEFAULT 0.00,
    "last_payment_date" timestamp with time zone,
    "last_payment_amount" numeric(15,2) DEFAULT 0.00,
    "last_payment_user" "uuid",
    "next_payment_date" timestamp with time zone,
    "total_paid" numeric(15,2) DEFAULT 0.00,
    "payment_count" integer DEFAULT 0,
    "is_overdue" boolean DEFAULT false,
    "overdue_days" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "is_cancelled" boolean DEFAULT false,
    "cancelled_at" timestamp with time zone,
    "cancelled_by" "uuid",
    "cancelled_by_name" character varying(255),
    "cancellation_reason" "text",
    "created_by" "uuid",
    "created_by_name" character varying(255),
    "updated_by" "uuid",
    "updated_by_name" character varying(255),
    "notes" "text",
    "credit_score" integer,
    "risk_level" character varying(50) DEFAULT 'medium'::character varying,
    "tags" "text"[],
    "metadata" "jsonb",
    "payment_method" character varying(50) DEFAULT 'credit'::character varying,
    "payment_terms" character varying(255),
    "currency" character varying(10) DEFAULT 'COP'::character varying,
    "exchange_rate" numeric(10,4) DEFAULT 1.0000,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "credits_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'partial'::character varying, 'completed'::character varying, 'overdue'::character varying, 'cancelled'::character varying])::"text"[])))
);


ALTER TABLE "public"."credits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "action" character varying(100) NOT NULL,
    "module" character varying(100) NOT NULL,
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "payment_id" "uuid" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "payment_date" timestamp with time zone DEFAULT "now"(),
    "payment_method" character varying(50) NOT NULL,
    "description" "text",
    "user_id" "uuid" NOT NULL,
    "user_name" character varying(255) NOT NULL,
    "status" character varying(20) DEFAULT 'active'::character varying,
    "cancelled_at" timestamp with time zone,
    "cancelled_by" "uuid",
    "cancelled_by_name" character varying(255),
    "cancellation_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "payment_records_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "payment_records_payment_method_check" CHECK ((("payment_method")::"text" = ANY ((ARRAY['cash'::character varying, 'transfer'::character varying, 'card'::character varying])::"text"[]))),
    CONSTRAINT "payment_records_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'cancelled'::character varying])::"text"[])))
);


ALTER TABLE "public"."payment_records" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sale_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "client_name" character varying(255) NOT NULL,
    "invoice_number" character varying(50) NOT NULL,
    "total_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "paid_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "pending_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "last_payment_amount" numeric(12,2),
    "last_payment_date" timestamp with time zone,
    "last_payment_user" character varying(255),
    "status" character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    "due_date" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "cancelled_by" "uuid",
    "cancelled_by_name" character varying(255),
    "cancellation_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "payments_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'partial'::character varying, 'completed'::character varying, 'overdue'::character varying, 'active'::character varying, 'cancelled'::character varying])::"text"[])))
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "category_id" "uuid",
    "brand" character varying(255),
    "reference" character varying(100) NOT NULL,
    "price" numeric(15,2) NOT NULL,
    "cost" numeric(15,2) NOT NULL,
    "stock_warehouse" integer DEFAULT 0,
    "stock_store" integer DEFAULT 0,
    "status" character varying(50) DEFAULT 'active'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "products_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'discontinued'::character varying])::"text"[])))
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "permissions" "jsonb" DEFAULT '[]'::"jsonb",
    "is_system" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sale_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sale_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "product_name" character varying(255) NOT NULL,
    "product_reference_code" character varying(100),
    "quantity" integer NOT NULL,
    "unit_price" numeric(12,2) NOT NULL,
    "discount" numeric(12,2) DEFAULT 0,
    "discount_type" character varying(20) DEFAULT 'amount'::character varying,
    "total" numeric(12,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "sale_items_discount_type_check" CHECK ((("discount_type")::"text" = ANY ((ARRAY['amount'::character varying, 'percentage'::character varying])::"text"[]))),
    CONSTRAINT "sale_items_quantity_check" CHECK (("quantity" > 0)),
    CONSTRAINT "sale_items_total_check" CHECK (("total" >= (0)::numeric)),
    CONSTRAINT "sale_items_unit_price_check" CHECK (("unit_price" >= (0)::numeric))
);


ALTER TABLE "public"."sale_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sale_payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sale_id" "uuid" NOT NULL,
    "payment_type" character varying(50) NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "sale_payments_payment_type_check" CHECK ((("payment_type")::"text" = ANY ((ARRAY['cash'::character varying, 'transfer'::character varying, 'credit'::character varying])::"text"[])))
);


ALTER TABLE "public"."sale_payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sales" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "client_name" character varying(255) NOT NULL,
    "total" numeric(12,2) DEFAULT 0 NOT NULL,
    "subtotal" numeric(12,2) DEFAULT 0 NOT NULL,
    "tax" numeric(12,2) DEFAULT 0 NOT NULL,
    "discount" numeric(12,2) DEFAULT 0 NOT NULL,
    "status" character varying(50) DEFAULT 'completed'::character varying NOT NULL,
    "payment_method" character varying(50) NOT NULL,
    "invoice_number" character varying(50),
    "seller_id" "text",
    "seller_name" "text",
    "seller_email" "text",
    "cancellation_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "sales_payment_method_check" CHECK ((("payment_method")::"text" = ANY ((ARRAY['cash'::character varying, 'credit'::character varying, 'transfer'::character varying, 'warranty'::character varying, 'mixed'::character varying])::"text"[]))),
    CONSTRAINT "sales_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'completed'::character varying, 'cancelled'::character varying, 'draft'::character varying])::"text"[])))
);


ALTER TABLE "public"."sales" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "email" character varying(255) NOT NULL,
    "password" character varying(255) NOT NULL,
    "role" character varying(100) NOT NULL,
    "permissions" "jsonb" DEFAULT '[]'::"jsonb",
    "is_active" boolean DEFAULT true,
    "last_login" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."warranties" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "original_sale_id" "uuid",
    "client_id" "uuid",
    "client_name" character varying(255) NOT NULL,
    "product_received_id" "uuid" NOT NULL,
    "product_received_name" character varying(255) NOT NULL,
    "product_received_serial" character varying(255),
    "product_delivered_id" "uuid",
    "product_delivered_name" character varying(255),
    "reason" "text" NOT NULL,
    "status" character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "created_by" "uuid",
    "quantity_received" integer DEFAULT 1,
    "quantity_delivered" integer DEFAULT 1,
    CONSTRAINT "warranties_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'rejected'::character varying, 'discarded'::character varying])::"text"[])))
);


ALTER TABLE "public"."warranties" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."warranty_products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "warranty_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "serial_number" character varying(255),
    "condition" character varying(50) DEFAULT 'defective'::character varying NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "warranty_products_condition_check" CHECK ((("condition")::"text" = ANY ((ARRAY['defective'::character varying, 'repaired'::character varying, 'discarded'::character varying])::"text"[])))
);


ALTER TABLE "public"."warranty_products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."warranty_status_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "warranty_id" "uuid" NOT NULL,
    "previous_status" character varying(50),
    "new_status" character varying(50) NOT NULL,
    "notes" "text",
    "changed_by" "uuid",
    "changed_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."warranty_status_history" OWNER TO "postgres";


ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_document_key" UNIQUE ("document");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_config"
    ADD CONSTRAINT "company_config_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."company_config"
    ADD CONSTRAINT "company_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."credits"
    ADD CONSTRAINT "credits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."logs"
    ADD CONSTRAINT "logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_records"
    ADD CONSTRAINT "payment_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_reference_key" UNIQUE ("reference");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sale_items"
    ADD CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sale_payments"
    ADD CONSTRAINT "sale_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."warranties"
    ADD CONSTRAINT "warranties_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."warranty_products"
    ADD CONSTRAINT "warranty_products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."warranty_status_history"
    ADD CONSTRAINT "warranty_status_history_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_categories_name" ON "public"."categories" USING "btree" ("name");



CREATE INDEX "idx_categories_status" ON "public"."categories" USING "btree" ("status");



CREATE INDEX "idx_clients_document" ON "public"."clients" USING "btree" ("document");



CREATE INDEX "idx_clients_email" ON "public"."clients" USING "btree" ("email");



CREATE INDEX "idx_clients_is_active" ON "public"."clients" USING "btree" ("is_active");



CREATE INDEX "idx_clients_phone" ON "public"."clients" USING "btree" ("phone");



CREATE INDEX "idx_clients_status" ON "public"."clients" USING "btree" ("status");



CREATE INDEX "idx_clients_type" ON "public"."clients" USING "btree" ("type");



CREATE INDEX "idx_company_config_email" ON "public"."company_config" USING "btree" ("email");



CREATE INDEX "idx_company_config_key" ON "public"."company_config" USING "btree" ("key");



CREATE INDEX "idx_company_config_nit" ON "public"."company_config" USING "btree" ("nit");



CREATE INDEX "idx_credits_cancelled_at" ON "public"."credits" USING "btree" ("cancelled_at");



CREATE INDEX "idx_credits_client_id" ON "public"."credits" USING "btree" ("client_id");



CREATE INDEX "idx_credits_created_by" ON "public"."credits" USING "btree" ("created_by");



CREATE INDEX "idx_credits_due_date" ON "public"."credits" USING "btree" ("due_date");



CREATE INDEX "idx_credits_invoice_number" ON "public"."credits" USING "btree" ("invoice_number");



CREATE INDEX "idx_credits_is_active" ON "public"."credits" USING "btree" ("is_active");



CREATE INDEX "idx_credits_is_cancelled" ON "public"."credits" USING "btree" ("is_cancelled");



CREATE INDEX "idx_credits_is_overdue" ON "public"."credits" USING "btree" ("is_overdue");



CREATE INDEX "idx_credits_sale_id" ON "public"."credits" USING "btree" ("sale_id");



CREATE INDEX "idx_credits_status" ON "public"."credits" USING "btree" ("status");



CREATE INDEX "idx_logs_created_at" ON "public"."logs" USING "btree" ("created_at");



CREATE INDEX "idx_logs_module" ON "public"."logs" USING "btree" ("module");



CREATE INDEX "idx_logs_user_id" ON "public"."logs" USING "btree" ("user_id");



CREATE INDEX "idx_payment_records_payment_id" ON "public"."payment_records" USING "btree" ("payment_id");



CREATE INDEX "idx_payment_records_status" ON "public"."payment_records" USING "btree" ("status");



CREATE INDEX "idx_payment_records_user_id" ON "public"."payment_records" USING "btree" ("user_id");



CREATE INDEX "idx_payments_client_id" ON "public"."payments" USING "btree" ("client_id");



CREATE INDEX "idx_payments_sale_id" ON "public"."payments" USING "btree" ("sale_id");



CREATE INDEX "idx_payments_status" ON "public"."payments" USING "btree" ("status");



CREATE INDEX "idx_products_category_id" ON "public"."products" USING "btree" ("category_id");



CREATE INDEX "idx_products_reference" ON "public"."products" USING "btree" ("reference");



CREATE INDEX "idx_products_status" ON "public"."products" USING "btree" ("status");



CREATE INDEX "idx_sale_items_product_id" ON "public"."sale_items" USING "btree" ("product_id");



CREATE INDEX "idx_sale_items_sale_id" ON "public"."sale_items" USING "btree" ("sale_id");



CREATE INDEX "idx_sales_client_id" ON "public"."sales" USING "btree" ("client_id");



CREATE INDEX "idx_sales_created_at" ON "public"."sales" USING "btree" ("created_at");



CREATE INDEX "idx_sales_invoice_number" ON "public"."sales" USING "btree" ("invoice_number");



CREATE INDEX "idx_sales_status" ON "public"."sales" USING "btree" ("status");



CREATE INDEX "idx_users_email" ON "public"."users" USING "btree" ("email");



CREATE INDEX "idx_users_is_active" ON "public"."users" USING "btree" ("is_active");



CREATE INDEX "idx_users_role" ON "public"."users" USING "btree" ("role");



CREATE INDEX "idx_warranties_client_id" ON "public"."warranties" USING "btree" ("client_id");



CREATE INDEX "idx_warranties_created_at" ON "public"."warranties" USING "btree" ("created_at");



CREATE INDEX "idx_warranties_original_sale_id" ON "public"."warranties" USING "btree" ("original_sale_id");



CREATE INDEX "idx_warranties_status" ON "public"."warranties" USING "btree" ("status");



ALTER TABLE ONLY "public"."credits"
    ADD CONSTRAINT "fk_credits_client_id" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."credits"
    ADD CONSTRAINT "fk_credits_sale_id" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."logs"
    ADD CONSTRAINT "fk_logs_user_id" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payment_records"
    ADD CONSTRAINT "fk_payment_records_payment_id" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_records"
    ADD CONSTRAINT "fk_payment_records_user_id" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "fk_payments_client_id" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "fk_payments_sale_id" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "fk_products_category_id" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sale_items"
    ADD CONSTRAINT "fk_sale_items_product_id" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sale_items"
    ADD CONSTRAINT "fk_sale_items_sale_id" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sale_payments"
    ADD CONSTRAINT "fk_sale_payments_sale_id" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "fk_sales_client_id" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."warranties"
    ADD CONSTRAINT "fk_warranties_client_id" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."warranties"
    ADD CONSTRAINT "fk_warranties_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."warranties"
    ADD CONSTRAINT "fk_warranties_original_sale_id" FOREIGN KEY ("original_sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."warranties"
    ADD CONSTRAINT "fk_warranties_product_delivered_id" FOREIGN KEY ("product_delivered_id") REFERENCES "public"."products"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."warranties"
    ADD CONSTRAINT "fk_warranties_product_received_id" FOREIGN KEY ("product_received_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."warranty_products"
    ADD CONSTRAINT "fk_warranty_products_product_id" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."warranty_products"
    ADD CONSTRAINT "fk_warranty_products_warranty_id" FOREIGN KEY ("warranty_id") REFERENCES "public"."warranties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."warranty_status_history"
    ADD CONSTRAINT "fk_warranty_status_history_changed_by" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."warranty_status_history"
    ADD CONSTRAINT "fk_warranty_status_history_warranty_id" FOREIGN KEY ("warranty_id") REFERENCES "public"."warranties"("id") ON DELETE CASCADE;





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";








































































































































































GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."clients" TO "anon";
GRANT ALL ON TABLE "public"."clients" TO "authenticated";
GRANT ALL ON TABLE "public"."clients" TO "service_role";



GRANT ALL ON TABLE "public"."company_config" TO "anon";
GRANT ALL ON TABLE "public"."company_config" TO "authenticated";
GRANT ALL ON TABLE "public"."company_config" TO "service_role";



GRANT ALL ON TABLE "public"."credits" TO "anon";
GRANT ALL ON TABLE "public"."credits" TO "authenticated";
GRANT ALL ON TABLE "public"."credits" TO "service_role";



GRANT ALL ON TABLE "public"."logs" TO "anon";
GRANT ALL ON TABLE "public"."logs" TO "authenticated";
GRANT ALL ON TABLE "public"."logs" TO "service_role";



GRANT ALL ON TABLE "public"."payment_records" TO "anon";
GRANT ALL ON TABLE "public"."payment_records" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_records" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."roles" TO "anon";
GRANT ALL ON TABLE "public"."roles" TO "authenticated";
GRANT ALL ON TABLE "public"."roles" TO "service_role";



GRANT ALL ON TABLE "public"."sale_items" TO "anon";
GRANT ALL ON TABLE "public"."sale_items" TO "authenticated";
GRANT ALL ON TABLE "public"."sale_items" TO "service_role";



GRANT ALL ON TABLE "public"."sale_payments" TO "anon";
GRANT ALL ON TABLE "public"."sale_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."sale_payments" TO "service_role";



GRANT ALL ON TABLE "public"."sales" TO "anon";
GRANT ALL ON TABLE "public"."sales" TO "authenticated";
GRANT ALL ON TABLE "public"."sales" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."warranties" TO "anon";
GRANT ALL ON TABLE "public"."warranties" TO "authenticated";
GRANT ALL ON TABLE "public"."warranties" TO "service_role";



GRANT ALL ON TABLE "public"."warranty_products" TO "anon";
GRANT ALL ON TABLE "public"."warranty_products" TO "authenticated";
GRANT ALL ON TABLE "public"."warranty_products" TO "service_role";



GRANT ALL ON TABLE "public"."warranty_status_history" TO "anon";
GRANT ALL ON TABLE "public"."warranty_status_history" TO "authenticated";
GRANT ALL ON TABLE "public"."warranty_status_history" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

alter table "public"."categories" drop constraint "categories_status_check";

alter table "public"."clients" drop constraint "clients_status_check";

alter table "public"."clients" drop constraint "clients_type_check";

alter table "public"."credits" drop constraint "credits_status_check";

alter table "public"."payment_records" drop constraint "payment_records_payment_method_check";

alter table "public"."payment_records" drop constraint "payment_records_status_check";

alter table "public"."payments" drop constraint "payments_status_check";

alter table "public"."products" drop constraint "products_status_check";

alter table "public"."sale_items" drop constraint "sale_items_discount_type_check";

alter table "public"."sale_payments" drop constraint "sale_payments_payment_type_check";

alter table "public"."sales" drop constraint "sales_payment_method_check";

alter table "public"."sales" drop constraint "sales_status_check";

alter table "public"."warranties" drop constraint "warranties_status_check";

alter table "public"."warranty_products" drop constraint "warranty_products_condition_check";

alter table "public"."categories" add constraint "categories_status_check" CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying])::text[]))) not valid;

alter table "public"."categories" validate constraint "categories_status_check";

alter table "public"."clients" add constraint "clients_status_check" CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'suspended'::character varying])::text[]))) not valid;

alter table "public"."clients" validate constraint "clients_status_check";

alter table "public"."clients" add constraint "clients_type_check" CHECK (((type)::text = ANY ((ARRAY['mayorista'::character varying, 'minorista'::character varying, 'consumidor_final'::character varying, 'individual'::character varying])::text[]))) not valid;

alter table "public"."clients" validate constraint "clients_type_check";

alter table "public"."credits" add constraint "credits_status_check" CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'partial'::character varying, 'completed'::character varying, 'overdue'::character varying, 'cancelled'::character varying])::text[]))) not valid;

alter table "public"."credits" validate constraint "credits_status_check";

alter table "public"."payment_records" add constraint "payment_records_payment_method_check" CHECK (((payment_method)::text = ANY ((ARRAY['cash'::character varying, 'transfer'::character varying, 'card'::character varying])::text[]))) not valid;

alter table "public"."payment_records" validate constraint "payment_records_payment_method_check";

alter table "public"."payment_records" add constraint "payment_records_status_check" CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'cancelled'::character varying])::text[]))) not valid;

alter table "public"."payment_records" validate constraint "payment_records_status_check";

alter table "public"."payments" add constraint "payments_status_check" CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'partial'::character varying, 'completed'::character varying, 'overdue'::character varying, 'active'::character varying, 'cancelled'::character varying])::text[]))) not valid;

alter table "public"."payments" validate constraint "payments_status_check";

alter table "public"."products" add constraint "products_status_check" CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'discontinued'::character varying])::text[]))) not valid;

alter table "public"."products" validate constraint "products_status_check";

alter table "public"."sale_items" add constraint "sale_items_discount_type_check" CHECK (((discount_type)::text = ANY ((ARRAY['amount'::character varying, 'percentage'::character varying])::text[]))) not valid;

alter table "public"."sale_items" validate constraint "sale_items_discount_type_check";

alter table "public"."sale_payments" add constraint "sale_payments_payment_type_check" CHECK (((payment_type)::text = ANY ((ARRAY['cash'::character varying, 'transfer'::character varying, 'credit'::character varying])::text[]))) not valid;

alter table "public"."sale_payments" validate constraint "sale_payments_payment_type_check";

alter table "public"."sales" add constraint "sales_payment_method_check" CHECK (((payment_method)::text = ANY ((ARRAY['cash'::character varying, 'credit'::character varying, 'transfer'::character varying, 'warranty'::character varying, 'mixed'::character varying])::text[]))) not valid;

alter table "public"."sales" validate constraint "sales_payment_method_check";

alter table "public"."sales" add constraint "sales_status_check" CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'completed'::character varying, 'cancelled'::character varying, 'draft'::character varying])::text[]))) not valid;

alter table "public"."sales" validate constraint "sales_status_check";

alter table "public"."warranties" add constraint "warranties_status_check" CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'rejected'::character varying, 'discarded'::character varying])::text[]))) not valid;

alter table "public"."warranties" validate constraint "warranties_status_check";

alter table "public"."warranty_products" add constraint "warranty_products_condition_check" CHECK (((condition)::text = ANY ((ARRAY['defective'::character varying, 'repaired'::character varying, 'discarded'::character varying])::text[]))) not valid;

alter table "public"."warranty_products" validate constraint "warranty_products_condition_check";


