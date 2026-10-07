-- Facturación electrónica ARCA (fase 3): datos fiscales del emisor, puntos de venta,
-- certificados (clave privada cifrada), tickets de WSAA, leases y bitácora de llamadas.
-- Se toma SOLO lo nuevo del `migrate diff` (se descarta el drift preexistente de índices
-- parciales que no son de este cambio).

-- CreateEnum
CREATE TYPE "arca_environment" AS ENUM ('homologacion', 'produccion');

-- CreateEnum
CREATE TYPE "fiscal_tax_condition" AS ENUM ('responsable_inscripto', 'monotributo', 'exento');

-- CreateEnum
CREATE TYPE "gross_income_regime" AS ENUM ('local', 'convenio_multilateral', 'exento');

-- CreateEnum
CREATE TYPE "arca_credential_status" AS ENUM ('pendiente', 'activo', 'reemplazado');

-- CreateTable
CREATE TABLE "company_fiscal_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "tax_condition" "fiscal_tax_condition" NOT NULL,
    "gross_income_number" VARCHAR(30),
    "gross_income_regime" "gross_income_regime",
    "activity_start_date" DATE NOT NULL,
    "fiscal_street" VARCHAR(255) NOT NULL,
    "fiscal_city" VARCHAR(120) NOT NULL,
    "fiscal_province_id" BIGINT,
    "fiscal_postal_code" VARCHAR(10) NOT NULL,
    "environment" "arca_environment" NOT NULL DEFAULT 'homologacion',
    "environment_changed_at" TIMESTAMPTZ(6),
    "environment_changed_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_fiscal_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_points" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arca_credentials" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "environment" "arca_environment" NOT NULL,
    "status" "arca_credential_status" NOT NULL,
    "alias" VARCHAR(60) NOT NULL,
    "private_key_enc" TEXT NOT NULL,
    "csr_pem" TEXT NOT NULL,
    "certificate_pem" TEXT,
    "cert_subject" TEXT,
    "cert_issuer" TEXT,
    "cert_serial" VARCHAR(64),
    "cert_not_before" TIMESTAMPTZ(6),
    "cert_not_after" TIMESTAMPTZ(6),
    "last_test_at" TIMESTAMPTZ(6),
    "last_test_ok" BOOLEAN,
    "last_test_result" JSONB,
    "created_by" UUID,
    "activated_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "arca_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arca_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "environment" "arca_environment" NOT NULL,
    "service" VARCHAR(20) NOT NULL DEFAULT 'wsfe',
    "credential_id" UUID NOT NULL,
    "token_enc" TEXT NOT NULL,
    "sign_enc" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "arca_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arca_locks" (
    "key" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "locked_until" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "arca_locks_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "arca_call_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "environment" "arca_environment" NOT NULL,
    "operation" VARCHAR(60) NOT NULL,
    "invoice_id" UUID,
    "http_status" INTEGER,
    "duration_ms" INTEGER NOT NULL,
    "error" TEXT,
    "request_xml" TEXT NOT NULL,
    "response_xml" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "arca_call_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_fiscal_profiles_company_id_key" ON "company_fiscal_profiles"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_points_company_id_number_key" ON "sales_points"("company_id", "number");

-- CreateIndex
CREATE INDEX "idx_arca_credentials_company_env" ON "arca_credentials"("company_id", "environment");

-- CreateIndex
CREATE UNIQUE INDEX "uq_arca_credentials_active" ON "arca_credentials"("company_id", "environment") WHERE (status = 'activo'::arca_credential_status);

-- CreateIndex
CREATE UNIQUE INDEX "uq_arca_credentials_pending" ON "arca_credentials"("company_id", "environment") WHERE (status = 'pendiente'::arca_credential_status);

-- CreateIndex
CREATE UNIQUE INDEX "arca_tokens_company_id_environment_service_key" ON "arca_tokens"("company_id", "environment", "service");

-- CreateIndex
CREATE INDEX "idx_arca_call_logs_company_created" ON "arca_call_logs"("company_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_arca_call_logs_invoice" ON "arca_call_logs"("invoice_id") WHERE (invoice_id IS NOT NULL);

-- AddForeignKey
ALTER TABLE "company_fiscal_profiles" ADD CONSTRAINT "company_fiscal_profiles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_fiscal_profiles" ADD CONSTRAINT "company_fiscal_profiles_fiscal_province_id_fkey" FOREIGN KEY ("fiscal_province_id") REFERENCES "provinces"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sales_points" ADD CONSTRAINT "sales_points_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arca_credentials" ADD CONSTRAINT "arca_credentials_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arca_tokens" ADD CONSTRAINT "arca_tokens_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arca_tokens" ADD CONSTRAINT "arca_tokens_credential_id_fkey" FOREIGN KEY ("credential_id") REFERENCES "arca_credentials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arca_call_logs" ADD CONSTRAINT "arca_call_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Checks que Prisma no expresa.
ALTER TABLE "sales_points" ADD CONSTRAINT "sales_points_number_check" CHECK ("number" BETWEEN 1 AND 99999);
ALTER TABLE "arca_credentials" ADD CONSTRAINT "arca_credentials_active_has_certificate_check"
  CHECK ("status" <> 'activo' OR ("certificate_pem" IS NOT NULL AND "cert_not_after" IS NOT NULL));
