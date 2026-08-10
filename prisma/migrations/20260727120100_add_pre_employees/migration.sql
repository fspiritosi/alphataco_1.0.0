-- Ticket 505 — Pre legajo de empleados.
--
-- `pre_employees` guarda a los postulantes en proceso de ingreso. Espeja la nullability de
-- `employees` para los datos personales y de contacto; de los datos laborales solo tiene el
-- sector y el puesto propuestos (el resto se completa al convertirlo en legajo).
-- `documents_pre_employees` es un checklist simple: solo existen filas para documentos
-- efectivamente subidos, sin estados ni alertas (el motor de alertas es exclusivo de los
-- empleados reales y no se toca).
-- `document_types.available_for_pre_file` marca que tipos pueden cargarse desde un pre legajo.

-- CreateEnum
CREATE TYPE "public"."pre_employee_status_enum" AS ENUM ('en_proceso', 'pre_ingreso', 'rechazado', 'legajo');

-- AlterTable
ALTER TABLE "public"."document_types" ADD COLUMN "available_for_pre_file" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."pre_employees" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "company_id" UUID NOT NULL,
    "pre_file_number" TEXT NOT NULL,
    "status" "public"."pre_employee_status_enum" NOT NULL DEFAULT 'en_proceso',
    "firstname" TEXT NOT NULL,
    "lastname" TEXT NOT NULL,
    "cuil" TEXT NOT NULL,
    "document_type" "public"."document_type_enum",
    "document_number" TEXT NOT NULL,
    "born_date" TEXT,
    "nationality" "public"."nationality_enum",
    "birthplace" UUID NOT NULL,
    "gender" "public"."gender_enum",
    "marital_status" "public"."marital_status_enum",
    "level_of_education" "public"."level_of_education_enum",
    "picture" TEXT,
    "street" TEXT NOT NULL,
    "street_number" TEXT NOT NULL,
    "province" BIGINT NOT NULL,
    "city" BIGINT,
    "postal_code" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "proposed_hierarchical_position" UUID,
    "proposed_company_position" UUID,
    "rejection_reason" TEXT,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "employee_id" UUID,

    CONSTRAINT "pre_employees_pkey" PRIMARY KEY ("id"),
    -- El motivo es obligatorio cuando el pre legajo esta rechazado (requisito del ticket)
    CONSTRAINT "pre_employees_rejection_reason_check" CHECK ("status" <> 'rechazado' OR "rejection_reason" IS NOT NULL)
);

-- CreateTable
CREATE TABLE "public"."documents_pre_employees" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pre_employee_id" UUID NOT NULL,
    "document_type_id" UUID NOT NULL,
    "document_path" TEXT NOT NULL,
    "validity" TIMESTAMPTZ(6),
    "uploaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID,

    CONSTRAINT "documents_pre_employees_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pre_employees_employee_id_key" ON "public"."pre_employees"("employee_id");

-- CreateIndex
CREATE INDEX "pre_employees_company_id_status_idx" ON "public"."pre_employees"("company_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "pre_employees_company_id_pre_file_number_key" ON "public"."pre_employees"("company_id", "pre_file_number");

-- CreateIndex
CREATE UNIQUE INDEX "documents_pre_employees_pre_employee_id_document_type_id_key" ON "public"."documents_pre_employees"("pre_employee_id", "document_type_id");

-- AddForeignKey
ALTER TABLE "public"."pre_employees" ADD CONSTRAINT "pre_employees_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pre_employees" ADD CONSTRAINT "pre_employees_birthplace_fkey" FOREIGN KEY ("birthplace") REFERENCES "public"."countries"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."pre_employees" ADD CONSTRAINT "pre_employees_province_fkey" FOREIGN KEY ("province") REFERENCES "public"."provinces"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."pre_employees" ADD CONSTRAINT "pre_employees_city_fkey" FOREIGN KEY ("city") REFERENCES "public"."cities"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."pre_employees" ADD CONSTRAINT "pre_employees_proposed_hierarchical_position_fkey" FOREIGN KEY ("proposed_hierarchical_position") REFERENCES "public"."hierarchy"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."pre_employees" ADD CONSTRAINT "pre_employees_proposed_company_position_fkey" FOREIGN KEY ("proposed_company_position") REFERENCES "public"."company_positions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."pre_employees" ADD CONSTRAINT "pre_employees_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."pre_employees" ADD CONSTRAINT "pre_employees_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."pre_employees" ADD CONSTRAINT "pre_employees_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."documents_pre_employees" ADD CONSTRAINT "documents_pre_employees_pre_employee_id_fkey" FOREIGN KEY ("pre_employee_id") REFERENCES "public"."pre_employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."documents_pre_employees" ADD CONSTRAINT "documents_pre_employees_document_type_id_fkey" FOREIGN KEY ("document_type_id") REFERENCES "public"."document_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."documents_pre_employees" ADD CONSTRAINT "documents_pre_employees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
