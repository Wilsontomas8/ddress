CREATE TYPE "public"."appointment_status" AS ENUM('PENDENTE', 'CONFIRMADA', 'REALIZADA', 'FALTOU', 'CANCELADA');--> statement-breakpoint
CREATE TYPE "public"."item_kind" AS ENUM('VENDA', 'ALUGUER');--> statement-breakpoint
CREATE TYPE "public"."offer" AS ENUM('VENDA', 'ALUGUER', 'AMBOS');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('NOVO', 'RECEBIDO', 'AGUARDA_PROVA', 'CONFIRMADO', 'PAGO', 'PRONTO', 'ENTREGUE', 'EM_ALUGUER', 'DEVOLVIDO', 'CONCLUIDO', 'CANCELADO');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('MULTICAIXA_EXPRESS', 'TRANSFERENCIA', 'NA_ENTREGA', 'CARTAO');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('PENDENTE', 'EM_VERIFICACAO', 'PAGO', 'PARCIAL', 'REEMBOLSADO', 'FALHADO');--> statement-breakpoint
CREATE TYPE "public"."reservation_status" AS ENUM('PROVISORIA', 'CONFIRMADA', 'ENTREGUE', 'EM_HIGIENIZACAO', 'DEVOLVIDA', 'CANCELADA');--> statement-breakpoint
CREATE TYPE "public"."residence" AS ENUM('LUANDA', 'FORA_LUANDA');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('CLIENTE', 'FUNCIONARIO', 'ADMIN', 'SUPORTE', 'CONTABILISTA', 'MOTORISTA');--> statement-breakpoint
CREATE TYPE "public"."section" AS ENUM('HOMEM', 'MULHER', 'CRIANCA');--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"user_id" text,
	"customer_name" text NOT NULL,
	"customer_phone" text NOT NULL,
	"customer_email" text,
	"product_id" text,
	"variant_id" text,
	"order_id" text,
	"date" date NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"status" "appointment_status" DEFAULT 'PENDENTE' NOT NULL,
	"notes" text,
	"staff_notes" text,
	"staff_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"section" "section" NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_events" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"actor_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"product_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"product_name" text NOT NULL,
	"variant_label" text NOT NULL,
	"image_url" text,
	"kind" "item_kind" NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" integer NOT NULL,
	"deposit" integer DEFAULT 0 NOT NULL,
	"line_total" integer NOT NULL,
	"start_date" date,
	"end_date" date,
	"days" integer
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"number" text NOT NULL,
	"user_id" text,
	"customer_name" text NOT NULL,
	"customer_phone" text NOT NULL,
	"customer_email" text,
	"customer_address" text,
	"customer_residence" "residence" DEFAULT 'LUANDA' NOT NULL,
	"fitting_waived" boolean DEFAULT false NOT NULL,
	"waiver_accepted_at" timestamp with time zone,
	"status" "order_status" DEFAULT 'NOVO' NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"payment_status" "payment_status" DEFAULT 'PENDENTE' NOT NULL,
	"subtotal" integer DEFAULT 0 NOT NULL,
	"deposit_total" integer DEFAULT 0 NOT NULL,
	"delivery_fee" integer DEFAULT 0 NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"needs_fitting" boolean DEFAULT false NOT NULL,
	"customer_note" text,
	"staff_note" text,
	"assigned_to_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"method" "payment_method" NOT NULL,
	"amount" integer NOT NULL,
	"reference" text,
	"proof_url" text,
	"status" "payment_status" DEFAULT 'PENDENTE' NOT NULL,
	"is_deposit_refund" boolean DEFAULT false NOT NULL,
	"confirmed_by_id" text,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"url" text NOT NULL,
	"alt" text,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"sku" text NOT NULL,
	"size" text NOT NULL,
	"color" text NOT NULL,
	"sale_stock" integer DEFAULT 0 NOT NULL,
	"rental_stock" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"care" text,
	"brand" text,
	"section" "section" NOT NULL,
	"category_id" text NOT NULL,
	"offer" "offer" DEFAULT 'VENDA' NOT NULL,
	"sale_price" integer,
	"compare_at_price" integer,
	"rental_day_price" integer,
	"rental_weekend_price" integer,
	"rental_deposit" integer,
	"min_rental_days" integer DEFAULT 1 NOT NULL,
	"max_rental_days" integer DEFAULT 14 NOT NULL,
	"cleaning_buffer_days" integer DEFAULT 2 NOT NULL,
	"requires_fitting" boolean DEFAULT false NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rental_reservations" (
	"id" text PRIMARY KEY NOT NULL,
	"variant_id" text NOT NULL,
	"order_id" text,
	"order_item_id" text,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"block_until" date NOT NULL,
	"returned_at" date,
	"returned_by_id" text,
	"cleaning_note" text,
	"status" "reservation_status" DEFAULT 'PROVISORIA' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"store_name" text DEFAULT 'DDRESS' NOT NULL,
	"tagline" text DEFAULT 'Aluguer e venda de vestidos' NOT NULL,
	"phone" text DEFAULT '+244 900 000 000' NOT NULL,
	"whatsapp" text DEFAULT '+244 900 000 000' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"address" text DEFAULT 'Luanda, Angola' NOT NULL,
	"bank_name" text DEFAULT 'Banco BAI' NOT NULL,
	"account_holder" text DEFAULT 'DDRESS' NOT NULL,
	"iban" text DEFAULT 'AO06 0000 0000 0000 0000 0000 0' NOT NULL,
	"multicaixa_number" text DEFAULT '+244 900 000 000' NOT NULL,
	"delivery_fee" integer DEFAULT 2000 NOT NULL,
	"open_days" integer[] DEFAULT '{1,2,3,4,5,6}' NOT NULL,
	"open_hour" text DEFAULT '09:00' NOT NULL,
	"close_hour" text DEFAULT '18:00' NOT NULL,
	"slot_minutes" integer DEFAULT 45 NOT NULL,
	"slot_capacity" integer DEFAULT 2 NOT NULL,
	"min_notice_hours" integer DEFAULT 24 NOT NULL,
	"booking_horizon_days" integer DEFAULT 45 NOT NULL,
	"closed_dates" text[] DEFAULT '{}' NOT NULL,
	"reservation_expiry_hours" integer DEFAULT 24 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"address" text,
	"password_hash" text NOT NULL,
	"role" "role" DEFAULT 'CLIENTE' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_staff_id_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_confirmed_by_id_users_id_fk" FOREIGN KEY ("confirmed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rental_reservations" ADD CONSTRAINT "rental_reservations_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rental_reservations" ADD CONSTRAINT "rental_reservations_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rental_reservations" ADD CONSTRAINT "rental_reservations_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rental_reservations" ADD CONSTRAINT "rental_reservations_returned_by_id_users_id_fk" FOREIGN KEY ("returned_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "appointments_code_key" ON "appointments" USING btree ("code");--> statement-breakpoint
CREATE INDEX "appointments_date_idx" ON "appointments" USING btree ("date","start_time");--> statement-breakpoint
CREATE INDEX "appointments_variant_idx" ON "appointments" USING btree ("variant_id","date");--> statement-breakpoint
CREATE INDEX "appointments_status_idx" ON "appointments" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_section_slug_key" ON "categories" USING btree ("section","slug");--> statement-breakpoint
CREATE INDEX "categories_section_idx" ON "categories" USING btree ("section");--> statement-breakpoint
CREATE INDEX "order_events_order_idx" ON "order_events" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_number_key" ON "orders" USING btree ("number");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_created_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "orders_assigned_idx" ON "orders" USING btree ("assigned_to_id");--> statement-breakpoint
CREATE INDEX "payments_order_idx" ON "payments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "product_images_product_idx" ON "product_images" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "product_variants_product_idx" ON "product_variants" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "products_slug_key" ON "products" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "products_section_idx" ON "products" USING btree ("section","active");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "products_offer_idx" ON "products" USING btree ("offer");--> statement-breakpoint
CREATE INDEX "rental_reservations_variant_idx" ON "rental_reservations" USING btree ("variant_id","start_date","block_until");--> statement-breakpoint
CREATE INDEX "rental_reservations_status_idx" ON "rental_reservations" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_key" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");