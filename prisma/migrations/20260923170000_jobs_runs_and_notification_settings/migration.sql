-- P5 (jobs y email): bitacora/candado de los jobs del cron y destinatarios por empresa.
--
-- `jobs_runs` cumple dos funciones a la vez:
--   1. Observabilidad: el Logger del repo solo emite con NEXT_PUBLIC_SHOW_LOGS=true, asi que
--      un job que solo loguea no deja rastro en produccion. Cada corrida deja fila.
--   2. Idempotencia: la unique (job, run_key) se reclama con INSERT ... ON CONFLICT antes de
--      trabajar; una segunda corrida del mismo dia no puede volver a mandar el correo.
--
-- `notification_settings` saca los destinatarios de las variables de entorno globales que
-- usaban las edge functions (DOCUMENTS_EXPIRY_RECIPIENTS / DEVIATIONS_RECIPIENTS) y los ata a
-- la empresa. Es lo que el diseno aprobado especifica (seccion 5 de
-- docs/superpowers/specs/2026-09-21-salida-de-supabase-design.md) y lo que evita que el correo
-- de una empresa llegue a gente de otra.

-- CreateEnum
CREATE TYPE "job_run_status" AS ENUM ('running', 'ok', 'error');

-- CreateEnum
CREATE TYPE "notification_kind" AS ENUM ('documents_expiry', 'daily_report_deviations');

-- CreateTable
CREATE TABLE "jobs_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "job" TEXT NOT NULL,
    "run_key" TEXT NOT NULL,
    "company_id" UUID,
    "status" "job_run_status" NOT NULL DEFAULT 'running',
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(6),
    "error" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "jobs_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "kind" "notification_kind" NOT NULL,
    "recipients" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "jobs_runs_job_started_at_idx" ON "jobs_runs"("job", "started_at");

-- CreateIndex
CREATE INDEX "jobs_runs_company_id_idx" ON "jobs_runs"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_runs_job_run_key_key" ON "jobs_runs"("job", "run_key");

-- CreateIndex
CREATE INDEX "idx_notification_settings_company_id" ON "notification_settings"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_settings_company_id_kind_key" ON "notification_settings"("company_id", "kind");

-- AddForeignKey
ALTER TABLE "jobs_runs" ADD CONSTRAINT "jobs_runs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Default por empresa: el correo de contacto de la propia empresa (`company.contact_email` es
-- NOT NULL). Es el unico destinatario por empresa que el modelo ya conoce; se cambia editando
-- la fila. Sin esto la funcionalidad queda muerta hasta que alguien cargue la tabla a mano.
INSERT INTO "notification_settings" ("company_id", "kind", "recipients")
SELECT c."id", k."kind", ARRAY[c."contact_email"]
FROM "company" c
CROSS JOIN (VALUES ('documents_expiry'::"notification_kind"), ('daily_report_deviations'::"notification_kind")) AS k("kind")
WHERE c."contact_email" IS NOT NULL AND btrim(c."contact_email") <> ''
ON CONFLICT ("company_id", "kind") DO NOTHING;
