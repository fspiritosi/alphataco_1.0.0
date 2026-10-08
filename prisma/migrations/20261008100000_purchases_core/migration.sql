-- Compras, etapa 1: proveedores y solicitudes de compra.
-- Spec: docs/superpowers/specs/2026-10-08-compras-etapa-1-design.md

-- CreateEnum
CREATE TYPE "purchase_request_status" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "suppliers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "trade_name" TEXT,
    "cuit" BIGINT NOT NULL,
    "vat_condition_id" INTEGER NOT NULL,
    "street" TEXT,
    "city" TEXT,
    "province" TEXT,
    "postal_code" TEXT,
    "payment_term_days" INTEGER,
    "bank_cbu" TEXT,
    "bank_alias" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_contacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "supplier_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_category_links" (
    "supplier_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_category_links_pkey" PRIMARY KEY ("supplier_id","category_id")
);

-- CreateTable
CREATE TABLE "supplier_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "supplier_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "expires_at" DATE,
    "replaced_by_id" UUID,
    "uploaded_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "status" "purchase_request_status" NOT NULL DEFAULT 'DRAFT',
    "requested_by" UUID NOT NULL,
    "needed_by" DATE,
    "notes" TEXT,
    "destination_type" "stock_destination_type",
    "employee_id" UUID,
    "vehicle_id" UUID,
    "other_equipment_id" UUID,
    "maintenance_order_id" UUID,
    "customer_id" UUID,
    "customer_service_id" UUID,
    "material_request_id" UUID,
    "submitted_at" TIMESTAMPTZ(6),
    "decided_by" UUID,
    "decided_at" TIMESTAMPTZ(6),
    "decision_notes" TEXT,
    "cancelled_by" UUID,
    "cancelled_at" TIMESTAMPTZ(6),
    "cancel_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_request_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "request_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "material_id" UUID,
    "description" TEXT,
    "quantity" DECIMAL(15,4) NOT NULL,
    "unit_id" UUID NOT NULL,
    "suggested_supplier_id" UUID,
    "notes" TEXT,

    CONSTRAINT "purchase_request_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_suppliers_company_id" ON "suppliers"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_company_id_cuit_key" ON "suppliers"("company_id", "cuit");

-- CreateIndex
CREATE INDEX "idx_supplier_contacts_supplier_id" ON "supplier_contacts"("supplier_id");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_categories_company_id_name_key" ON "supplier_categories"("company_id", "name");

-- CreateIndex
CREATE INDEX "idx_supplier_category_links_category_id" ON "supplier_category_links"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_documents_replaced_by_id_key" ON "supplier_documents"("replaced_by_id");

-- CreateIndex
CREATE INDEX "idx_supplier_documents_supplier_id" ON "supplier_documents"("supplier_id");

-- CreateIndex
CREATE INDEX "idx_purchase_requests_company_status" ON "purchase_requests"("company_id", "status");

-- CreateIndex
CREATE INDEX "idx_purchase_requests_requested_by" ON "purchase_requests"("requested_by");

-- CreateIndex
CREATE INDEX "idx_purchase_requests_material_request" ON "purchase_requests"("material_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_requests_company_id_number_key" ON "purchase_requests"("company_id", "number");

-- CreateIndex
CREATE INDEX "idx_purchase_request_lines_request_id" ON "purchase_request_lines"("request_id");

-- CreateIndex
CREATE INDEX "idx_purchase_request_lines_material_id" ON "purchase_request_lines"("material_id");

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_contacts" ADD CONSTRAINT "supplier_contacts_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_categories" ADD CONSTRAINT "supplier_categories_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_category_links" ADD CONSTRAINT "supplier_category_links_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_category_links" ADD CONSTRAINT "supplier_category_links_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "supplier_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_documents" ADD CONSTRAINT "supplier_documents_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_documents" ADD CONSTRAINT "supplier_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "supplier_documents" ADD CONSTRAINT "supplier_documents_replaced_by_id_fkey" FOREIGN KEY ("replaced_by_id") REFERENCES "supplier_documents"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_decided_by_fkey" FOREIGN KEY ("decided_by") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_other_equipment_id_fkey" FOREIGN KEY ("other_equipment_id") REFERENCES "other_equipment"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_maintenance_order_id_fkey" FOREIGN KEY ("maintenance_order_id") REFERENCES "maintenance_orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_customer_service_id_fkey" FOREIGN KEY ("customer_service_id") REFERENCES "customer_services"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_material_request_id_fkey" FOREIGN KEY ("material_request_id") REFERENCES "material_requests"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_request_lines" ADD CONSTRAINT "purchase_request_lines_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "purchase_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_request_lines" ADD CONSTRAINT "purchase_request_lines_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_request_lines" ADD CONSTRAINT "purchase_request_lines_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "measurement_units"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_request_lines" ADD CONSTRAINT "purchase_request_lines_suggested_supplier_id_fkey" FOREIGN KEY ("suggested_supplier_id") REFERENCES "suppliers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;


-- ── Reglas en la base (la red: los mensajes salen de las validaciones del servidor) ──

-- Un solo contacto principal por proveedor.
CREATE UNIQUE INDEX "supplier_contacts_one_primary_key" ON "supplier_contacts"("supplier_id") WHERE "is_primary";

ALTER TABLE "suppliers"
  ADD CONSTRAINT "suppliers_cuit_check" CHECK ("cuit" BETWEEN 10000000000 AND 99999999999),
  ADD CONSTRAINT "suppliers_payment_term_check" CHECK ("payment_term_days" IS NULL OR "payment_term_days" >= 0),
  ADD CONSTRAINT "suppliers_bank_cbu_check" CHECK ("bank_cbu" IS NULL OR "bank_cbu" ~ '^[0-9]{22}$');

-- Linea: material del catalogo O texto libre, nunca los dos ni ninguno.
ALTER TABLE "purchase_request_lines"
  ADD CONSTRAINT "purchase_request_lines_item_check" CHECK (("material_id" IS NULL) <> ("description" IS NULL)),
  ADD CONSTRAINT "purchase_request_lines_quantity_check" CHECK ("quantity" > 0);

-- Destino opcional: sin tipo, ninguna FK; con tipo, solo la suya. COALESCE porque con
-- destination_type NULL la comparacion da NULL y el CHECK pasaria igual.
ALTER TABLE "purchase_requests"
  ADD CONSTRAINT "purchase_requests_single_destination_check" CHECK (
    ("employee_id" IS NOT NULL) = COALESCE("destination_type" = 'EMPLOYEE', false)
    AND ("vehicle_id" IS NOT NULL) = COALESCE("destination_type" = 'VEHICLE', false)
    AND ("other_equipment_id" IS NOT NULL) = COALESCE("destination_type" = 'OTHER_EQUIPMENT', false)
    AND ("maintenance_order_id" IS NOT NULL) = COALESCE("destination_type" = 'MAINTENANCE_ORDER', false)
    AND ("customer_id" IS NOT NULL) = COALESCE("destination_type" = 'CUSTOMER', false)
  ),
  ADD CONSTRAINT "purchase_requests_customer_service_check" CHECK (
    "customer_service_id" IS NULL OR "customer_id" IS NOT NULL
  ),
  -- Decision: quien y cuando juntos; un rechazo lleva motivo.
  ADD CONSTRAINT "purchase_requests_decision_check" CHECK (
    ("decided_by" IS NULL) = ("decided_at" IS NULL)
    AND ("status" <> 'REJECTED' OR ("decided_at" IS NOT NULL AND "decision_notes" IS NOT NULL))
  ),
  -- Anulacion completa o nada.
  ADD CONSTRAINT "purchase_requests_cancel_check" CHECK (
    ("cancelled_at" IS NULL AND "cancelled_by" IS NULL AND "cancel_reason" IS NULL)
    OR ("cancelled_at" IS NOT NULL AND "cancelled_by" IS NOT NULL AND "cancel_reason" IS NOT NULL)
  );
