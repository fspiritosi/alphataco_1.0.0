-- Baseline 0_init — Postgres plano (sin schemas auth/storage de Supabase).
-- Generado por scripts/sql/build-baseline.ts (`npm run db:baseline`). NO editar a mano:
-- el DDL sale de prisma/schema.prisma y la lógica de prisma/sql/*.sql.
-- Después del primer `prisma migrate deploy` real este archivo NO se regenera:
-- los cambios van en migraciones nuevas (.claude/rules/migrations.md).

-- ── Extensiones ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Prerrequisitos del DDL (defaults de columna) ───────────────────────────
CREATE OR REPLACE FUNCTION public.app_current_user_id()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN nullif(current_setting('app.user_id', true), '')::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$function$;

-- ── Esquema (prisma migrate diff --from-empty --to-schema) ───────────────────

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "affiliate_status_enum" AS ENUM ('Dentro de convenio', 'Fuera de convenio');

-- CreateEnum
CREATE TYPE "condition_enum" AS ENUM ('operativo', 'no operativo', 'en reparacion', 'operativo condicionado', 'en preparacion');

-- CreateEnum
CREATE TYPE "contract_type_enum" AS ENUM ('Leasing', 'Alquiler', 'Prendado');

-- CreateEnum
CREATE TYPE "contract_type_vehicles_enum" AS ENUM ('Leasing', 'Alquiler', 'Propio', 'Prendado');

-- CreateEnum
CREATE TYPE "cost_type_enum" AS ENUM ('Directo', 'Indirecto');

-- CreateEnum
CREATE TYPE "currency_enum" AS ENUM ('USD', 'EUR', 'GBP', 'ARS');

-- CreateEnum
CREATE TYPE "daily_report_header_status_new" AS ENUM ('abierto', 'cerrado', 'cerrado_completo', 'cerrado_incompleto');

-- CreateEnum
CREATE TYPE "daily_report_status" AS ENUM ('pendiente', 'sin_recursos_asignados', 'ejecutado', 'reprogramado', 'cancelado', 'en_certificacion');

-- CreateEnum
CREATE TYPE "daily_report_type_enum" AS ENUM ('mensual', 'adicional', 'adicional_permanente');

-- CreateEnum
CREATE TYPE "document_applies" AS ENUM ('Persona', 'Equipos', 'Empresa');

-- CreateEnum
CREATE TYPE "document_type_enum" AS ENUM ('DNI', 'LE', 'LC', 'PASAPORTE');

-- CreateEnum
CREATE TYPE "employee_daily_report_role" AS ENUM ('chofer_dia', 'chofer_noche', 'ayudante_dia', 'ayudante_noche');

-- CreateEnum
CREATE TYPE "daily_report_shift" AS ENUM ('dia', 'noche');

-- CreateEnum
CREATE TYPE "gender_enum" AS ENUM ('Masculino', 'Femenino', 'No Declarado');

-- CreateEnum
CREATE TYPE "indicator_function" AS ENUM ('get_vehicle_usage_indicator', 'get_employee_usage_indicator', 'get_employee_diagram_count_by_day', 'get_company_counts_indicator', 'hr_get_absenteeism_summary', 'hr_get_absenteeism_trend', 'hr_get_current_absent_employees', 'hr_get_daily_absence_timeseries', 'hr_get_department_absence_reasons', 'hr_get_department_absence_summary', 'get_daily_report_deviations_indicator');

-- CreateEnum
CREATE TYPE "level_of_education_enum" AS ENUM ('Primario', 'Secundario', 'Terciario', 'Universitario', 'PosGrado');

-- CreateEnum
CREATE TYPE "marital_status_enum" AS ENUM ('Casado', 'Soltero', 'Divorciado', 'Viudo', 'Separado', 'Union de hecho');

-- CreateEnum
CREATE TYPE "modulos" AS ENUM ('empresa', 'empleados', 'equipos', 'documentación', 'mantenimiento', 'dashboard', 'ayuda', 'operaciones', 'formularios');

-- CreateEnum
CREATE TYPE "nationality_enum" AS ENUM ('Argentina', 'Extranjero');

-- CreateEnum
CREATE TYPE "notification_categories" AS ENUM ('vencimiento', 'noticia', 'advertencia', 'aprobado', 'rechazado');

-- CreateEnum
CREATE TYPE "pre_employee_status_enum" AS ENUM ('en_proceso', 'pre_ingreso', 'rechazado', 'legajo');

-- CreateEnum
CREATE TYPE "preparte_status" AS ENUM ('pendiente', 'cancelado', 'reprogramado', 'rechazado', 'vencido', 'confirmado');

-- CreateEnum
CREATE TYPE "reason_for_termination_enum" AS ENUM ('Despido sin causa', 'Renuncia', 'Despido con causa', 'Acuerdo de partes', 'Fin de contrato', 'Fallecimiento');

-- CreateEnum
CREATE TYPE "repair_state" AS ENUM ('Pendiente', 'Esperando repuestos', 'En reparación', 'Finalizado', 'Rechazado', 'Cancelado', 'Programado');

-- CreateEnum
CREATE TYPE "roles_enum" AS ENUM ('Externo', 'Auditor');

-- CreateEnum
CREATE TYPE "state" AS ENUM ('presentado', 'rechazado', 'aprobado', 'vencido', 'pendiente');

-- CreateEnum
CREATE TYPE "status_type" AS ENUM ('Avalado', 'No avalado', 'Incompleto', 'Completo', 'Completo con doc vencida');

-- CreateEnum
CREATE TYPE "termination_reason_enum" AS ENUM ('venta', 'destrucción total', 'devolución', 'otro');

-- CreateEnum
CREATE TYPE "type_equipment" AS ENUM ('Perforador', 'Perforador Spudder', 'Work over', 'Fractura', 'Coiled Tubing');

-- CreateEnum
CREATE TYPE "type_of_contract_enum" AS ENUM ('Período de prueba', 'A tiempo indeterminado', 'Plazo fijo');

-- CreateEnum
CREATE TYPE "type_of_maintenance_ENUM" AS ENUM ('Correctivo', 'Preventivo', 'Otro');

-- CreateEnum
CREATE TYPE "work_order_item_status" AS ENUM ('pending', 'in_progress', 'completed', 'cancelled', 'pending_approval', 'reassignment_requested', 'rejected');

-- CreateEnum
CREATE TYPE "work_order_priority" AS ENUM ('urgent', 'high', 'medium', 'low');

-- CreateEnum
CREATE TYPE "work_order_status" AS ENUM ('pending', 'in_progress', 'paused', 'completed', 'completed_partial', 'cancelled');

-- CreateEnum
CREATE TYPE "workshop_type" AS ENUM ('interno', 'externo');

-- CreateEnum
CREATE TYPE "TireStatus" AS ENUM ('AVAILABLE', 'INSTALLED', 'IN_REPAIR', 'DISCARDED', 'MISSING');

-- CreateEnum
CREATE TYPE "TireRetreadLevel" AS ENUM ('FIRST', 'SECOND', 'THIRD');

-- CreateEnum
CREATE TYPE "TireTreadType" AS ENUM ('SMOOTH', 'MIXED', 'BLOCK');

-- CreateEnum
CREATE TYPE "TirePositionSide" AS ENUM ('LEFT', 'RIGHT', 'SPARE');

-- CreateEnum
CREATE TYPE "TireServiceAction" AS ENUM ('REPLACE', 'REPAIR', 'CALIBRATE', 'MISSING_REPORT');

-- CreateEnum
CREATE TYPE "TireOldDestination" AS ENUM ('AVAILABLE', 'DISCARD', 'REPAIR');

-- CreateEnum
CREATE TYPE "TireServiceOrderStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "clothing_delivery_type" AS ENUM ('PLANNED_CCT', 'PLANNED_EPP', 'REPLACEMENT');

-- CreateTable
CREATE TABLE "actions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aptitudes_tecnicas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nombre" TEXT NOT NULL,
    "is_active" BOOLEAN DEFAULT true,
    "company_id" UUID NOT NULL,

    CONSTRAINT "aptitudes_tecnicas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aptitudes_tecnicas_puestos" (
    "aptitud_id" UUID NOT NULL,
    "puesto_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aptitudes_tecnicas_puestos_pkey" PRIMARY KEY ("aptitud_id","puesto_id")
);

-- CreateTable
CREATE TABLE "area_province" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "area_id" UUID NOT NULL,
    "province_id" BIGINT NOT NULL,

    CONSTRAINT "area_province_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "areas_cliente" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nombre" TEXT NOT NULL,
    "descripcion_corta" TEXT,
    "customer_id" UUID NOT NULL,

    CONSTRAINT "areas_cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assing_customer" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customer_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "equipment_id" UUID NOT NULL,

    CONSTRAINT "assing_customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_vehicles" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "company_id" UUID,

    CONSTRAINT "brand_vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "covenant_id" UUID,
    "name" TEXT,
    "is_active" BOOLEAN DEFAULT true,

    CONSTRAINT "category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_employee" (
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category_id" UUID,
    "emplyee_id" UUID,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),

    CONSTRAINT "category_employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_answers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "template_id" UUID NOT NULL,
    "equipment_id" UUID NOT NULL,
    "employee_id" UUID,
    "user_id" UUID,
    "answer_data" JSONB NOT NULL,
    "result" TEXT,
    "observations" TEXT,
    "critical_items_failed" TEXT[],
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "ut_checklist_answer_id" UUID,
    "chofer_employee_id" UUID,
    "customer_id" UUID GENERATED ALWAYS AS (CASE
    WHEN (((answer_data ->> 'customer_id'::text) IS NOT NULL) AND ((answer_data ->> 'customer_id'::text) <> 'null'::text)) THEN ((answer_data ->> 'customer_id'::text))::uuid
    ELSE NULL::uuid
END) STORED,
    "horometro" DECIMAL GENERATED ALWAYS AS (CASE
    WHEN (((answer_data ->> 'horometro'::text) IS NOT NULL) AND ((answer_data ->> 'horometro'::text) <> ''::text) AND ((answer_data ->> 'horometro'::text) ~ '^[0-9]+(\.[0-9]+)?$'::text)) THEN ((answer_data ->> 'horometro'::text))::numeric
    ELSE NULL::numeric
END) STORED,
    "kilometraje" DECIMAL GENERATED ALWAYS AS (CASE
    WHEN (((answer_data ->> 'kilometraje'::text) IS NOT NULL) AND ((answer_data ->> 'kilometraje'::text) <> ''::text) AND ((answer_data ->> 'kilometraje'::text) ~ '^[0-9]+(\.[0-9]+)?$'::text)) THEN ((answer_data ->> 'kilometraje'::text))::numeric
    ELSE NULL::numeric
END) STORED,
    "company_id" UUID NOT NULL,

    CONSTRAINT "checklist_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_deviations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "checklist_answer_id" UUID,
    "equipment_id" UUID NOT NULL,
    "item_code" TEXT NOT NULL,
    "item_label" TEXT NOT NULL,
    "section_code" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "created_by_user_id" UUID,
    "created_by_employee_id" UUID,
    "driver_comment" TEXT,
    "is_critical" BOOLEAN DEFAULT false,
    "company_id" UUID NOT NULL,

    CONSTRAINT "checklist_deviations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "section_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "input_type" TEXT NOT NULL,
    "options" JSONB,
    "is_critical" BOOLEAN DEFAULT false,
    "requires_certification" BOOLEAN DEFAULT false,
    "certification_validity_days" INTEGER,
    "requires_side_validation" BOOLEAN DEFAULT false,
    "default_value" TEXT,
    "validation_rules" JSONB,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "order_index" INTEGER,

    CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_sections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_reusable" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checklist_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_template_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "template_id" UUID NOT NULL,
    "section_id" UUID NOT NULL,
    "item_id" UUID,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "input_type" TEXT NOT NULL,
    "options" JSONB,
    "is_critical" BOOLEAN DEFAULT false,
    "requires_certification" BOOLEAN DEFAULT false,
    "certification_validity_days" INTEGER,
    "requires_side_validation" BOOLEAN DEFAULT false,
    "order_index" INTEGER NOT NULL,
    "validation_rules" JSONB,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checklist_template_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_template_sections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "template_id" UUID NOT NULL,
    "section_id" UUID,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,
    "is_required" BOOLEAN DEFAULT true,
    "is_specific" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checklist_template_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_template_sub_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "template_id" UUID NOT NULL,
    "sub_type_id" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checklist_template_sub_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_template_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "template_id" UUID NOT NULL,
    "type_id" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "company_id" UUID NOT NULL,

    CONSTRAINT "checklist_template_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "code" TEXT NOT NULL,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checklist_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cities" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "province_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "citys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clothing_brands" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "company_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clothing_brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clothing_deliveries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL,
    "delivered_by_id" UUID NOT NULL,
    "delivery_type" "clothing_delivery_type" NOT NULL,
    "signature_url" TEXT,
    "notes" TEXT,
    "delivered_at" TIMESTAMPTZ(6) NOT NULL,
    "company_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clothing_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clothing_delivery_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clothing_delivery_id" UUID NOT NULL,
    "clothing_item_id" UUID NOT NULL,
    "clothing_brand_id" UUID,
    "clothing_size_id" UUID,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "has_certificate" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "clothing_delivery_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clothing_item_brand_sizes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clothing_item_id" UUID NOT NULL,
    "clothing_brand_id" UUID NOT NULL,
    "clothing_size_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clothing_item_brand_sizes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clothing_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "company_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clothing_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clothing_sizes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "company_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clothing_sizes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies_employees" (
    "employee_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID,

    CONSTRAINT "companies_employees_pkey1" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "website" VARCHAR(255),
    "contact_email" VARCHAR(255) NOT NULL,
    "contact_phone" VARCHAR(20) NOT NULL,
    "address" VARCHAR(255) NOT NULL,
    "city" BIGINT NOT NULL,
    "country" VARCHAR(100) NOT NULL,
    "industry" TEXT NOT NULL,
    "company_logo" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "company_cuit" TEXT NOT NULL,
    "province_id" BIGINT,
    "owner_id" UUID,
    "by_defect" BOOLEAN DEFAULT false,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_positions" (
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT,
    "is_active" BOOLEAN,
    "hierarchical_position_id" UUID[],
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,

    CONSTRAINT "company_position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contact_name" TEXT,
    "constact_email" TEXT,
    "contact_phone" BIGINT,
    "contact_charge" TEXT,
    "company_id" UUID,
    "customer_id" UUID,
    "is_active" BOOLEAN DEFAULT true,
    "reason_for_termination" TEXT,
    "termination_date" DATE,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contractor_employee" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "employee_id" UUID,
    "contractor_id" UUID,

    CONSTRAINT "contractor_employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contractor_equipment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "equipment_id" UUID,
    "contractor_id" UUID,

    CONSTRAINT "contractor_equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contractor_other_equipment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "equipment_id" UUID NOT NULL,
    "contractor_id" UUID NOT NULL,

    CONSTRAINT "contractor_other_equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contractors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,

    CONSTRAINT "contractor-companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_center" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN DEFAULT true,
    "company_id" UUID NOT NULL,

    CONSTRAINT "cost_center_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "countries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "covenant" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT,
    "company_id" UUID NOT NULL,
    "is_active" BOOLEAN DEFAULT true,
    "guild_id" UUID NOT NULL,

    CONSTRAINT "covenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_form" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "company_id" UUID NOT NULL,
    "form" JSONB NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "custom_form_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_services" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customer_id" UUID,
    "service_name" TEXT,
    "service_validity" DATE,
    "company_id" UUID,
    "is_active" BOOLEAN DEFAULT true,
    "service_start" DATE,
    "contract_number" TEXT,

    CONSTRAINT "customer_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "cuit" BIGINT NOT NULL,
    "client_email" TEXT,
    "client_phone" BIGINT,
    "address" TEXT,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "is_active" BOOLEAN DEFAULT true,
    "company_id" UUID NOT NULL,
    "reason_for_termination" TEXT,
    "termination_date" DATE,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_indicators" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "snapshot_date" DATE NOT NULL,
    "metrics" JSONB NOT NULL DEFAULT '{}',
    "source" "indicator_function" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kpi_daily_indicators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dailyreport" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "creation_date" DATE DEFAULT CURRENT_DATE,
    "date" DATE NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "company_id" UUID NOT NULL,
    "is_active" BOOLEAN DEFAULT true,
    "status" "daily_report_header_status_new" NOT NULL DEFAULT 'abierto',

    CONSTRAINT "dailyreport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dailyreport_customer_equipment_relations" (
    "daily_report_row_id" UUID NOT NULL,
    "customer_equipment_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),

    CONSTRAINT "dailyreport_customer_equipment_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dailyreportemployeerelations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "daily_report_row_id" UUID,
    "employee_id" UUID,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "role" "employee_daily_report_role",

    CONSTRAINT "dailyreportemployeerelations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dailyreportequipmentrelations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "daily_report_row_id" UUID,
    "equipment_id" UUID,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "other_equipment_id" UUID,

    CONSTRAINT "dailyreportequipmentrelations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dailyreportrows" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "daily_report_id" UUID,
    "customer_id" UUID,
    "service_id" UUID,
    "item_id" UUID,
    "start_time" TIME(6),
    "end_time" TIME(6),
    "description" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "status" "daily_report_status" NOT NULL DEFAULT 'pendiente',
    "working_day" TEXT,
    "shift_12h" "daily_report_shift",
    "document_path" TEXT,
    "sector_service_id" UUID,
    "areas_service_id" UUID,
    "remit_number" TEXT,
    "cancel_reason" TEXT,
    "type_service" "daily_report_type_enum",
    "completed_day" BOOLEAN,
    "completed_night" BOOLEAN,
    "preparte_id" UUID,
    "last_comercial_edit_at" TIMESTAMP(6),
    "cloned_from_row_id" UUID,

    CONSTRAINT "dailyreportrows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dailyreportrows_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "daily_report_row_id" UUID NOT NULL,
    "related_table" TEXT,
    "related_id" UUID,
    "action_type" TEXT NOT NULL,
    "changed_data" JSONB NOT NULL,
    "changed_fields" JSONB,
    "changed_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "reassignment_reason" TEXT,

    CONSTRAINT "dailyreportrows_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagram_type" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT,
    "company_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "color" TEXT NOT NULL,
    "short_description" TEXT NOT NULL,
    "work_active" BOOLEAN DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "computes_absenteeism" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "diagram_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagrams_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prev_date" TIMESTAMPTZ(6) NOT NULL,
    "description" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "prev_state" TEXT NOT NULL,
    "modified_by" UUID DEFAULT app_current_user_id(),
    "employee_id" UUID NOT NULL,
    "diagram_id" UUID NOT NULL,

    CONSTRAINT "diagrams_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "applies" "document_applies" NOT NULL,
    "multiresource" BOOLEAN NOT NULL,
    "mandatory" BOOLEAN NOT NULL,
    "explired" BOOLEAN NOT NULL,
    "special" BOOLEAN NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "company_id" UUID,
    "is_it_montlhy" BOOLEAN,
    "private" BOOLEAN,
    "down_document" BOOLEAN,
    "has_policy_number" BOOLEAN DEFAULT false,
    "conditions" JSONB[],
    "equipment_type" VARCHAR(20),
    "available_for_pre_file" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "document_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents_company" (
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_document_types" UUID,
    "validity" TEXT,
    "state" "state" NOT NULL DEFAULT 'pendiente',
    "is_active" BOOLEAN DEFAULT true,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "applies" UUID NOT NULL,
    "deny_reason" TEXT,
    "document_path" TEXT,
    "period" TEXT,

    CONSTRAINT "documents_company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents_contracts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "date" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "size" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey1" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents_employees" (
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_document_types" UUID,
    "validity" TIMESTAMPTZ(6),
    "state" "state" NOT NULL DEFAULT 'pendiente',
    "is_active" BOOLEAN DEFAULT true,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "applies" UUID,
    "deny_reason" TEXT,
    "document_path" TEXT,
    "period" TEXT,
    "archived_at" TIMESTAMPTZ(6),

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents_employees_logs" (
    "id" SERIAL NOT NULL,
    "documents_employees_id" UUID NOT NULL,
    "modified_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_employees_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents_equipment" (
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_document_types" UUID,
    "applies" UUID,
    "validity" TIMESTAMPTZ(6),
    "state" "state" DEFAULT 'pendiente',
    "is_active" BOOLEAN DEFAULT true,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "deny_reason" TEXT,
    "document_path" TEXT,
    "period" TEXT,
    "policy_number" TEXT,
    "archived_at" TIMESTAMPTZ(6),

    CONSTRAINT "documents_equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents_equipment_logs" (
    "id" SERIAL NOT NULL,
    "documents_equipment_id" UUID NOT NULL,
    "modified_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_equipment_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empleado_aptitudes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empleado_id" UUID NOT NULL,
    "aptitud_id" UUID NOT NULL,
    "tiene_aptitud" BOOLEAN DEFAULT false,
    "fecha_verificacion" DATE,
    "observaciones" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "empleado_aptitudes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "picture" TEXT,
    "nationality" "nationality_enum",
    "lastname" TEXT NOT NULL,
    "firstname" TEXT NOT NULL,
    "cuil" TEXT NOT NULL,
    "document_type" "document_type_enum",
    "document_number" TEXT NOT NULL,
    "birthplace" UUID NOT NULL,
    "gender" "gender_enum",
    "marital_status" "marital_status_enum",
    "level_of_education" "level_of_education_enum",
    "street" TEXT NOT NULL,
    "street_number" TEXT NOT NULL,
    "province" BIGINT NOT NULL,
    "postal_code" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "file" TEXT NOT NULL,
    "normal_hours" TEXT,
    "date_of_admission" DATE NOT NULL,
    "affiliate_status" "affiliate_status_enum",
    "city" BIGINT,
    "hierarchical_position" UUID,
    "workflow_diagram" UUID,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "allocated_to" UUID[],
    "company_id" UUID,
    "is_active" BOOLEAN DEFAULT true,
    "reason_for_termination" "reason_for_termination_enum",
    "termination_date" DATE,
    "status" "status_type" DEFAULT 'Incompleto',
    "category_id" UUID,
    "covenants_id" UUID,
    "guild_id" UUID,
    "cost_center_id" UUID,
    "born_date" TEXT,
    "company_position" UUID,
    "type_of_contract" UUID,
    "cost_type" "cost_type_enum",
    "full_name" TEXT GENERATED ALWAYS AS (((COALESCE(lastname, ''::text) || ' '::text) || COALESCE(firstname, ''::text))) STORED,

    CONSTRAINT "companies_employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees_diagram" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "employee_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "diagram_type" UUID NOT NULL DEFAULT gen_random_uuid(),
    "day" DECIMAL NOT NULL,
    "month" DECIMAL NOT NULL,
    "year" DECIMAL NOT NULL,
    "is_active" BOOLEAN,
    "comments" TEXT,

    CONSTRAINT "employees_diagram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_owner_contract_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "equipment_owner_id" UUID NOT NULL,
    "contract_type" "contract_type_enum" NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipment_owner_contract_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_owners" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "cuit" TEXT NOT NULL,
    "contract_type" "contract_type_enum" NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "company_id" UUID,
    "is_active" BOOLEAN DEFAULT true,

    CONSTRAINT "equipment_owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipos_clientes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "type" "type_equipment" NOT NULL,
    "customer_id" UUID NOT NULL,

    CONSTRAINT "equipos_clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_answers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "form_id" UUID NOT NULL,
    "answer" JSON NOT NULL,

    CONSTRAINT "form_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guild" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT,
    "company_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "guild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "handle_errors" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "menssage" TEXT NOT NULL,
    "path" TEXT NOT NULL,

    CONSTRAINT "handle_errors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hierarchy" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN DEFAULT true,
    "company_id" UUID NOT NULL,

    CONSTRAINT "hierarchy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "industry_type" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT,
    "is_active" BOOLEAN DEFAULT true,

    CONSTRAINT "industry_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpi_revisions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "kpi_id" UUID NOT NULL,
    "previous_number" TEXT,
    "new_number" TEXT,
    "previous_validity_date" DATE,
    "new_validity_date" DATE,
    "change_reason" TEXT,
    "changed_by" UUID NOT NULL,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kpi_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpis" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "number" TEXT,
    "validity_date" DATE NOT NULL,
    "calculation_formula" TEXT NOT NULL,
    "improvement_opportunities" TEXT,
    "filters" JSONB,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "technical_support" BOOLEAN DEFAULT true,

    CONSTRAINT "kpis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_activity_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "maintenance_request_id" UUID,
    "maintenance_order_id" UUID,
    "work_order_id" UUID,
    "action_type" TEXT NOT NULL,
    "performed_by" UUID,
    "performed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "previous_status" TEXT,
    "new_status" TEXT,
    "notes" TEXT,
    "rejection_reason" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "company_id" UUID NOT NULL,

    CONSTRAINT "maintenance_activity_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_group_type_of_repairs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "group_id" UUID,

    CONSTRAINT "maintenance_group_type_of_repairs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_order_item_repair_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "maintenance_order_item_id" UUID NOT NULL,
    "repair_type_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_order_item_repair_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "maintenance_order_id" UUID NOT NULL,
    "maintenance_request_item_id" UUID,
    "repair_type_id" UUID,
    "description" TEXT,
    "images" TEXT[],
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "assigned_at" TIMESTAMPTZ(6),
    "assigned_by" UUID,
    "assigned_sector_id" UUID,
    "assigned_workshop_id" UUID,
    "planned_end_date" DATE,
    "planned_start_date" DATE,
    "work_order_id" UUID,
    "is_critical" BOOLEAN DEFAULT false,
    "is_diagnostico" BOOLEAN NOT NULL DEFAULT false,
    "sector_sequence_order" INTEGER,
    "is_rejected" BOOLEAN NOT NULL DEFAULT false,
    "rejected_at" TIMESTAMPTZ(6),
    "rejected_by" UUID,
    "rejection_reason" TEXT,
    "workshop_chief_comment_by" UUID,
    "workshop_chief_comment" TEXT,
    "maintenance_group_id" UUID,
    "company_id" UUID NOT NULL,

    CONSTRAINT "maintenance_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "maintenance_request_id" UUID,
    "equipment_id" UUID,
    "other_equipment_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'pending_scheduling',
    "scheduled_date" DATE,
    "scheduled_by" UUID,
    "scheduled_at" TIMESTAMPTZ(6),
    "rejection_reason" TEXT,
    "rejected_by" UUID,
    "rejected_at" TIMESTAMPTZ(6),
    "workshop_entry_date" TIMESTAMPTZ(6),
    "workshop_approved_by" UUID,
    "kilometer_at_entry" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "date_approved_at" TIMESTAMPTZ(6),
    "date_approved_by" UUID,
    "date_rejected_at" TIMESTAMPTZ(6),
    "date_rejected_by" UUID,
    "date_rejection_reason" TEXT,
    "source" TEXT DEFAULT 'checklist',
    "operations_validated_at" TIMESTAMPTZ(6),
    "operations_validated_by" UUID,
    "operations_validation_notes" TEXT,
    "order_number" TEXT,
    "workshop_validated_at" TIMESTAMPTZ(6),
    "workshop_validation_notes" TEXT,
    "engine_hours_at_entry" TEXT,
    "preventive_type" TEXT,
    "description" TEXT,
    "company_id" UUID NOT NULL,

    CONSTRAINT "maintenance_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_request_groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_request_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_request_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "maintenance_request_id" UUID NOT NULL,
    "checklist_deviation_id" UUID,
    "repair_type_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rejection_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "free_text" TEXT,
    "images" TEXT[],
    "driver_comment" TEXT,
    "validator_comment" TEXT,
    "driver_comment_by" UUID,
    "supervisor_comment" TEXT,
    "supervisor_comment_by" UUID,
    "validator_comment_by" UUID,
    "maintenance_group_id" UUID,
    "company_id" UUID NOT NULL,

    CONSTRAINT "maintenance_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "checklist_answer_id" UUID,
    "equipment_id" UUID,
    "other_equipment_id" UUID,
    "employee_id" UUID,
    "user_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'pending_approval',
    "rejection_reason" TEXT,
    "rejected_by" UUID,
    "rejected_at" TIMESTAMPTZ(6),
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "kilometer" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "supervisor_id" UUID,
    "source" TEXT DEFAULT 'checklist',
    "engine_hours" TEXT,
    "preventive_type" TEXT,
    "driver_employee_id" UUID,
    "description" TEXT,
    "company_id" UUID NOT NULL,

    CONSTRAINT "maintenance_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "measure_units" (
    "id" SERIAL NOT NULL,
    "unit" VARCHAR(50) NOT NULL,
    "simbol" VARCHAR(10) NOT NULL,
    "tipo" VARCHAR(20) NOT NULL,

    CONSTRAINT "measure_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_vehicles" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT,
    "brand" INTEGER,
    "is_active" BOOLEAN DEFAULT true,
    "company_id" UUID NOT NULL,

    CONSTRAINT "model_vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "price" DECIMAL NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "order_index" INTEGER DEFAULT 0,
    "slug" TEXT,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT,
    "description" TEXT,
    "category" "notification_categories",
    "company_id" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "document_id" UUID,
    "reference" TEXT,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "other_equipment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "type_id" UUID NOT NULL,
    "sub_type_id" UUID,
    "brand_id" INTEGER,
    "model_id" INTEGER,
    "serial_number" TEXT,
    "year" TEXT,
    "condition" "condition_enum" DEFAULT 'operativo',
    "status" "status_type",
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "intern_number" TEXT,
    "pictures" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "horometer" DECIMAL,
    "blueprints" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "manufacturer_plate" TEXT,
    "composition" TEXT,
    "invoice_number" TEXT,
    "initial_value" DECIMAL,
    "currency" "currency_enum",
    "purchase_date" DATE,
    "cost_type" "cost_type_enum",
    "cost_center_id" UUID,
    "sector" UUID,
    "linked_vehicle_id" UUID,
    "owner_id" UUID,
    "type_of_contract" "contract_type_vehicles_enum",
    "contract_start_date" DATE,
    "contract_expiration_date" DATE,
    "contract_number" TEXT,
    "has_certification" BOOLEAN NOT NULL DEFAULT false,
    "certification_expiration_date" DATE,
    "certification_number" TEXT,
    "reason_for_termination" "termination_reason_enum",
    "termination_date" DATE,
    "user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "other_equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "other_equipment_certifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "equipment_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "expiration_date" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "other_equipment_certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_id" UUID,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMPTZ(6) NOT NULL,
    "used" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preparte" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cliente_id" UUID NOT NULL,
    "contrato_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "jornada" TEXT NOT NULL,
    "start_time" TEXT,
    "end_time" TEXT,
    "solicitante" TEXT NOT NULL,
    "item" UUID,
    "observaciones" TEXT,
    "executionDate" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "quantity" DECIMAL,
    "requestDate" TIMESTAMPTZ(6),
    "cancel_reason" TEXT,
    "numero_pedido" TEXT,
    "rejected_reason" TEXT,
    "reprogram" UUID,
    "reprogram_reason" TEXT,
    "company_id" UUID,
    "sector_service_id" UUID,
    "areas_service_id" UUID,
    "equipos_cliente" UUID,
    "status" "preparte_status",
    "preparteImage" TEXT,
    "confirmed_by" TEXT,
    "rejected_by" UUID,
    "cancelled_by" UUID,
    "reprogrammed_by" UUID,
    "subject_to_availability" BOOLEAN DEFAULT false,

    CONSTRAINT "preparte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preparte_change_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "preparte_id" UUID NOT NULL,
    "field_name" TEXT NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT,
    "reason" TEXT NOT NULL,
    "changed_by" UUID,
    "changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB DEFAULT '{}',

    CONSTRAINT "preparte_change_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pre_employees" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "company_id" UUID NOT NULL,
    "pre_file_number" TEXT NOT NULL,
    "status" "pre_employee_status_enum" NOT NULL DEFAULT 'en_proceso',
    "firstname" TEXT NOT NULL,
    "lastname" TEXT NOT NULL,
    "cuil" TEXT NOT NULL,
    "document_type" "document_type_enum",
    "document_number" TEXT NOT NULL,
    "born_date" TEXT,
    "nationality" "nationality_enum",
    "birthplace" UUID NOT NULL,
    "gender" "gender_enum",
    "marital_status" "marital_status_enum",
    "level_of_education" "level_of_education_enum",
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

    CONSTRAINT "pre_employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents_pre_employees" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pre_employee_id" UUID NOT NULL,
    "document_type_id" UUID NOT NULL,
    "document_path" TEXT NOT NULL,
    "validity" TIMESTAMPTZ(6),
    "uploaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID,
    "company_id" UUID NOT NULL,

    CONSTRAINT "documents_pre_employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "credential_id" UUID,
    "email" TEXT,
    "avatar" TEXT,
    "fullname" TEXT,
    "role" TEXT DEFAULT 'User',
    "modulos" "modulos"[],
    "employee_id" UUID,

    CONSTRAINT "profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provinces" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,

    CONSTRAINT "provinces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "remito_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "remit_id" UUID NOT NULL,
    "document_path" TEXT NOT NULL,
    "document_name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "remito_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "remitos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "daily_report_row_id" UUID NOT NULL,
    "remit_number" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "is_linked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "remitos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "role_id" BIGINT NOT NULL,
    "tab_id" UUID NOT NULL,
    "action_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN DEFAULT true,
    "intern" BOOLEAN DEFAULT false,
    "color" TEXT,
    "description" TEXT,
    "is_system" BOOLEAN DEFAULT false,
    "slug" TEXT,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_hidden_equipment_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "role_id" BIGINT NOT NULL,
    "type_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_hidden_equipment_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_equipment_type_visibility" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type_id" UUID NOT NULL,
    "is_visible" BOOLEAN NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_equipment_type_visibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sector_customer" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sector_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT timezone('utc'::text, now()),

    CONSTRAINT "sector_customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sector_repair_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workshop_sector_id" UUID NOT NULL,
    "repair_type_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sector_repair_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sectors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "descripcion_corta" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT timezone('utc'::text, now()),

    CONSTRAINT "sectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_areas" (
    "service_id" UUID NOT NULL,
    "area_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),

    CONSTRAINT "service_areas_pkey" PRIMARY KEY ("service_id","area_id","id")
);

-- CreateTable
CREATE TABLE "service_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customer_service_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "item_name" TEXT NOT NULL,
    "item_description" TEXT NOT NULL,
    "item_price" DECIMAL NOT NULL,
    "item_measure_units" INTEGER NOT NULL,
    "is_active" BOOLEAN DEFAULT true,
    "code_item" TEXT,
    "item_number" TEXT,
    "needs_equipment" BOOLEAN NOT NULL DEFAULT true,
    "needs_personnel" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "service_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_sectors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "service_id" UUID NOT NULL,
    "sector_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_sectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_company_users" (
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "profile_id" UUID DEFAULT gen_random_uuid(),
    "company_id" UUID DEFAULT gen_random_uuid(),
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID,
    "modules" "modulos"[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "share_company_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sub_type" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN DEFAULT true,
    "company_id" UUID,
    "type" UUID,
    "tire_template_id" UUID,

    CONSTRAINT "sub_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sub_type_compatible_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sub_type_id" UUID NOT NULL,
    "compatible_item_id" UUID NOT NULL,
    "item_type" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sub_type_compatible_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_ticket_views" (
    "user_id" UUID NOT NULL,
    "taskapp_ticket_id" BIGINT NOT NULL,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_status_id" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_ticket_views_pkey" PRIMARY KEY ("user_id","taskapp_ticket_id")
);

-- CreateTable
CREATE TABLE "tabs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "module_id" UUID NOT NULL,
    "parent_tab_id" UUID,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order_index" INTEGER DEFAULT 0,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tabs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "type" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN DEFAULT true,
    "company_id" UUID,
    "has_hitch" BOOLEAN DEFAULT false,
    "is_tractor_unit" BOOLEAN DEFAULT false,
    "applies_to" VARCHAR(20) DEFAULT 'vehicle',
    "generates_qr" BOOLEAN DEFAULT true,
    "is_operative" BOOLEAN DEFAULT false,

    CONSTRAINT "type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "type_hitch_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type_id" UUID NOT NULL,
    "compatible_type_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "company_id" UUID NOT NULL,

    CONSTRAINT "type_hitch_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "type_operative" (
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),

    CONSTRAINT "type_operative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "types_of_contract" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "company_id" UUID NOT NULL,

    CONSTRAINT "types_of_contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "types_of_repairs" (
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "criticity" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "company_id" UUID,
    "type_of_maintenance" "type_of_maintenance_ENUM",
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "multi_equipment" BOOLEAN NOT NULL DEFAULT false,
    "qr_close" BOOLEAN NOT NULL DEFAULT false,
    "autorizable" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "types_of_repairs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "types_of_vehicles" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT,
    "is_active" BOOLEAN DEFAULT true,

    CONSTRAINT "types_of_vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "tab_id" UUID NOT NULL,
    "action_id" UUID NOT NULL,
    "is_granted" BOOLEAN DEFAULT true,
    "assigned_by" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "role_id" BIGINT NOT NULL,
    "assigned_by" UUID,
    "assigned_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "picture" TEXT,
    "type_of_vehicle" BIGINT NOT NULL,
    "domain" TEXT,
    "chassis" TEXT,
    "engine" TEXT NOT NULL,
    "serie" TEXT,
    "intern_number" TEXT,
    "year" TEXT NOT NULL,
    "brand" INTEGER,
    "model" INTEGER,
    "is_active" BOOLEAN DEFAULT true,
    "termination_date" DATE,
    "reason_for_termination" "termination_reason_enum",
    "user_id" UUID DEFAULT app_current_user_id(),
    "company_id" UUID,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" UUID NOT NULL,
    "status" "status_type" DEFAULT 'Incompleto',
    "allocated_to" UUID[],
    "condition" "condition_enum" DEFAULT 'operativo',
    "kilometer" TEXT DEFAULT '0',
    "cost_center_id" UUID,
    "type_operative_id" UUID,
    "subType" UUID,
    "owner_id" UUID,
    "type_of_contract" "contract_type_vehicles_enum",
    "contract_expiration_date" DATE,
    "contract_start_date" DATE,
    "contract_number" TEXT,
    "has_certification" BOOLEAN NOT NULL DEFAULT false,
    "certification_expiration_date" DATE,
    "certification_number" TEXT,
    "currency" "currency_enum",
    "price" DECIMAL(15,2),
    "cost_type" "cost_type_enum",
    "sector" UUID,
    "engine_hours" TEXT DEFAULT '0',
    "tire_template_id" UUID,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tire_brands" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "company_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tire_brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tire_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "tread_type" "TireTreadType" NOT NULL,
    "company_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tire_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tires" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "serial_number" TEXT NOT NULL,
    "brand_id" UUID NOT NULL,
    "tire_type_id" UUID NOT NULL,
    "is_new" BOOLEAN NOT NULL DEFAULT true,
    "retread_level" "TireRetreadLevel",
    "tread_depth" DECIMAL(5,2),
    "status" "TireStatus" NOT NULL DEFAULT 'AVAILABLE',
    "discard_photo" TEXT,
    "discard_comment" TEXT,
    "discarded_at" TIMESTAMPTZ(6),
    "company_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tires_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tire_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_vehicle_override" BOOLEAN NOT NULL DEFAULT false,
    "source_template_id" UUID,
    "company_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tire_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tire_template_axles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "template_id" UUID NOT NULL,
    "axle_number" INTEGER NOT NULL,
    "tires_per_side" INTEGER NOT NULL,
    "tire_size" TEXT,
    "is_drive_axle" BOOLEAN NOT NULL DEFAULT false,
    "is_spare" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tire_template_axles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_tire_positions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vehicle_id" UUID NOT NULL,
    "template_axle_id" UUID NOT NULL,
    "position_number" INTEGER NOT NULL,
    "axle_number" INTEGER NOT NULL,
    "side" "TirePositionSide" NOT NULL,
    "tire_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "vehicle_tire_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_axle_tire_sizes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vehicle_id" UUID NOT NULL,
    "axle_number" INTEGER NOT NULL,
    "tire_size" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "vehicle_axle_tire_sizes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tire_service_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vehicle_id" UUID NOT NULL,
    "trailer_vehicle_id" UUID,
    "kilometer" TEXT,
    "service_date" TIMESTAMPTZ(6) NOT NULL,
    "status" "TireServiceOrderStatus" NOT NULL DEFAULT 'OPEN',
    "created_by" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMPTZ(6),
    "axle_snapshot" JSONB,
    "positions_snapshot" JSONB,

    CONSTRAINT "tire_service_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tire_service_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "service_order_id" UUID NOT NULL,
    "position_number" INTEGER NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "action" "TireServiceAction" NOT NULL,
    "tire_id" UUID,
    "new_tire_id" UUID,
    "old_tire_destination" "TireOldDestination",
    "tread_depth" DECIMAL(5,2),
    "pressure_start" DECIMAL(5,1),
    "pressure_end" DECIMAL(5,1),
    "observations" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tire_service_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_diagram" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN DEFAULT true,
    "active_working_days" DECIMAL,
    "inactive_novelty" UUID,
    "inactive_working_days" DECIMAL,
    "company_id" UUID NOT NULL,

    CONSTRAINT "work-diagram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_diagram_active_novelties" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "work_diagram_id" UUID NOT NULL,
    "diagram_type_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "company_id" UUID NOT NULL,

    CONSTRAINT "work_diagram_active_novelties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_order_item_repairs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "work_order_item_id" UUID NOT NULL,
    "repair_type_id" UUID NOT NULL,
    "status" "work_order_item_status" NOT NULL DEFAULT 'pending',
    "technician_notes" TEXT,
    "completed_at" TIMESTAMPTZ(6),
    "completed_by" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "added_by" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "approved_by" UUID,
    "is_diagnostico" BOOLEAN NOT NULL DEFAULT false,
    "is_operator_added" BOOLEAN DEFAULT false,
    "original_sector_id" UUID,
    "rejection_reason" TEXT,
    "return_reason" TEXT,
    "technician_notes_by" UUID,
    "company_id" UUID NOT NULL,

    CONSTRAINT "work_order_item_repairs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "work_order_id" UUID NOT NULL,
    "maintenance_order_item_id" UUID NOT NULL,
    "status" "work_order_item_status" NOT NULL DEFAULT 'pending',
    "technician_notes" TEXT,
    "completed_at" TIMESTAMPTZ(6),
    "completed_by" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_number" TEXT NOT NULL,
    "sequence_number" INTEGER NOT NULL,
    "company_id" UUID NOT NULL,
    "equipment_id" UUID,
    "other_equipment_id" UUID,
    "workshop_id" UUID NOT NULL,
    "sector_id" UUID,
    "status" "work_order_status" NOT NULL DEFAULT 'pending',
    "planned_start_date" DATE NOT NULL,
    "planned_end_date" DATE NOT NULL,
    "actual_start_date" TIMESTAMPTZ(6),
    "actual_end_date" TIMESTAMPTZ(6),
    "notes" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "started_by" UUID,
    "started_at" TIMESTAMPTZ(6),
    "completed_by" UUID,
    "completed_at" TIMESTAMPTZ(6),
    "cancelled_by" UUID,
    "cancelled_at" TIMESTAMPTZ(6),
    "cancellation_reason" TEXT,
    "pause_reason" TEXT,
    "paused_at" TIMESTAMPTZ(6),
    "paused_by" UUID,
    "priority" "work_order_priority" NOT NULL DEFAULT 'medium',
    "total_paused_time" interval DEFAULT '00:00:00'::interval,

    CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_workshop_sectors" (
    "employee_id" UUID NOT NULL,
    "workshop_sector_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_workshop_sectors_pkey" PRIMARY KEY ("employee_id","workshop_sector_id")
);

-- CreateTable
CREATE TABLE "workshop_sectors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "workshop_id" UUID NOT NULL,
    "max_capacity" INTEGER,
    "company_id" UUID NOT NULL,

    CONSTRAINT "workshop_sectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workshops" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" BIGINT,
    "province" BIGINT,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "type" "workshop_type" NOT NULL DEFAULT 'interno',
    "provider_name" TEXT,
    "provider_phone" TEXT,
    "provider_email" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "company_id" UUID NOT NULL,

    CONSTRAINT "workshops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_table_preferences" (
    "user_id" TEXT NOT NULL,
    "preferences" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_table_preferences_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "external_api_clients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "secret_hash" TEXT NOT NULL,
    "secret_prefix" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "revoked_at" TIMESTAMPTZ(6),
    "last_used_at" TIMESTAMPTZ(6),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "revoked_by" UUID,

    CONSTRAINT "external_api_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_api_access_logs" (
    "id" BIGSERIAL NOT NULL,
    "external_api_client_id" UUID,
    "attempted_client_id" TEXT,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'GET',
    "path" TEXT NOT NULL,
    "query_params" JSONB,
    "status_code" INTEGER NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "response_time_ms" INTEGER,
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_api_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "actions_slug_key" ON "actions"("slug");

-- CreateIndex
CREATE INDEX "idx_aptitudes_tecnicas_company_id" ON "aptitudes_tecnicas"("company_id");

-- CreateIndex
CREATE INDEX "idx_aptitudes_tecnicas_puestos_puesto_id" ON "aptitudes_tecnicas_puestos"("puesto_id");

-- CreateIndex
CREATE UNIQUE INDEX "area_province_id_key" ON "area_province"("id");

-- CreateIndex
CREATE UNIQUE INDEX "brand_vehicles_name_key" ON "brand_vehicles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "category_employee_created_at_key" ON "category_employee"("created_at");

-- CreateIndex
CREATE INDEX "idx_checklist_answers_created" ON "checklist_answers"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_checklist_answers_equipment" ON "checklist_answers"("equipment_id");

-- CreateIndex
CREATE INDEX "idx_checklist_answers_template" ON "checklist_answers"("template_id");

-- CreateIndex
CREATE INDEX "idx_checklist_answers_company_id" ON "checklist_answers"("company_id");

-- CreateIndex
CREATE INDEX "idx_checklist_deviations_checklist_answer_id" ON "checklist_deviations"("checklist_answer_id");

-- CreateIndex
CREATE INDEX "idx_checklist_deviations_equipment_id" ON "checklist_deviations"("equipment_id");

-- CreateIndex
CREATE INDEX "idx_checklist_deviations_pending" ON "checklist_deviations"("equipment_id") WHERE (equipment_id IS NOT NULL);

-- CreateIndex
CREATE INDEX "idx_checklist_deviations_company_id" ON "checklist_deviations"("company_id");

-- CreateIndex
CREATE INDEX "idx_checklist_items_code" ON "checklist_items"("code");

-- CreateIndex
CREATE INDEX "idx_checklist_items_section" ON "checklist_items"("section_id");

-- CreateIndex
CREATE UNIQUE INDEX "checklist_items_section_id_code_key" ON "checklist_items"("section_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "checklist_sections_code_key" ON "checklist_sections"("code");

-- CreateIndex
CREATE INDEX "idx_checklist_template_items_section" ON "checklist_template_items"("section_id");

-- CreateIndex
CREATE INDEX "idx_checklist_template_items_template" ON "checklist_template_items"("template_id");

-- CreateIndex
CREATE UNIQUE INDEX "checklist_template_items_template_id_section_id_code_key" ON "checklist_template_items"("template_id", "section_id", "code");

-- CreateIndex
CREATE INDEX "idx_checklist_template_sections_template" ON "checklist_template_sections"("template_id");

-- CreateIndex
CREATE UNIQUE INDEX "checklist_template_sections_template_id_code_key" ON "checklist_template_sections"("template_id", "code");

-- CreateIndex
CREATE INDEX "idx_checklist_template_sub_types_sub_type" ON "checklist_template_sub_types"("sub_type_id");

-- CreateIndex
CREATE INDEX "idx_checklist_template_sub_types_template" ON "checklist_template_sub_types"("template_id");

-- CreateIndex
CREATE UNIQUE INDEX "checklist_template_sub_types_template_id_sub_type_id_key" ON "checklist_template_sub_types"("template_id", "sub_type_id");

-- CreateIndex
CREATE INDEX "idx_checklist_template_types_template" ON "checklist_template_types"("template_id");

-- CreateIndex
CREATE INDEX "idx_checklist_template_types_type" ON "checklist_template_types"("type_id");

-- CreateIndex
CREATE INDEX "idx_checklist_template_types_company_id" ON "checklist_template_types"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "checklist_template_types_template_id_type_id_key" ON "checklist_template_types"("template_id", "type_id");

-- CreateIndex
CREATE INDEX "idx_checklist_templates_code" ON "checklist_templates"("code");

-- CreateIndex
CREATE INDEX "idx_checklist_templates_company_id" ON "checklist_templates"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "checklist_templates_company_id_code_key" ON "checklist_templates"("company_id", "code");

-- CreateIndex
CREATE INDEX "cities_province_id_idx" ON "cities"("province_id");

-- CreateIndex
CREATE UNIQUE INDEX "clothing_brands_name_company_id_key" ON "clothing_brands"("name", "company_id");

-- CreateIndex
CREATE INDEX "idx_clothing_deliveries_employee" ON "clothing_deliveries"("employee_id");

-- CreateIndex
CREATE INDEX "idx_clothing_deliveries_company_id" ON "clothing_deliveries"("company_id");

-- CreateIndex
CREATE INDEX "idx_clothing_delivery_items_delivery" ON "clothing_delivery_items"("clothing_delivery_id");

-- CreateIndex
CREATE UNIQUE INDEX "clothing_item_brand_sizes_unique_key" ON "clothing_item_brand_sizes"("clothing_item_id", "clothing_brand_id", "clothing_size_id");

-- CreateIndex
CREATE UNIQUE INDEX "clothing_items_name_company_id_key" ON "clothing_items"("name", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "clothing_sizes_name_company_id_key" ON "clothing_sizes"("name", "company_id");

-- CreateIndex
CREATE INDEX "idx_companies_employees_company_id" ON "companies_employees"("company_id");

-- CreateIndex
CREATE INDEX "companies_employees_employee_id_idx" ON "companies_employees"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_compay_cuit_key" ON "company"("company_cuit");

-- CreateIndex
CREATE INDEX "idx_company_positions_company_id" ON "company_positions"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_contractor_employee" ON "contractor_employee"("employee_id", "contractor_id");

-- CreateIndex
CREATE UNIQUE INDEX "contractor_equipment_employee_id_contractor_id_key" ON "contractor_equipment"("equipment_id", "contractor_id");

-- CreateIndex
CREATE INDEX "idx_contractor_other_equipment_contractor" ON "contractor_other_equipment"("contractor_id");

-- CreateIndex
CREATE INDEX "idx_contractor_other_equipment_equipment" ON "contractor_other_equipment"("equipment_id");

-- CreateIndex
CREATE UNIQUE INDEX "contractor_other_equipment_equipment_id_contractor_id_key" ON "contractor_other_equipment"("equipment_id", "contractor_id");

-- CreateIndex
CREATE UNIQUE INDEX "cost_center_name_key" ON "cost_center"("name");

-- CreateIndex
CREATE INDEX "idx_cost_center_company_id" ON "cost_center"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "customers_cuit_key" ON "customers"("cuit");

-- CreateIndex
CREATE INDEX "idx_kpi_daily_indicators_company_date" ON "daily_indicators"("company_id", "snapshot_date");

-- CreateIndex
CREATE INDEX "idx_kpi_daily_indicators_source" ON "daily_indicators"("source");

-- CreateIndex
CREATE UNIQUE INDEX "daily_indicators_company_id_snapshot_date_source_uidx" ON "daily_indicators"("company_id", "snapshot_date", "source");

-- CreateIndex
CREATE UNIQUE INDEX "dailyreport_date_company_id_key" ON "dailyreport"("date", "company_id");

-- CreateIndex
CREATE INDEX "idx_dailyreportemployeerelations_row_id" ON "dailyreportemployeerelations"("daily_report_row_id");

-- CreateIndex
CREATE INDEX "idx_dailyreportequipmentrelations_row_id" ON "dailyreportequipmentrelations"("daily_report_row_id");

-- CreateIndex
CREATE INDEX "idx_daily_equip_rel_other_equipment" ON "dailyreportequipmentrelations"("other_equipment_id") WHERE (other_equipment_id IS NOT NULL);

-- CreateIndex
CREATE UNIQUE INDEX "dailyreportrows_remit_number_key" ON "dailyreportrows"("remit_number");

-- CreateIndex
CREATE UNIQUE INDEX "dailyreportrows_preparte_id_key" ON "dailyreportrows"("preparte_id");

-- CreateIndex
CREATE INDEX "idx_dailyreportrows_daily_report_id" ON "dailyreportrows"("daily_report_id");

-- CreateIndex
CREATE INDEX "idx_dailyreportrows_cloned_from_row_id" ON "dailyreportrows"("cloned_from_row_id") WHERE (cloned_from_row_id IS NOT NULL);

-- CreateIndex
CREATE INDEX "idx_dailyreportrows_history_related" ON "dailyreportrows_history"("related_table", "related_id") WHERE (related_table IS NOT NULL);

-- CreateIndex
CREATE INDEX "idx_dailyreportrows_history_row_id" ON "dailyreportrows_history"("daily_report_row_id");

-- CreateIndex
CREATE INDEX "idx_document_types_equipment_type" ON "document_types"("equipment_type");

-- CreateIndex
CREATE UNIQUE INDEX "documents_company_document_path_key" ON "documents_company"("document_path");

-- CreateIndex
CREATE INDEX "idx_documents_company_applies" ON "documents_company"("applies");

-- CreateIndex
CREATE INDEX "idx_documents_contract_id" ON "documents_contracts"("contract_id");

-- CreateIndex
CREATE INDEX "idx_documents_name" ON "documents_contracts"("name");

-- CreateIndex
CREATE INDEX "idx_documents_type" ON "documents_contracts"("type");

-- CreateIndex
CREATE UNIQUE INDEX "empleado_aptitudes_empleado_id_aptitud_id_key" ON "empleado_aptitudes"("empleado_id", "aptitud_id");

-- CreateIndex
CREATE UNIQUE INDEX "companies_employees_cuil_key" ON "employees"("cuil");

-- CreateIndex
CREATE UNIQUE INDEX "companies_employees_document_number_key" ON "employees"("document_number");

-- CreateIndex
CREATE INDEX "idx_employees_type_of_contract" ON "employees"("type_of_contract");

-- CreateIndex
CREATE UNIQUE INDEX "unique_employee_year_month_day" ON "employees_diagram"("employee_id", "year", "month", "day");

-- CreateIndex
CREATE INDEX "idx_equipment_owner_contract_types_owner" ON "equipment_owner_contract_types"("equipment_owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_owner_contract_type_equipment_owner_id_contract_t_key" ON "equipment_owner_contract_types"("equipment_owner_id", "contract_type");

-- CreateIndex
CREATE INDEX "idx_hierarchy_company_id" ON "hierarchy"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "industry_type_type_key" ON "industry_type"("name");

-- CreateIndex
CREATE INDEX "idx_kpi_revisions_changed_by" ON "kpi_revisions"("changed_by");

-- CreateIndex
CREATE INDEX "idx_kpi_revisions_is_active" ON "kpi_revisions"("is_active");

-- CreateIndex
CREATE INDEX "idx_kpi_revisions_kpi_id" ON "kpi_revisions"("kpi_id");

-- CreateIndex
CREATE INDEX "idx_kpis_company_id" ON "kpis"("company_id");

-- CreateIndex
CREATE INDEX "idx_kpis_is_active" ON "kpis"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "kpis_company_id_code_key" ON "kpis"("company_id", "code");

-- CreateIndex
CREATE INDEX "idx_activity_log_order" ON "maintenance_activity_log"("maintenance_order_id") WHERE (maintenance_order_id IS NOT NULL);

-- CreateIndex
CREATE INDEX "idx_activity_log_performed_at" ON "maintenance_activity_log"("performed_at" DESC);

-- CreateIndex
CREATE INDEX "idx_activity_log_request" ON "maintenance_activity_log"("maintenance_request_id") WHERE (maintenance_request_id IS NOT NULL);

-- CreateIndex
CREATE INDEX "idx_activity_log_work_order" ON "maintenance_activity_log"("work_order_id") WHERE (work_order_id IS NOT NULL);

-- CreateIndex
CREATE INDEX "idx_maintenance_activity_log_company_id" ON "maintenance_activity_log"("company_id");

-- CreateIndex
CREATE INDEX "idx_moi_repair_types_item" ON "maintenance_order_item_repair_types"("maintenance_order_item_id");

-- CreateIndex
CREATE INDEX "idx_moi_repair_types_type" ON "maintenance_order_item_repair_types"("repair_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_order_item_repair_maintenance_order_item_id_rep_key" ON "maintenance_order_item_repair_types"("maintenance_order_item_id", "repair_type_id");

-- CreateIndex
CREATE INDEX "idx_maintenance_order_items_order" ON "maintenance_order_items"("maintenance_order_id");

-- CreateIndex
CREATE INDEX "idx_maintenance_order_items_request_item" ON "maintenance_order_items"("maintenance_request_item_id");

-- CreateIndex
CREATE INDEX "idx_moi_assigned_sector" ON "maintenance_order_items"("assigned_sector_id");

-- CreateIndex
CREATE INDEX "idx_moi_assigned_workshop" ON "maintenance_order_items"("assigned_workshop_id");

-- CreateIndex
CREATE INDEX "idx_moi_planned_dates" ON "maintenance_order_items"("planned_start_date", "planned_end_date");

-- CreateIndex
CREATE INDEX "idx_moi_work_order" ON "maintenance_order_items"("work_order_id");

-- CreateIndex
CREATE INDEX "idx_maintenance_order_items_company_id" ON "maintenance_order_items"("company_id");

-- CreateIndex
CREATE INDEX "idx_maintenance_order_items_group" ON "maintenance_order_items"("maintenance_group_id");

-- CreateIndex
CREATE INDEX "idx_maintenance_orders_equipment" ON "maintenance_orders"("equipment_id");

-- CreateIndex
CREATE INDEX "idx_maintenance_orders_order_number" ON "maintenance_orders"("order_number");

-- CreateIndex
CREATE INDEX "idx_maintenance_orders_request" ON "maintenance_orders"("maintenance_request_id");

-- CreateIndex
CREATE INDEX "idx_maintenance_orders_scheduled_date" ON "maintenance_orders"("scheduled_date");

-- CreateIndex
CREATE INDEX "idx_maintenance_orders_status" ON "maintenance_orders"("status");

-- CreateIndex
CREATE INDEX "idx_maintenance_orders_company_id" ON "maintenance_orders"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_request_groups_name_key" ON "maintenance_request_groups"("name");

-- CreateIndex
CREATE INDEX "idx_maintenance_request_items_deviation" ON "maintenance_request_items"("checklist_deviation_id");

-- CreateIndex
CREATE INDEX "idx_maintenance_request_items_request" ON "maintenance_request_items"("maintenance_request_id");

-- CreateIndex
CREATE INDEX "idx_maintenance_request_items_status" ON "maintenance_request_items"("status");

-- CreateIndex
CREATE INDEX "idx_maintenance_request_items_company_id" ON "maintenance_request_items"("company_id");

-- CreateIndex
CREATE INDEX "idx_maintenance_request_items_group" ON "maintenance_request_items"("maintenance_group_id");

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_request_items_maintenance_request_id_checklist__key" ON "maintenance_request_items"("maintenance_request_id", "checklist_deviation_id");

-- CreateIndex
CREATE INDEX "idx_maintenance_requests_checklist" ON "maintenance_requests"("checklist_answer_id");

-- CreateIndex
CREATE INDEX "idx_maintenance_requests_equipment" ON "maintenance_requests"("equipment_id");

-- CreateIndex
CREATE INDEX "idx_maintenance_requests_status" ON "maintenance_requests"("status");

-- CreateIndex
CREATE INDEX "idx_maintenance_requests_company_id" ON "maintenance_requests"("company_id");

-- CreateIndex
CREATE INDEX "idx_model_vehicles_company_id" ON "model_vehicles"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "modules_slug_key" ON "modules"("slug");

-- CreateIndex
CREATE INDEX "idx_other_equipment_company_id" ON "other_equipment"("company_id");

-- CreateIndex
CREATE INDEX "idx_other_equipment_is_active" ON "other_equipment"("is_active");

-- CreateIndex
CREATE INDEX "idx_other_equipment_linked_vehicle" ON "other_equipment"("linked_vehicle_id");

-- CreateIndex
CREATE INDEX "idx_other_equipment_type_id" ON "other_equipment"("type_id");

-- CreateIndex
CREATE INDEX "idx_other_equipment_certifications_equipment" ON "other_equipment_certifications"("equipment_id");

-- CreateIndex
CREATE INDEX "idx_password_reset_tokens_active" ON "password_reset_tokens"("profile_id", "used") WHERE (NOT used);

-- CreateIndex
CREATE INDEX "idx_password_reset_tokens_expires" ON "password_reset_tokens"("expires");

-- CreateIndex
CREATE INDEX "idx_password_reset_tokens_token" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "idx_preparte_cliente" ON "preparte"("cliente_id");

-- CreateIndex
CREATE INDEX "idx_preparte_fecha_ejecucion" ON "preparte"("executionDate");

-- CreateIndex
CREATE INDEX "idx_preparte_rejected_by" ON "preparte"("rejected_by");

-- CreateIndex
CREATE INDEX "idx_preparte_cancelled_by" ON "preparte"("cancelled_by");

-- CreateIndex
CREATE INDEX "idx_preparte_reprogrammed_by" ON "preparte"("reprogrammed_by");

-- CreateIndex
CREATE INDEX "idx_preparte_change_logs_changed_at" ON "preparte_change_logs"("changed_at" DESC);

-- CreateIndex
CREATE INDEX "idx_preparte_change_logs_field_name" ON "preparte_change_logs"("field_name");

-- CreateIndex
CREATE INDEX "idx_preparte_change_logs_preparte_id" ON "preparte_change_logs"("preparte_id");

-- CreateIndex
CREATE UNIQUE INDEX "pre_employees_employee_id_key" ON "pre_employees"("employee_id");

-- CreateIndex
CREATE INDEX "pre_employees_company_id_status_idx" ON "pre_employees"("company_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "pre_employees_company_id_pre_file_number_key" ON "pre_employees"("company_id", "pre_file_number");

-- CreateIndex
CREATE INDEX "idx_documents_pre_employees_company_id" ON "documents_pre_employees"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "documents_pre_employees_pre_employee_id_document_type_id_key" ON "documents_pre_employees"("pre_employee_id", "document_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "profile_credentialId_key" ON "profile"("credential_id");

-- CreateIndex
CREATE UNIQUE INDEX "profile_email_key" ON "profile"("email");

-- CreateIndex
CREATE INDEX "idx_profile_employee_id" ON "profile"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "provinces_id_key" ON "provinces"("id");

-- CreateIndex
CREATE INDEX "idx_remito_documents_remit_id" ON "remito_documents"("remit_id");

-- CreateIndex
CREATE INDEX "idx_remitos_daily_report_row_id" ON "remitos"("daily_report_row_id");

-- CreateIndex
CREATE INDEX "idx_remitos_is_linked" ON "remitos"("is_linked");

-- CreateIndex
CREATE INDEX "idx_role_permissions_role_id" ON "role_permissions"("role_id");

-- CreateIndex
CREATE INDEX "idx_role_permissions_tab_id" ON "role_permissions"("tab_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_id_tab_id_action_id_key" ON "role_permissions"("role_id", "tab_id", "action_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "roles_slug_key" ON "roles"("slug");

-- CreateIndex
CREATE INDEX "idx_role_hidden_equipment_types_type_id" ON "role_hidden_equipment_types"("type_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_hidden_equipment_types_role_id_type_id_key" ON "role_hidden_equipment_types"("role_id", "type_id");

-- CreateIndex
CREATE INDEX "idx_user_equipment_type_visibility_type_id" ON "user_equipment_type_visibility"("type_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_equipment_type_visibility_user_id_type_id_key" ON "user_equipment_type_visibility"("user_id", "type_id");

-- CreateIndex
CREATE UNIQUE INDEX "sector_customer_sector_id_customer_id_key" ON "sector_customer"("sector_id", "customer_id");

-- CreateIndex
CREATE INDEX "idx_sector_repair_types_repair" ON "sector_repair_types"("repair_type_id");

-- CreateIndex
CREATE INDEX "idx_sector_repair_types_sector" ON "sector_repair_types"("workshop_sector_id");

-- CreateIndex
CREATE UNIQUE INDEX "sector_repair_types_workshop_sector_id_repair_type_id_key" ON "sector_repair_types"("workshop_sector_id", "repair_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_areas_id_key" ON "service_areas"("id");

-- CreateIndex
CREATE UNIQUE INDEX "service_sectors_unique" ON "service_sectors"("service_id", "sector_id");

-- CreateIndex
CREATE UNIQUE INDEX "share_company_users_id2_key" ON "share_company_users"("id");

-- CreateIndex
CREATE INDEX "idx_sub_type_compatible_items_compatible_item_id" ON "sub_type_compatible_items"("compatible_item_id");

-- CreateIndex
CREATE INDEX "idx_sub_type_compatible_items_sub_type_id" ON "sub_type_compatible_items"("sub_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "sub_type_compatible_items_unique" ON "sub_type_compatible_items"("sub_type_id", "compatible_item_id", "item_type");

-- CreateIndex
CREATE INDEX "idx_support_ticket_views_user_id" ON "support_ticket_views"("user_id");

-- CreateIndex
CREATE INDEX "idx_tabs_module_id" ON "tabs"("module_id");

-- CreateIndex
CREATE INDEX "idx_tabs_parent_tab_id" ON "tabs"("parent_tab_id");

-- CreateIndex
CREATE UNIQUE INDEX "tabs_module_id_slug_key" ON "tabs"("module_id", "slug");

-- CreateIndex
CREATE INDEX "idx_type_applies_to" ON "type"("applies_to");

-- CreateIndex
CREATE INDEX "idx_type_hitch_types_compatible_type_id" ON "type_hitch_types"("compatible_type_id");

-- CreateIndex
CREATE INDEX "idx_type_hitch_types_type_id" ON "type_hitch_types"("type_id");

-- CreateIndex
CREATE INDEX "idx_type_hitch_types_company_id" ON "type_hitch_types"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "type_hitch_types_type_id_compatible_type_id_key" ON "type_hitch_types"("type_id", "compatible_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "type_operative_name_key" ON "type_operative"("name");

-- CreateIndex
CREATE UNIQUE INDEX "types_of_contract_name_key" ON "types_of_contract"("name");

-- CreateIndex
CREATE INDEX "idx_types_of_contract_company_id" ON "types_of_contract"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "types_of_repairs_id-2_key" ON "types_of_repairs"("id");

-- CreateIndex
CREATE INDEX "idx_user_permissions_tab_id" ON "user_permissions"("tab_id");

-- CreateIndex
CREATE INDEX "idx_user_permissions_user_id" ON "user_permissions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_permissions_user_id_tab_id_action_id_key" ON "user_permissions"("user_id", "tab_id", "action_id");

-- CreateIndex
CREATE INDEX "idx_user_roles_role_id" ON "user_roles"("role_id");

-- CreateIndex
CREATE INDEX "idx_user_roles_user_id" ON "user_roles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_id_key" ON "user_roles"("user_id", "role_id");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_domain_key" ON "vehicles"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_id2_key" ON "vehicles"("id");

-- CreateIndex
CREATE UNIQUE INDEX "tire_brands_name_company_id_key" ON "tire_brands"("name", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "tire_types_size_tread_type_company_id_key" ON "tire_types"("size", "tread_type", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "tires_serial_number_company_id_key" ON "tires"("serial_number", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "tire_template_axles_template_id_axle_number_key" ON "tire_template_axles"("template_id", "axle_number");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_tire_positions_vehicle_id_position_number_key" ON "vehicle_tire_positions"("vehicle_id", "position_number");

-- CreateIndex
CREATE INDEX "vehicle_axle_tire_sizes_vehicle_id_idx" ON "vehicle_axle_tire_sizes"("vehicle_id");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_axle_tire_sizes_vehicle_id_axle_number_key" ON "vehicle_axle_tire_sizes"("vehicle_id", "axle_number");

-- CreateIndex
CREATE INDEX "idx_work_diagram_company_id" ON "work_diagram"("company_id");

-- CreateIndex
CREATE INDEX "idx_work_diagram_active_novelties_company_id" ON "work_diagram_active_novelties"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "work_diagram_active_novelties_unique" ON "work_diagram_active_novelties"("work_diagram_id", "diagram_type_id");

-- CreateIndex
CREATE INDEX "idx_work_order_item_repairs_status" ON "work_order_item_repairs"("status");

-- CreateIndex
CREATE INDEX "idx_work_order_item_repairs_work_order_item_id" ON "work_order_item_repairs"("work_order_item_id");

-- CreateIndex
CREATE INDEX "idx_work_order_item_repairs_company_id" ON "work_order_item_repairs"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_work_order_item_repair" ON "work_order_item_repairs"("work_order_item_id", "repair_type_id");

-- CreateIndex
CREATE INDEX "idx_work_order_items_maintenance_item" ON "work_order_items"("maintenance_order_item_id");

-- CreateIndex
CREATE INDEX "idx_work_order_items_status" ON "work_order_items"("status");

-- CreateIndex
CREATE INDEX "idx_work_order_items_work_order" ON "work_order_items"("work_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_maintenance_item_per_active_work_order" ON "work_order_items"("maintenance_order_item_id", "work_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "work_orders_order_number_key" ON "work_orders"("order_number");

-- CreateIndex
CREATE INDEX "idx_work_orders_company_id" ON "work_orders"("company_id");

-- CreateIndex
CREATE INDEX "idx_work_orders_dates" ON "work_orders"("planned_start_date", "planned_end_date");

-- CreateIndex
CREATE INDEX "idx_work_orders_equipment" ON "work_orders"("equipment_id");

-- CreateIndex
CREATE INDEX "idx_work_orders_sector" ON "work_orders"("sector_id");

-- CreateIndex
CREATE INDEX "idx_work_orders_sequence" ON "work_orders"("sequence_number" DESC);

-- CreateIndex
CREATE INDEX "idx_work_orders_status" ON "work_orders"("status");

-- CreateIndex
CREATE INDEX "idx_work_orders_workshop" ON "work_orders"("workshop_id");

-- CreateIndex
CREATE INDEX "idx_ews_employee_id" ON "employee_workshop_sectors"("employee_id");

-- CreateIndex
CREATE INDEX "idx_ews_workshop_sector_id" ON "employee_workshop_sectors"("workshop_sector_id");

-- CreateIndex
CREATE INDEX "idx_workshop_sectors_is_active" ON "workshop_sectors"("is_active");

-- CreateIndex
CREATE INDEX "idx_workshop_sectors_workshop_id" ON "workshop_sectors"("workshop_id");

-- CreateIndex
CREATE INDEX "idx_workshop_sectors_company_id" ON "workshop_sectors"("company_id");

-- CreateIndex
CREATE INDEX "idx_workshops_company_id" ON "workshops"("company_id");

-- CreateIndex
CREATE INDEX "idx_workshops_is_active" ON "workshops"("is_active");

-- CreateIndex
CREATE INDEX "idx_workshops_type" ON "workshops"("type");

-- CreateIndex
CREATE UNIQUE INDEX "external_api_clients_client_id_key" ON "external_api_clients"("client_id");

-- CreateIndex
CREATE INDEX "idx_external_api_clients_company_id" ON "external_api_clients"("company_id");

-- CreateIndex
CREATE INDEX "idx_external_api_access_logs_client_date" ON "external_api_access_logs"("external_api_client_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_external_api_access_logs_created_at" ON "external_api_access_logs"("created_at");

-- AddForeignKey
ALTER TABLE "aptitudes_tecnicas" ADD CONSTRAINT "aptitudes_tecnicas_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aptitudes_tecnicas_puestos" ADD CONSTRAINT "aptitudes_tecnicas_puestos_aptitud_id_fkey" FOREIGN KEY ("aptitud_id") REFERENCES "aptitudes_tecnicas"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "aptitudes_tecnicas_puestos" ADD CONSTRAINT "aptitudes_tecnicas_puestos_puesto_id_fkey" FOREIGN KEY ("puesto_id") REFERENCES "company_positions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "area_province" ADD CONSTRAINT "area_province_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas_cliente"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "area_province" ADD CONSTRAINT "area_province_province_id_fkey" FOREIGN KEY ("province_id") REFERENCES "provinces"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "areas_cliente" ADD CONSTRAINT "areas_cliente_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "assing_customer" ADD CONSTRAINT "public_assing_customer_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "assing_customer" ADD CONSTRAINT "public_assing_customer_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "vehicles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "brand_vehicles" ADD CONSTRAINT "brand_vehicles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category" ADD CONSTRAINT "category_covenant_id_fkey" FOREIGN KEY ("covenant_id") REFERENCES "covenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_employee" ADD CONSTRAINT "public_covenant_category_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "category_employee" ADD CONSTRAINT "public_covenant_employee_emplyee_id_fkey" FOREIGN KEY ("emplyee_id") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "checklist_answers" ADD CONSTRAINT "checklist_answers_chofer_employee_id_fkey" FOREIGN KEY ("chofer_employee_id") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "checklist_answers" ADD CONSTRAINT "checklist_answers_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "checklist_answers" ADD CONSTRAINT "checklist_answers_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "vehicles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "checklist_answers" ADD CONSTRAINT "checklist_answers_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "checklist_templates"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "checklist_answers" ADD CONSTRAINT "checklist_answers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "checklist_answers" ADD CONSTRAINT "checklist_answers_ut_checklist_answer_id_fkey" FOREIGN KEY ("ut_checklist_answer_id") REFERENCES "checklist_answers"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "checklist_answers" ADD CONSTRAINT "checklist_answers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_deviations" ADD CONSTRAINT "checklist_deviations_checklist_answer_id_fkey" FOREIGN KEY ("checklist_answer_id") REFERENCES "checklist_answers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "checklist_deviations" ADD CONSTRAINT "checklist_deviations_created_by_employee_id_fkey" FOREIGN KEY ("created_by_employee_id") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "checklist_deviations" ADD CONSTRAINT "checklist_deviations_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "checklist_deviations" ADD CONSTRAINT "checklist_deviations_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "checklist_deviations" ADD CONSTRAINT "checklist_deviations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "checklist_sections"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "checklist_template_items" ADD CONSTRAINT "checklist_template_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "checklist_items"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "checklist_template_items" ADD CONSTRAINT "checklist_template_items_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "checklist_template_sections"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "checklist_template_items" ADD CONSTRAINT "checklist_template_items_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "checklist_templates"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "checklist_template_sections" ADD CONSTRAINT "checklist_template_sections_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "checklist_sections"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "checklist_template_sections" ADD CONSTRAINT "checklist_template_sections_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "checklist_templates"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "checklist_template_sub_types" ADD CONSTRAINT "checklist_template_sub_types_sub_type_id_fkey" FOREIGN KEY ("sub_type_id") REFERENCES "sub_type"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "checklist_template_sub_types" ADD CONSTRAINT "checklist_template_sub_types_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "checklist_templates"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "checklist_template_types" ADD CONSTRAINT "checklist_template_types_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "checklist_templates"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "checklist_template_types" ADD CONSTRAINT "checklist_template_types_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "type"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "checklist_template_types" ADD CONSTRAINT "checklist_template_types_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_templates" ADD CONSTRAINT "checklist_templates_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cities" ADD CONSTRAINT "cities_province_id_fkey" FOREIGN KEY ("province_id") REFERENCES "provinces"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clothing_brands" ADD CONSTRAINT "clothing_brands_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clothing_deliveries" ADD CONSTRAINT "clothing_deliveries_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "clothing_deliveries" ADD CONSTRAINT "clothing_deliveries_delivered_by_id_fkey" FOREIGN KEY ("delivered_by_id") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "clothing_deliveries" ADD CONSTRAINT "clothing_deliveries_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clothing_delivery_items" ADD CONSTRAINT "clothing_delivery_items_clothing_delivery_id_fkey" FOREIGN KEY ("clothing_delivery_id") REFERENCES "clothing_deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clothing_delivery_items" ADD CONSTRAINT "clothing_delivery_items_clothing_item_id_fkey" FOREIGN KEY ("clothing_item_id") REFERENCES "clothing_items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "clothing_delivery_items" ADD CONSTRAINT "clothing_delivery_items_clothing_brand_id_fkey" FOREIGN KEY ("clothing_brand_id") REFERENCES "clothing_brands"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "clothing_delivery_items" ADD CONSTRAINT "clothing_delivery_items_clothing_size_id_fkey" FOREIGN KEY ("clothing_size_id") REFERENCES "clothing_sizes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "clothing_item_brand_sizes" ADD CONSTRAINT "clothing_item_brand_sizes_clothing_item_id_fkey" FOREIGN KEY ("clothing_item_id") REFERENCES "clothing_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clothing_item_brand_sizes" ADD CONSTRAINT "clothing_item_brand_sizes_clothing_brand_id_fkey" FOREIGN KEY ("clothing_brand_id") REFERENCES "clothing_brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clothing_item_brand_sizes" ADD CONSTRAINT "clothing_item_brand_sizes_clothing_size_id_fkey" FOREIGN KEY ("clothing_size_id") REFERENCES "clothing_sizes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clothing_items" ADD CONSTRAINT "clothing_items_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clothing_sizes" ADD CONSTRAINT "clothing_sizes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies_employees" ADD CONSTRAINT "companies_employees_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies_employees" ADD CONSTRAINT "companies_employees_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company" ADD CONSTRAINT "company_city_fkey" FOREIGN KEY ("city") REFERENCES "cities"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "company" ADD CONSTRAINT "company_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company" ADD CONSTRAINT "company_province_id_fkey" FOREIGN KEY ("province_id") REFERENCES "provinces"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "company_positions" ADD CONSTRAINT "company_positions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "public_contacts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contractor_employee" ADD CONSTRAINT "contractor_employee_contractor_id_fkey" FOREIGN KEY ("contractor_id") REFERENCES "customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contractor_employee" ADD CONSTRAINT "contractor_employee_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_equipment" ADD CONSTRAINT "contractor_equipment_contractor_id_fkey" FOREIGN KEY ("contractor_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_equipment" ADD CONSTRAINT "contractor_equipment_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_other_equipment" ADD CONSTRAINT "contractor_other_equipment_contractor_id_fkey" FOREIGN KEY ("contractor_id") REFERENCES "customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contractor_other_equipment" ADD CONSTRAINT "contractor_other_equipment_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "other_equipment"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cost_center" ADD CONSTRAINT "cost_center_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "covenant" ADD CONSTRAINT "covenant_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "covenant" ADD CONSTRAINT "covenant_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_form" ADD CONSTRAINT "custom_form_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_services" ADD CONSTRAINT "customer_services_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "customer_services" ADD CONSTRAINT "public_customer_services_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_indicators" ADD CONSTRAINT "kpi_daily_indicators_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "dailyreport" ADD CONSTRAINT "public_dailyreport_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "dailyreport_customer_equipment_relations" ADD CONSTRAINT "dailyreport_customer_equipment_relat_customer_equipment_id_fkey" FOREIGN KEY ("customer_equipment_id") REFERENCES "equipos_clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dailyreport_customer_equipment_relations" ADD CONSTRAINT "dailyreport_customer_equipment_relatio_daily_report_row_id_fkey" FOREIGN KEY ("daily_report_row_id") REFERENCES "dailyreportrows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dailyreportemployeerelations" ADD CONSTRAINT "dailyreportemployeerelations_daily_report_row_id_fkey" FOREIGN KEY ("daily_report_row_id") REFERENCES "dailyreportrows"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "dailyreportemployeerelations" ADD CONSTRAINT "dailyreportemployeerelations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "dailyreportequipmentrelations" ADD CONSTRAINT "dailyreportequipmentrelations_daily_report_row_id_fkey" FOREIGN KEY ("daily_report_row_id") REFERENCES "dailyreportrows"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "dailyreportequipmentrelations" ADD CONSTRAINT "dailyreportequipmentrelations_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "dailyreportequipmentrelations" ADD CONSTRAINT "dailyreportequipmentrelations_other_equipment_id_fkey" FOREIGN KEY ("other_equipment_id") REFERENCES "other_equipment"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "dailyreportrows" ADD CONSTRAINT "dailyreportrows_areas_service_id_fkey" FOREIGN KEY ("areas_service_id") REFERENCES "service_areas"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dailyreportrows" ADD CONSTRAINT "dailyreportrows_cloned_from_row_id_fkey" FOREIGN KEY ("cloned_from_row_id") REFERENCES "dailyreportrows"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "dailyreportrows" ADD CONSTRAINT "dailyreportrows_daily_report_id_fkey" FOREIGN KEY ("daily_report_id") REFERENCES "dailyreport"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "dailyreportrows" ADD CONSTRAINT "dailyreportrows_preparte_id_fkey" FOREIGN KEY ("preparte_id") REFERENCES "preparte"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dailyreportrows" ADD CONSTRAINT "dailyreportrows_sector_service_id_fkey" FOREIGN KEY ("sector_service_id") REFERENCES "service_sectors"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dailyreportrows" ADD CONSTRAINT "dailyreportrows_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "customer_services"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dailyreportrows" ADD CONSTRAINT "public_dailyreportrows_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "dailyreportrows" ADD CONSTRAINT "public_dailyreportrows_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "service_items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "dailyreportrows_history" ADD CONSTRAINT "dailyreportrows_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "profile"("credential_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "dailyreportrows_history" ADD CONSTRAINT "dailyreportrows_history_daily_report_row_id_fkey" FOREIGN KEY ("daily_report_row_id") REFERENCES "dailyreportrows"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "diagram_type" ADD CONSTRAINT "public_diagram_type_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "diagrams_logs" ADD CONSTRAINT "diagrams_logs_diagram_id_fkey" FOREIGN KEY ("diagram_id") REFERENCES "diagram_type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagrams_logs" ADD CONSTRAINT "diagrams_logs_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagrams_logs" ADD CONSTRAINT "diagrams_logs_modified_by_fkey" FOREIGN KEY ("modified_by") REFERENCES "profile"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "document_types" ADD CONSTRAINT "document_types_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents_company" ADD CONSTRAINT "documents_company_applies_fkey" FOREIGN KEY ("applies") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents_company" ADD CONSTRAINT "documents_company_id_document_types_fkey" FOREIGN KEY ("id_document_types") REFERENCES "document_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents_company" ADD CONSTRAINT "documents_company_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents_employees" ADD CONSTRAINT "documents_employees_applies_fkey" FOREIGN KEY ("applies") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents_employees" ADD CONSTRAINT "documents_employees_id_document_types_fkey" FOREIGN KEY ("id_document_types") REFERENCES "document_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents_employees" ADD CONSTRAINT "documents_employees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents_employees_logs" ADD CONSTRAINT "public_documents_employees_logs_documents_employees_id_fkey" FOREIGN KEY ("documents_employees_id") REFERENCES "documents_employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents_equipment" ADD CONSTRAINT "documents_equipment_applies_fkey" FOREIGN KEY ("applies") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents_equipment" ADD CONSTRAINT "documents_equipment_id_document_types_fkey" FOREIGN KEY ("id_document_types") REFERENCES "document_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents_equipment" ADD CONSTRAINT "documents_equipment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents_equipment_logs" ADD CONSTRAINT "public_documents_equipment_logs_documents_equipment_id_fkey" FOREIGN KEY ("documents_equipment_id") REFERENCES "documents_equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleado_aptitudes" ADD CONSTRAINT "empleado_aptitudes_aptitud_id_fkey" FOREIGN KEY ("aptitud_id") REFERENCES "aptitudes_tecnicas"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "empleado_aptitudes" ADD CONSTRAINT "empleado_aptitudes_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_birthplace_fkey" FOREIGN KEY ("birthplace") REFERENCES "countries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_city_fkey" FOREIGN KEY ("city") REFERENCES "cities"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_company_position_fkey" FOREIGN KEY ("company_position") REFERENCES "company_positions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "cost_center"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_covenants_id_fkey" FOREIGN KEY ("covenants_id") REFERENCES "covenant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guild"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_hierarchical_position_fkey" FOREIGN KEY ("hierarchical_position") REFERENCES "hierarchy"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_province_fkey" FOREIGN KEY ("province") REFERENCES "provinces"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_type_of_contract_fkey" FOREIGN KEY ("type_of_contract") REFERENCES "types_of_contract"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_workflow_diagram_fkey" FOREIGN KEY ("workflow_diagram") REFERENCES "work_diagram"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "employees_diagram" ADD CONSTRAINT "employees_diagram_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "employees_diagram" ADD CONSTRAINT "public_employees_diagram_diagram_type_fkey" FOREIGN KEY ("diagram_type") REFERENCES "diagram_type"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "equipment_owner_contract_types" ADD CONSTRAINT "equipment_owner_contract_types_equipment_owner_id_fkey" FOREIGN KEY ("equipment_owner_id") REFERENCES "equipment_owners"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "equipment_owners" ADD CONSTRAINT "equipment_owners_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipos_clientes" ADD CONSTRAINT "equipos_clientes_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "form_answers" ADD CONSTRAINT "form_answers_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "custom_form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guild" ADD CONSTRAINT "public_guild_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "hierarchy" ADD CONSTRAINT "hierarchy_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_revisions" ADD CONSTRAINT "kpi_revisions_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "profile"("credential_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "kpi_revisions" ADD CONSTRAINT "kpi_revisions_kpi_id_fkey" FOREIGN KEY ("kpi_id") REFERENCES "kpis"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "kpis" ADD CONSTRAINT "kpis_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "maintenance_activity_log" ADD CONSTRAINT "maintenance_activity_log_maintenance_order_id_fkey" FOREIGN KEY ("maintenance_order_id") REFERENCES "maintenance_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "maintenance_activity_log" ADD CONSTRAINT "maintenance_activity_log_maintenance_request_id_fkey" FOREIGN KEY ("maintenance_request_id") REFERENCES "maintenance_requests"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "maintenance_activity_log" ADD CONSTRAINT "maintenance_activity_log_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "profile"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "maintenance_activity_log" ADD CONSTRAINT "maintenance_activity_log_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "maintenance_activity_log" ADD CONSTRAINT "maintenance_activity_log_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_group_type_of_repairs" ADD CONSTRAINT "maintenance_group_type_of_repairs_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "maintenance_request_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_group_type_of_repairs" ADD CONSTRAINT "maintenance_group_type_of_repairs_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "types_of_repairs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "maintenance_order_item_repair_types" ADD CONSTRAINT "maintenance_order_item_repair_ty_maintenance_order_item_id_fkey" FOREIGN KEY ("maintenance_order_item_id") REFERENCES "maintenance_order_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "maintenance_order_item_repair_types" ADD CONSTRAINT "maintenance_order_item_repair_types_repair_type_id_fkey" FOREIGN KEY ("repair_type_id") REFERENCES "types_of_repairs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "maintenance_order_items" ADD CONSTRAINT "maintenance_order_items_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "maintenance_order_items" ADD CONSTRAINT "maintenance_order_items_assigned_sector_id_fkey" FOREIGN KEY ("assigned_sector_id") REFERENCES "workshop_sectors"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "maintenance_order_items" ADD CONSTRAINT "maintenance_order_items_assigned_workshop_id_fkey" FOREIGN KEY ("assigned_workshop_id") REFERENCES "workshops"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "maintenance_order_items" ADD CONSTRAINT "maintenance_order_items_maintenance_order_id_fkey" FOREIGN KEY ("maintenance_order_id") REFERENCES "maintenance_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "maintenance_order_items" ADD CONSTRAINT "maintenance_order_items_maintenance_request_item_id_fkey" FOREIGN KEY ("maintenance_request_item_id") REFERENCES "maintenance_request_items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "maintenance_order_items" ADD CONSTRAINT "maintenance_order_items_rejected_by_fkey" FOREIGN KEY ("rejected_by") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "maintenance_order_items" ADD CONSTRAINT "maintenance_order_items_repair_type_id_fkey" FOREIGN KEY ("repair_type_id") REFERENCES "types_of_repairs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "maintenance_order_items" ADD CONSTRAINT "maintenance_order_items_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "maintenance_order_items" ADD CONSTRAINT "maintenance_order_items_workshop_chief_comment_by_fkey" FOREIGN KEY ("workshop_chief_comment_by") REFERENCES "profile"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "maintenance_order_items" ADD CONSTRAINT "maintenance_order_items_group_fkey" FOREIGN KEY ("maintenance_group_id") REFERENCES "maintenance_request_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_order_items" ADD CONSTRAINT "maintenance_order_items_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_orders" ADD CONSTRAINT "maintenance_orders_date_approved_by_fkey" FOREIGN KEY ("date_approved_by") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "maintenance_orders" ADD CONSTRAINT "maintenance_orders_date_rejected_by_fkey" FOREIGN KEY ("date_rejected_by") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "maintenance_orders" ADD CONSTRAINT "maintenance_orders_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "maintenance_orders" ADD CONSTRAINT "maintenance_orders_other_equipment_id_fkey" FOREIGN KEY ("other_equipment_id") REFERENCES "other_equipment"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "maintenance_orders" ADD CONSTRAINT "maintenance_orders_maintenance_request_id_fkey" FOREIGN KEY ("maintenance_request_id") REFERENCES "maintenance_requests"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "maintenance_orders" ADD CONSTRAINT "maintenance_orders_operations_validated_by_fkey" FOREIGN KEY ("operations_validated_by") REFERENCES "profile"("credential_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "maintenance_orders" ADD CONSTRAINT "maintenance_orders_rejected_by_fkey" FOREIGN KEY ("rejected_by") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "maintenance_orders" ADD CONSTRAINT "maintenance_orders_scheduled_by_fkey" FOREIGN KEY ("scheduled_by") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "maintenance_orders" ADD CONSTRAINT "maintenance_orders_workshop_approved_by_fkey" FOREIGN KEY ("workshop_approved_by") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "maintenance_orders" ADD CONSTRAINT "maintenance_orders_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_request_items" ADD CONSTRAINT "maintenance_request_items_checklist_deviation_id_fkey" FOREIGN KEY ("checklist_deviation_id") REFERENCES "checklist_deviations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "maintenance_request_items" ADD CONSTRAINT "maintenance_request_items_driver_comment_by_fkey" FOREIGN KEY ("driver_comment_by") REFERENCES "profile"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "maintenance_request_items" ADD CONSTRAINT "maintenance_request_items_maintenance_request_id_fkey" FOREIGN KEY ("maintenance_request_id") REFERENCES "maintenance_requests"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "maintenance_request_items" ADD CONSTRAINT "maintenance_request_items_repair_type_id_fkey" FOREIGN KEY ("repair_type_id") REFERENCES "types_of_repairs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "maintenance_request_items" ADD CONSTRAINT "maintenance_request_items_supervisor_comment_by_fkey" FOREIGN KEY ("supervisor_comment_by") REFERENCES "profile"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "maintenance_request_items" ADD CONSTRAINT "maintenance_request_items_validator_comment_by_fkey" FOREIGN KEY ("validator_comment_by") REFERENCES "profile"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "maintenance_request_items" ADD CONSTRAINT "maintenance_request_items_group_fkey" FOREIGN KEY ("maintenance_group_id") REFERENCES "maintenance_request_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_request_items" ADD CONSTRAINT "maintenance_request_items_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_checklist_answer_id_fkey" FOREIGN KEY ("checklist_answer_id") REFERENCES "checklist_answers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_driver_employee_id_fkey" FOREIGN KEY ("driver_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_other_equipment_id_fkey" FOREIGN KEY ("other_equipment_id") REFERENCES "other_equipment"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_rejected_by_fkey" FOREIGN KEY ("rejected_by") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_vehicles" ADD CONSTRAINT "public_model_vehicles_brand_fkey" FOREIGN KEY ("brand") REFERENCES "brand_vehicles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "model_vehicles" ADD CONSTRAINT "model_vehicles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "public_notifications_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "other_equipment" ADD CONSTRAINT "other_equipment_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brand_vehicles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "other_equipment" ADD CONSTRAINT "other_equipment_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "other_equipment" ADD CONSTRAINT "other_equipment_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "cost_center"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "other_equipment" ADD CONSTRAINT "other_equipment_linked_vehicle_id_fkey" FOREIGN KEY ("linked_vehicle_id") REFERENCES "vehicles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "other_equipment" ADD CONSTRAINT "other_equipment_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "model_vehicles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "other_equipment" ADD CONSTRAINT "other_equipment_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "equipment_owners"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "other_equipment" ADD CONSTRAINT "other_equipment_sector_fkey" FOREIGN KEY ("sector") REFERENCES "hierarchy"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "other_equipment" ADD CONSTRAINT "other_equipment_sub_type_id_fkey" FOREIGN KEY ("sub_type_id") REFERENCES "sub_type"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "other_equipment" ADD CONSTRAINT "other_equipment_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "type"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "other_equipment" ADD CONSTRAINT "other_equipment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "other_equipment_certifications" ADD CONSTRAINT "other_equipment_certifications_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "other_equipment"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "preparte" ADD CONSTRAINT "preparte_areas_service_id_fkey" FOREIGN KEY ("areas_service_id") REFERENCES "service_areas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "preparte" ADD CONSTRAINT "preparte_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "customers"("id") ON DELETE SET DEFAULT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preparte" ADD CONSTRAINT "preparte_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "preparte" ADD CONSTRAINT "preparte_contrato_id_fkey" FOREIGN KEY ("contrato_id") REFERENCES "customer_services"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preparte" ADD CONSTRAINT "preparte_equipos_cliente_fkey" FOREIGN KEY ("equipos_cliente") REFERENCES "equipos_clientes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "preparte" ADD CONSTRAINT "preparte_item_fkey" FOREIGN KEY ("item") REFERENCES "service_items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "preparte" ADD CONSTRAINT "preparte_reprogram_fkey" FOREIGN KEY ("reprogram") REFERENCES "preparte"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "preparte" ADD CONSTRAINT "preparte_sector_service_id_fkey" FOREIGN KEY ("sector_service_id") REFERENCES "service_sectors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "preparte" ADD CONSTRAINT "preparte_rejected_by_fkey" FOREIGN KEY ("rejected_by") REFERENCES "profile"("credential_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "preparte" ADD CONSTRAINT "preparte_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "profile"("credential_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "preparte" ADD CONSTRAINT "preparte_reprogrammed_by_fkey" FOREIGN KEY ("reprogrammed_by") REFERENCES "profile"("credential_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "preparte_change_logs" ADD CONSTRAINT "fk_preparte_change_logs_profile" FOREIGN KEY ("changed_by") REFERENCES "profile"("credential_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "preparte_change_logs" ADD CONSTRAINT "preparte_change_logs_preparte_id_fkey" FOREIGN KEY ("preparte_id") REFERENCES "preparte"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pre_employees" ADD CONSTRAINT "pre_employees_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pre_employees" ADD CONSTRAINT "pre_employees_birthplace_fkey" FOREIGN KEY ("birthplace") REFERENCES "countries"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pre_employees" ADD CONSTRAINT "pre_employees_province_fkey" FOREIGN KEY ("province") REFERENCES "provinces"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pre_employees" ADD CONSTRAINT "pre_employees_city_fkey" FOREIGN KEY ("city") REFERENCES "cities"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pre_employees" ADD CONSTRAINT "pre_employees_proposed_hierarchical_position_fkey" FOREIGN KEY ("proposed_hierarchical_position") REFERENCES "hierarchy"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pre_employees" ADD CONSTRAINT "pre_employees_proposed_company_position_fkey" FOREIGN KEY ("proposed_company_position") REFERENCES "company_positions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pre_employees" ADD CONSTRAINT "pre_employees_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pre_employees" ADD CONSTRAINT "pre_employees_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pre_employees" ADD CONSTRAINT "pre_employees_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "documents_pre_employees" ADD CONSTRAINT "documents_pre_employees_pre_employee_id_fkey" FOREIGN KEY ("pre_employee_id") REFERENCES "pre_employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents_pre_employees" ADD CONSTRAINT "documents_pre_employees_document_type_id_fkey" FOREIGN KEY ("document_type_id") REFERENCES "document_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents_pre_employees" ADD CONSTRAINT "documents_pre_employees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "documents_pre_employees" ADD CONSTRAINT "documents_pre_employees_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile" ADD CONSTRAINT "profile_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "profile" ADD CONSTRAINT "profile_role_fkey" FOREIGN KEY ("role") REFERENCES "roles"("name") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "remito_documents" ADD CONSTRAINT "remito_documents_remit_id_fkey" FOREIGN KEY ("remit_id") REFERENCES "remitos"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "remitos" ADD CONSTRAINT "remitos_daily_report_row_id_fkey" FOREIGN KEY ("daily_report_row_id") REFERENCES "dailyreportrows"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_action_id_fkey" FOREIGN KEY ("action_id") REFERENCES "actions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_tab_id_fkey" FOREIGN KEY ("tab_id") REFERENCES "tabs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "role_hidden_equipment_types" ADD CONSTRAINT "role_hidden_equipment_types_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "role_hidden_equipment_types" ADD CONSTRAINT "role_hidden_equipment_types_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "type"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_equipment_type_visibility" ADD CONSTRAINT "user_equipment_type_visibility_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profile"("credential_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_equipment_type_visibility" ADD CONSTRAINT "user_equipment_type_visibility_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "type"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sector_customer" ADD CONSTRAINT "sector_customer_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sector_customer" ADD CONSTRAINT "sector_customer_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "sectors"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sector_repair_types" ADD CONSTRAINT "sector_repair_types_repair_type_id_fkey" FOREIGN KEY ("repair_type_id") REFERENCES "types_of_repairs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sector_repair_types" ADD CONSTRAINT "sector_repair_types_workshop_sector_id_fkey" FOREIGN KEY ("workshop_sector_id") REFERENCES "workshop_sectors"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "service_areas" ADD CONSTRAINT "service_areas_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas_cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_areas" ADD CONSTRAINT "service_areas_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "customer_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_items" ADD CONSTRAINT "public_service_items_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "service_items" ADD CONSTRAINT "public_service_items_item_measure_units_fkey" FOREIGN KEY ("item_measure_units") REFERENCES "measure_units"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "service_items" ADD CONSTRAINT "service_items_customer_service_id_fkey" FOREIGN KEY ("customer_service_id") REFERENCES "customer_services"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "service_sectors" ADD CONSTRAINT "service_sectors_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "sectors"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "service_sectors" ADD CONSTRAINT "service_sectors_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "customer_services"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "share_company_users" ADD CONSTRAINT "public_share_company_users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_company_users" ADD CONSTRAINT "public_share_company_users_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_company_users" ADD CONSTRAINT "share_company_users_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_type" ADD CONSTRAINT "sub_type_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_type" ADD CONSTRAINT "sub_type_type_fkey" FOREIGN KEY ("type") REFERENCES "type"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sub_type" ADD CONSTRAINT "sub_type_tire_template_id_fkey" FOREIGN KEY ("tire_template_id") REFERENCES "tire_templates"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sub_type_compatible_items" ADD CONSTRAINT "sub_type_compatible_items_sub_type_id_fkey" FOREIGN KEY ("sub_type_id") REFERENCES "sub_type"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tabs" ADD CONSTRAINT "tabs_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tabs" ADD CONSTRAINT "tabs_parent_tab_id_fkey" FOREIGN KEY ("parent_tab_id") REFERENCES "tabs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "type" ADD CONSTRAINT "type_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "type_hitch_types" ADD CONSTRAINT "type_hitch_types_compatible_type_id_fkey" FOREIGN KEY ("compatible_type_id") REFERENCES "type"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "type_hitch_types" ADD CONSTRAINT "type_hitch_types_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "type"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "type_hitch_types" ADD CONSTRAINT "type_hitch_types_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "types_of_contract" ADD CONSTRAINT "types_of_contract_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "types_of_repairs" ADD CONSTRAINT "types_of_repairs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_action_id_fkey" FOREIGN KEY ("action_id") REFERENCES "actions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "profile"("credential_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_tab_id_fkey" FOREIGN KEY ("tab_id") REFERENCES "tabs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profile"("credential_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "profile"("credential_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profile"("credential_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "public_vehicles_model_fkey" FOREIGN KEY ("model") REFERENCES "model_vehicles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "public_vehicles_type_fkey" FOREIGN KEY ("type") REFERENCES "type"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_brand_fkey" FOREIGN KEY ("brand") REFERENCES "brand_vehicles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "cost_center"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "equipment_owners"("id") ON DELETE SET DEFAULT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_sector_fkey" FOREIGN KEY ("sector") REFERENCES "hierarchy"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_subType_fkey" FOREIGN KEY ("subType") REFERENCES "sub_type"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_type_of_vehicle_fkey" FOREIGN KEY ("type_of_vehicle") REFERENCES "types_of_vehicles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_type_operative_id_fkey" FOREIGN KEY ("type_operative_id") REFERENCES "type_operative"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_tire_template_id_fkey" FOREIGN KEY ("tire_template_id") REFERENCES "tire_templates"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tire_brands" ADD CONSTRAINT "tire_brands_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tire_types" ADD CONSTRAINT "tire_types_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tires" ADD CONSTRAINT "tires_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "tire_brands"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tires" ADD CONSTRAINT "tires_tire_type_id_fkey" FOREIGN KEY ("tire_type_id") REFERENCES "tire_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tires" ADD CONSTRAINT "tires_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tire_templates" ADD CONSTRAINT "tire_templates_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tire_templates" ADD CONSTRAINT "tire_templates_source_template_id_fkey" FOREIGN KEY ("source_template_id") REFERENCES "tire_templates"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tire_template_axles" ADD CONSTRAINT "tire_template_axles_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "tire_templates"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vehicle_tire_positions" ADD CONSTRAINT "vehicle_tire_positions_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vehicle_tire_positions" ADD CONSTRAINT "vehicle_tire_positions_template_axle_id_fkey" FOREIGN KEY ("template_axle_id") REFERENCES "tire_template_axles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vehicle_tire_positions" ADD CONSTRAINT "vehicle_tire_positions_tire_id_fkey" FOREIGN KEY ("tire_id") REFERENCES "tires"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vehicle_axle_tire_sizes" ADD CONSTRAINT "vehicle_axle_tire_sizes_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tire_service_orders" ADD CONSTRAINT "tire_service_orders_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tire_service_orders" ADD CONSTRAINT "tire_service_orders_trailer_vehicle_id_fkey" FOREIGN KEY ("trailer_vehicle_id") REFERENCES "vehicles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tire_service_orders" ADD CONSTRAINT "tire_service_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tire_service_orders" ADD CONSTRAINT "tire_service_orders_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tire_service_items" ADD CONSTRAINT "tire_service_items_service_order_id_fkey" FOREIGN KEY ("service_order_id") REFERENCES "tire_service_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tire_service_items" ADD CONSTRAINT "tire_service_items_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tire_service_items" ADD CONSTRAINT "tire_service_items_tire_id_fkey" FOREIGN KEY ("tire_id") REFERENCES "tires"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tire_service_items" ADD CONSTRAINT "tire_service_items_new_tire_id_fkey" FOREIGN KEY ("new_tire_id") REFERENCES "tires"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "work_diagram" ADD CONSTRAINT "work-diagram_inactive_novelty_fkey" FOREIGN KEY ("inactive_novelty") REFERENCES "diagram_type"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "work_diagram" ADD CONSTRAINT "work_diagram_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_diagram_active_novelties" ADD CONSTRAINT "work_diagram_active_novelties_diagram_type_id_fkey" FOREIGN KEY ("diagram_type_id") REFERENCES "diagram_type"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "work_diagram_active_novelties" ADD CONSTRAINT "work_diagram_active_novelties_work_diagram_id_fkey" FOREIGN KEY ("work_diagram_id") REFERENCES "work_diagram"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "work_diagram_active_novelties" ADD CONSTRAINT "work_diagram_active_novelties_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_item_repairs" ADD CONSTRAINT "work_order_item_repairs_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "work_order_item_repairs" ADD CONSTRAINT "work_order_item_repairs_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "work_order_item_repairs" ADD CONSTRAINT "work_order_item_repairs_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "work_order_item_repairs" ADD CONSTRAINT "work_order_item_repairs_original_sector_id_fkey" FOREIGN KEY ("original_sector_id") REFERENCES "workshop_sectors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "work_order_item_repairs" ADD CONSTRAINT "work_order_item_repairs_repair_type_id_fkey" FOREIGN KEY ("repair_type_id") REFERENCES "types_of_repairs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "work_order_item_repairs" ADD CONSTRAINT "work_order_item_repairs_technician_notes_by_fkey" FOREIGN KEY ("technician_notes_by") REFERENCES "profile"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "work_order_item_repairs" ADD CONSTRAINT "work_order_item_repairs_work_order_item_id_fkey" FOREIGN KEY ("work_order_item_id") REFERENCES "work_order_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "work_order_item_repairs" ADD CONSTRAINT "work_order_item_repairs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_items" ADD CONSTRAINT "work_order_items_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "work_order_items" ADD CONSTRAINT "work_order_items_maintenance_order_item_id_fkey" FOREIGN KEY ("maintenance_order_item_id") REFERENCES "maintenance_order_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "work_order_items" ADD CONSTRAINT "work_order_items_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_other_equipment_id_fkey" FOREIGN KEY ("other_equipment_id") REFERENCES "other_equipment"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_paused_by_fkey" FOREIGN KEY ("paused_by") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "workshop_sectors"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_started_by_fkey" FOREIGN KEY ("started_by") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_workshop_id_fkey" FOREIGN KEY ("workshop_id") REFERENCES "workshops"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "employee_workshop_sectors" ADD CONSTRAINT "employee_workshop_sectors_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "employee_workshop_sectors" ADD CONSTRAINT "employee_workshop_sectors_workshop_sector_id_fkey" FOREIGN KEY ("workshop_sector_id") REFERENCES "workshop_sectors"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "workshop_sectors" ADD CONSTRAINT "workshop_sectors_workshop_id_fkey" FOREIGN KEY ("workshop_id") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "workshop_sectors" ADD CONSTRAINT "workshop_sectors_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workshops" ADD CONSTRAINT "workshops_city_fkey" FOREIGN KEY ("city") REFERENCES "cities"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "workshops" ADD CONSTRAINT "workshops_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "workshops" ADD CONSTRAINT "workshops_province_fkey" FOREIGN KEY ("province") REFERENCES "provinces"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "external_api_clients" ADD CONSTRAINT "external_api_clients_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_api_clients" ADD CONSTRAINT "external_api_clients_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_api_clients" ADD CONSTRAINT "external_api_clients_revoked_by_fkey" FOREIGN KEY ("revoked_by") REFERENCES "profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_api_access_logs" ADD CONSTRAINT "external_api_access_logs_external_api_client_id_fkey" FOREIGN KEY ("external_api_client_id") REFERENCES "external_api_clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── Funciones, vistas y triggers (prisma/sql/*.sql) ───────────────────────────

-- ── prisma/sql/misc.sql ──────────────────────────────────────────────────────────────────────
-- Generado por scripts/sql/extract-sql-objects.ts — editar a mano SOLO en la revisión de Task 4
-- Dominio: misc — 24 objeto(s)
-- Revisado a mano en la Task 4 (P1): sin auth/storage, actor por app.user_id, filtro por empresa.

-- ============================================================================
-- FUNCTIONS (17)
-- ============================================================================

-- function app_current_user_id (nuevo en Task 4: reemplaza el uid del JWT de Supabase)
-- Actor de la transaccion. La app lo fija con `SET LOCAL app.user_id = '<uuid>'`
-- (helper `withActor`, P2) antes de las escrituras que disparan triggers de auditoria.
-- Sin setting (jobs, psql, seeds) devuelve NULL, igual que el uid de Supabase sin JWT.
CREATE OR REPLACE FUNCTION public.app_current_user_id()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN nullif(current_setting('app.user_id', true), '')::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$function$;

-- function add_to_companies_employees (origen: supabase/migrations/20251103211302_initial_structure.sql)
CREATE OR REPLACE FUNCTION public.add_to_companies_employees()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$DECLARE
  contractor_id UUID;
BEGIN
  -- Insertar en companies_employees
  INSERT INTO companies_employees (company_id, employee_id)
  VALUES (NEW.company_id, NEW.id);

  -- Verificar si NEW.allocated_to no está vacío
  IF NEW.allocated_to IS NOT NULL AND array_length(NEW.allocated_to, 1) > 0 THEN
    -- Insertar en contractor_employee para cada ID en allocated_to
    FOREACH contractor_id IN ARRAY NEW.allocated_to
    LOOP
      INSERT INTO contractor_employee (contractor_id, employee_id)
      VALUES (contractor_id, NEW.id);
    END LOOP;
  END IF;

  RETURN NEW;
END;$function$;

-- function build_employee_where_alias (origen: supabase/migrations/20251103211302_initial_structure.sql)
CREATE OR REPLACE FUNCTION public.build_employee_where_alias(_conditions jsonb, table_alias text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
  c       jsonb;
  parts   text[] := '{}'::text[];
  ids_txt text;
  values_txt text;
  log_prefix text := 'build_employee_where_alias:';
BEGIN
  RAISE LOG '%s Iniciando con _conditions=%', log_prefix, _conditions;
  
  IF _conditions IS NULL OR jsonb_typeof(_conditions) <> 'array' THEN
     RAISE LOG '%s condiciones nulas o no son un array, retornando TRUE', log_prefix;
     RETURN 'TRUE';
  END IF;

  FOR c IN SELECT * FROM jsonb_array_elements(_conditions) LOOP
    RAISE LOG '%s Procesando condición: %', log_prefix, c;
    
    -- Verificar si hay IDs no vacíos disponibles
    SELECT '(' || string_agg(quote_literal(id), ',') || ')'
      INTO ids_txt
      FROM jsonb_array_elements_text(c -> 'ids') id
      WHERE id IS NOT NULL AND id <> '';
    
    RAISE LOG '%s property_key=% ids_txt=% relation_type=%', 
      log_prefix, c ->> 'property_key', ids_txt, c ->> 'relation_type';

    -- Si no hay IDs válidos, usar los valores directamente
    IF ids_txt IS NULL OR ids_txt = '()' THEN
      RAISE LOG '%s No hay IDs válidos, usando valores directamente', log_prefix;
      
      -- Obtener lista de valores como literales SQL
      SELECT '(' || string_agg(quote_literal(val), ',') || ')'
        INTO values_txt
        FROM jsonb_array_elements_text(c -> 'values') val
        WHERE val IS NOT NULL AND val <> '';
      
      RAISE LOG '%s values_txt=%', log_prefix, values_txt;
      
      -- Caso especial para contractor_employee (tabla de unión)
      IF c ->> 'property_key' = 'contractor_employee' AND c ->> 'relation_type' = 'many_to_many' THEN
        RAISE LOG '%s Usando condición especial para contractor_employee sin IDs', log_prefix;
        parts := parts || format(
          'EXISTS (
            SELECT 1 
            FROM %I rel
            JOIN customers cust ON rel.%I = cust.id
            WHERE rel.%I = %I.%I
              AND cust.name IN %s
          )',
          c ->> 'relation_table',
          c ->> 'filter_column',
          c ->> 'column_on_relation',
          table_alias,
          c ->> 'column_on_employees',
          values_txt
        );
      ELSE
        -- Para otras propiedades, omitir si no hay IDs ni una forma alternativa de filtrar
        RAISE LOG '%s No se pudo crear condición para % sin IDs válidos', log_prefix, c ->> 'property_key';
        CONTINUE;
      END IF;
    ELSE
      -- Si hay IDs válidos, usar la lógica original
      CASE c ->> 'relation_type'
        WHEN 'many_to_many' THEN
          RAISE LOG '%s Construyendo SQL para relación many_to_many', log_prefix;
          parts := parts || format(
            'EXISTS (SELECT 1 FROM %I rel
                      WHERE rel.%I = %I.%I
                        AND rel.%I IN %s)',
            c ->> 'relation_table',
            c ->> 'column_on_relation',
            table_alias,
            c ->> 'column_on_employees',
            c ->> 'filter_column',
            ids_txt
          );
          RAISE LOG '%s SQL para many_to_many: %', log_prefix, parts[array_length(parts, 1)];
        WHEN 'one_to_many' THEN
          RAISE LOG '%s Construyendo SQL para relación one_to_many', log_prefix;
          parts := parts || format(
            '%I.%I IN %s',
            table_alias,
            c ->> 'filter_column',
            ids_txt
          );
          RAISE LOG '%s SQL para one_to_many: %', log_prefix, parts[array_length(parts, 1)];
        ELSE
          RAISE LOG '%s Construyendo SQL para relación directa o desconocida', log_prefix;
          parts := parts || format(
            '%I.%I IN %s',
            table_alias,
            c ->> 'filter_column',
            ids_txt
          );
          RAISE LOG '%s SQL para relación directa: %', log_prefix, parts[array_length(parts, 1)];
      END CASE;
    END IF;
  END LOOP;

  IF array_length(parts, 1) = 0 THEN
    RAISE LOG '%s No se generaron condiciones válidas, retornando TRUE', log_prefix;
    RETURN 'TRUE';
  END IF;

  RAISE LOG '%s Finalizando, SQL construido: %', log_prefix, array_to_string(parts, ' AND ');
  RETURN array_to_string(parts, ' AND ');
END;
$function$;

-- function build_vehicle_where_alias (origen: prisma/migrations/20260313120000_fix_document_types_triggers/migration.sql)
CREATE OR REPLACE FUNCTION build_vehicle_where_alias(_conditions jsonb, table_alias text)
RETURNS text AS $$
DECLARE
  c       jsonb;
  parts   text[] := '{}';
  ids_txt text;
BEGIN
  IF _conditions IS NULL OR jsonb_typeof(_conditions) <> 'array' THEN
     RETURN 'TRUE';
  END IF;

  FOR c IN SELECT * FROM jsonb_array_elements(_conditions) LOOP
    -- Filtrar IDs vacios/null (misma guarda que build_employee_where_alias)
    SELECT '(' || string_agg(quote_literal(id), ',') || ')'
      INTO ids_txt
      FROM jsonb_array_elements_text(c -> 'ids') id
      WHERE id IS NOT NULL AND id <> '';

    -- Si no hay IDs validos, skip esta condicion
    IF ids_txt IS NULL OR ids_txt = '()' THEN
      CONTINUE;
    END IF;

    CASE c ->> 'relation_type'
      WHEN 'many_to_many' THEN
        parts := parts || format(
          'EXISTS (SELECT 1 FROM %I rel
                    WHERE rel.%I = %I.%I
                      AND rel.%I IN %s)',
          c ->> 'relation_table',
          c ->> 'column_on_relation',
          table_alias,
          COALESCE(c ->> 'column_on_vehicles', 'id'),
          c ->> 'filter_column',
          ids_txt
        );
      WHEN 'one_to_many' THEN
        parts := parts || format(
          '%I.%I IN %s',
          table_alias,
          c ->> 'filter_column',
          ids_txt
        );
      ELSE
        parts := parts || format(
          '%I.%I IN %s',
          table_alias,
          c ->> 'filter_column',
          ids_txt
        );
    END CASE;
  END LOOP;

  -- Si no se generaron condiciones validas, retornar TRUE
  IF array_length(parts, 1) IS NULL OR array_length(parts, 1) = 0 THEN
    RETURN 'TRUE';
  END IF;

  RETURN array_to_string(parts, ' AND ');
END;
$$ LANGUAGE plpgsql;

-- function deactivate_service_items (origen: supabase/migrations/20251103211302_initial_structure.sql)
CREATE OR REPLACE FUNCTION public.deactivate_service_items()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE service_items
    SET is_active = NEW.is_active
    WHERE customer_service_id = NEW.id;
    RETURN NEW;
END;
$function$;

-- function equipment_allocated_to (origen: supabase/migrations/20251103211302_initial_structure.sql)
CREATE OR REPLACE FUNCTION public.equipment_allocated_to()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  contractor_id UUID;
BEGIN
  IF NEW.allocated_to IS NOT NULL AND array_length(NEW.allocated_to, 1) > 0 THEN
    -- Insertar en contractor_employee para cada ID en allocated_to
    FOREACH contractor_id IN ARRAY NEW.allocated_to
    LOOP
      INSERT INTO contractor_equipment(contractor_id, equipment_id)
      VALUES (contractor_id, NEW.id);
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;

-- function find_employee_by_full_name_v2 (origen: supabase/migrations/20251103211302_initial_structure.sql)
CREATE OR REPLACE FUNCTION public.find_employee_by_full_name_v2(p_full_name text, p_company_id uuid)
 RETURNS SETOF employees
 LANGUAGE plpgsql
AS $function$
begin
  return query
  select e.*
  from employees e
  where e.company_id = p_company_id
  and (
    lower(concat(e.firstname, ' ', e.lastname)) like lower('%' || p_full_name || '%')
    or lower(concat(e.lastname, ' ', e.firstname)) like lower('%' || p_full_name || '%')
  )
  limit 1;
end;
$function$;

-- function format_employee_names (origen: supabase/migrations/20251103211302_initial_structure.sql)
CREATE OR REPLACE FUNCTION public.format_employee_names()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Formatear firstname si no es nulo
  IF NEW.firstname IS NOT NULL THEN
    NEW.firstname := (
      SELECT string_agg(
        INITCAP(word), ' '
      ) 
      FROM unnest(string_to_array(NEW.firstname, ' ')) AS word
    );
  END IF;
  
  -- Formatear lastname si no es nulo
  IF NEW.lastname IS NOT NULL THEN
    NEW.lastname := (
      SELECT string_agg(
        INITCAP(word), ' '
      ) 
      FROM unnest(string_to_array(NEW.lastname, ' ')) AS word
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- function get_max_order_number (origen: supabase/migrations/20260202113926_fixing-maintenance-flow.sql)
CREATE OR REPLACE FUNCTION public.get_max_order_number(p_company_id uuid DEFAULT NULL)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    max_num INTEGER;
BEGIN
    -- Extraer el número máximo de los números de pedido de la empresa.
    -- Task 4: antes era global (mono-empresa). Con p_company_id NULL conserva el
    -- comportamiento viejo; el llamador en src/ (P2) debe pasar la empresa.
    SELECT COALESCE(
        MAX(CAST(
            SUBSTRING(numero_pedido FROM 'PED-0*([0-9]+)') AS INTEGER
        )),
        0
    ) INTO max_num
    FROM preparte
    WHERE numero_pedido IS NOT NULL
      AND (p_company_id IS NULL OR company_id = p_company_id);

    -- Formatear y retornar
    RETURN 'PED-' || LPAD(max_num::TEXT, 4, '0');
END;
$function$;

-- function log_customer_equipment_relations_changes (origen: supabase/migrations/20251103211302_initial_structure.sql)
CREATE OR REPLACE FUNCTION public.log_customer_equipment_relations_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    user_id UUID;
    readable_data JSONB;
    equipment_data RECORD;
    parent_exists BOOLEAN;
BEGIN
    -- Actor de la transaccion (app.user_id via withActor); NULL si no hay usuario
    user_id := public.app_current_user_id();
    
    IF TG_OP = 'INSERT' THEN
        -- For INSERT, get the vehicle details
        SELECT v.domain, v.intern_number INTO equipment_data
        FROM vehicles v
        WHERE v.id = NEW.customer_equipment_id;
        
        IF FOUND THEN
            readable_data := jsonb_build_object(
                'equipo_id', NEW.customer_equipment_id,
                'equipo_nombre', equipment_data.domain || 
                              CASE WHEN equipment_data.intern_number IS NOT NULL 
                              THEN ' (' || equipment_data.intern_number || ')' 
                              ELSE '' END,
                'equipo_identificador', equipment_data.domain
            );
            
            INSERT INTO dailyreportrows_history (
                daily_report_row_id,
                related_table,
                related_id,
                action_type,
                changed_fields,
                changed_data,
                changed_by
            ) VALUES (
                NEW.daily_report_row_id,
                'dailyreport_customer_equipment_relations',
                NEW.id,
                'LINK',
                '{}'::JSONB,
                readable_data,
                user_id
            );
        END IF;
        
    ELSIF TG_OP = 'DELETE' THEN
        -- Check if parent exists first
        SELECT EXISTS (
            SELECT 1 FROM dailyreportrows WHERE id = OLD.daily_report_row_id
        ) INTO parent_exists;
        
        IF parent_exists THEN
            SELECT v.domain, v.intern_number INTO equipment_data
            FROM vehicles v
            WHERE v.id = OLD.customer_equipment_id;
            
            IF FOUND THEN
                readable_data := jsonb_build_object(
                    'equipo_id', OLD.customer_equipment_id,
                    'equipo_nombre', equipment_data.domain || 
                                  CASE WHEN equipment_data.intern_number IS NOT NULL 
                                  THEN ' (' || equipment_data.intern_number || ')' 
                                  ELSE '' END,
                    'equipo_identificador', equipment_data.domain
                );
                
                INSERT INTO dailyreportrows_history (
                    daily_report_row_id,
                    related_table,
                    related_id,
                    action_type,
                    changed_fields,
                    changed_data,
                    changed_by
                ) VALUES (
                    OLD.daily_report_row_id,
                    'dailyreport_customer_equipment_relations',
                    OLD.id,
                    'UNLINK',
                    '{}'::JSONB,
                    readable_data,
                    user_id
                );
            END IF;
        END IF;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$function$;

-- function log_employee_relations_changes (origen: supabase/migrations/20251103211302_initial_structure.sql)
CREATE OR REPLACE FUNCTION public.log_employee_relations_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    user_id UUID;
    readable_data JSONB;
    employee_data RECORD;
    parent_exists BOOLEAN;
BEGIN
    -- Actor de la transaccion (app.user_id via withActor); NULL si no hay usuario
    user_id := public.app_current_user_id();
    
    IF TG_OP = 'INSERT' THEN
        -- For INSERT, get the employee details
        SELECT e.firstname, e.lastname INTO employee_data
        FROM employees e
        WHERE e.id = NEW.employee_id;
        
        IF FOUND THEN
            readable_data := jsonb_build_object(
                'empleado_id', NEW.employee_id,
                'empleado_nombre', COALESCE(employee_data.firstname, '') || ' ' || COALESCE(employee_data.lastname, '')
            );
            
            INSERT INTO dailyreportrows_history (
                daily_report_row_id,
                related_table,
                related_id,
                action_type,
                changed_fields,
                changed_data,
                changed_by
            ) VALUES (
                NEW.daily_report_row_id,
                'dailyreportemployeerelations',
                NEW.id,
                'LINK',
                '{}'::JSONB,
                readable_data,
                user_id
            );
        END IF;
        
    ELSIF TG_OP = 'DELETE' THEN
        -- Check if parent exists first
        SELECT EXISTS (
            SELECT 1 FROM dailyreportrows WHERE id = OLD.daily_report_row_id
        ) INTO parent_exists;
        
        IF parent_exists THEN
            SELECT e.firstname, e.lastname INTO employee_data
            FROM employees e
            WHERE e.id = OLD.employee_id;
            
            IF FOUND THEN
                readable_data := jsonb_build_object(
                    'empleado_id', OLD.employee_id,
                    'empleado_nombre', COALESCE(employee_data.firstname, '') || ' ' || COALESCE(employee_data.lastname, '')
                );
                
                INSERT INTO dailyreportrows_history (
                    daily_report_row_id,
                    related_table,
                    related_id,
                    action_type,
                    changed_fields,
                    changed_data,
                    changed_by
                ) VALUES (
                    OLD.daily_report_row_id,
                    'dailyreportemployeerelations',
                    OLD.id,
                    'UNLINK',
                    '{}'::JSONB,
                    readable_data,
                    user_id
                );
            END IF;
        END IF;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$function$;

-- function log_equipment_relations_changes (origen: supabase/migrations/20260304035040_sinc-2.sql)
CREATE OR REPLACE FUNCTION public.log_equipment_relations_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    user_id UUID;
    readable_data JSONB;
    vehicle_data RECORD;
    other_equip_data RECORD;
    parent_exists BOOLEAN;
    ref_equipment_id UUID;
    ref_other_equipment_id UUID;
    ref_row_id UUID;
    ref_rel_id UUID;
BEGIN
    user_id := public.app_current_user_id();

    IF TG_OP = 'DELETE' THEN
        ref_equipment_id := OLD.equipment_id;
        ref_other_equipment_id := OLD.other_equipment_id;
        ref_row_id := OLD.daily_report_row_id;
        ref_rel_id := OLD.id;
    ELSE
        ref_equipment_id := NEW.equipment_id;
        ref_other_equipment_id := NEW.other_equipment_id;
        ref_row_id := NEW.daily_report_row_id;
        ref_rel_id := NEW.id;
    END IF;

    IF TG_OP = 'INSERT' THEN
        IF ref_equipment_id IS NOT NULL THEN
            SELECT v.domain, v.intern_number INTO vehicle_data
            FROM vehicles v WHERE v.id = ref_equipment_id;

            IF FOUND THEN
                readable_data := jsonb_build_object(
                    'vehiculo_id', ref_equipment_id,
                    'vehiculo_dominio', vehicle_data.domain,
                    'vehiculo_numero_interno', vehicle_data.intern_number,
                    'tipo_equipo', 'vehicle'
                );
            END IF;
        ELSIF ref_other_equipment_id IS NOT NULL THEN
            SELECT oe.intern_number, oe.serial_number, t.name as type_name
            INTO other_equip_data
            FROM other_equipment oe
            LEFT JOIN type t ON t.id = oe.type_id
            WHERE oe.id = ref_other_equipment_id;

            IF FOUND THEN
                readable_data := jsonb_build_object(
                    'otro_equipo_id', ref_other_equipment_id,
                    'otro_equipo_numero_interno', other_equip_data.intern_number,
                    'otro_equipo_numero_serie', other_equip_data.serial_number,
                    'otro_equipo_tipo', other_equip_data.type_name,
                    'tipo_equipo', 'other_equipment'
                );
            END IF;
        END IF;

        IF readable_data IS NOT NULL THEN
            INSERT INTO dailyreportrows_history (
                daily_report_row_id, related_table, related_id,
                action_type, changed_fields, changed_data, changed_by
            ) VALUES (
                ref_row_id, 'dailyreportequipmentrelations', ref_rel_id,
                'LINK', '{}'::JSONB, readable_data, user_id
            );
        END IF;

    ELSIF TG_OP = 'DELETE' THEN
        SELECT EXISTS (
            SELECT 1 FROM dailyreportrows WHERE id = ref_row_id
        ) INTO parent_exists;

        IF parent_exists THEN
            IF ref_equipment_id IS NOT NULL THEN
                SELECT v.domain, v.intern_number INTO vehicle_data
                FROM vehicles v WHERE v.id = ref_equipment_id;

                IF FOUND THEN
                    readable_data := jsonb_build_object(
                        'vehiculo_id', ref_equipment_id,
                        'vehiculo_dominio', vehicle_data.domain,
                        'vehiculo_numero_interno', vehicle_data.intern_number,
                        'tipo_equipo', 'vehicle'
                    );
                END IF;
            ELSIF ref_other_equipment_id IS NOT NULL THEN
                SELECT oe.intern_number, oe.serial_number, t.name as type_name
                INTO other_equip_data
                FROM other_equipment oe
                LEFT JOIN type t ON t.id = oe.type_id
                WHERE oe.id = ref_other_equipment_id;

                IF FOUND THEN
                    readable_data := jsonb_build_object(
                        'otro_equipo_id', ref_other_equipment_id,
                        'otro_equipo_numero_interno', other_equip_data.intern_number,
                        'otro_equipo_numero_serie', other_equip_data.serial_number,
                        'otro_equipo_tipo', other_equip_data.type_name,
                        'tipo_equipo', 'other_equipment'
                    );
                END IF;
            END IF;

            IF readable_data IS NOT NULL THEN
                INSERT INTO dailyreportrows_history (
                    daily_report_row_id, related_table, related_id,
                    action_type, changed_fields, changed_data, changed_by
                ) VALUES (
                    ref_row_id, 'dailyreportequipmentrelations', ref_rel_id,
                    'UNLINK', '{}'::JSONB, readable_data, user_id
                );
            END IF;
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$function$;

-- function log_reassignment_reason_before_update (origen: supabase/migrations/20260202113926_fixing-maintenance-flow.sql)
CREATE OR REPLACE FUNCTION public.log_reassignment_reason_before_update()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    reason TEXT;
BEGIN
    BEGIN
        reason := current_setting('myapp.reassignment_reason', true);
        RAISE LOG 'BEFORE UPDATE: reassignment_reason = %', reason;
    EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'BEFORE UPDATE: Error obteniendo reassignment_reason';
    END;
    
    RETURN NEW;
END;
$function$;

-- function next_pre_file_number (origen: prisma/migrations/20260810120000_auto_generate_pre_file_number/migration.sql)
CREATE OR REPLACE FUNCTION public.next_pre_file_number(p_company_id uuid)
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_next integer;
BEGIN
  -- Se libera solo al terminar la transaccion del INSERT: sin esto, dos altas
  -- concurrentes leerian el mismo maximo y chocarian contra el unique.
  PERFORM pg_advisory_xact_lock(hashtext('pre_employees.pre_file_number'), hashtext(p_company_id::text));

  SELECT COALESCE(MAX(SUBSTRING(pre_file_number FROM 4)::integer), 0) + 1
  INTO v_next
  FROM pre_employees
  WHERE company_id = p_company_id
    AND pre_file_number ~ '^PL-[0-9]+$';

  RETURN 'PL-' || LPAD(v_next::text, 4, '0');
END;
$$;

-- function select_distinct_values (origen: supabase/migrations/20260202113926_fixing-maintenance-flow.sql)
CREATE OR REPLACE FUNCTION public.select_distinct_values(p_table_name text, p_column_path text, p_join_mappings jsonb DEFAULT NULL::jsonb, p_multi_join_paths jsonb DEFAULT NULL::jsonb, p_filters jsonb DEFAULT NULL::jsonb)
 RETURNS TABLE(col_value text, col_count bigint)
 LANGUAGE plpgsql
AS $function$
DECLARE
    query TEXT;
    parts TEXT[];
    current_table TEXT;
    current_column TEXT;
    join_clause TEXT := '';
    where_clause TEXT := '';
    table_alias_counter INTEGER := 1;
    i INTEGER;
    target_table TEXT;
    fk_column TEXT;
    mapping_key TEXT;
    mapping_value TEXT;
    processed_mappings JSONB;
    join_info JSONB;
    joins_array_length INTEGER;
    parsed_multi_join_paths JSONB;
    parsed_filters JSONB;
    filter_key TEXT;
    filter_value TEXT;
    filter_conditions TEXT[] := ARRAY[]::TEXT[];
    -- 🔑 NUEVO: Mapeo de tablas a aliases
    table_aliases JSONB := '{}'::JSONB;
    filter_table TEXT;
    filter_column TEXT;
    filter_parts TEXT[];
BEGIN
    RAISE LOG '[SELECT_DISTINCT_VALUES] === INICIO DE EJECUCIÓN ===';
    RAISE LOG '[SELECT_DISTINCT_VALUES] Parámetros de entrada:';
    RAISE LOG '[SELECT_DISTINCT_VALUES] - p_table_name: %', p_table_name;
    RAISE LOG '[SELECT_DISTINCT_VALUES] - p_column_path: %', p_column_path;
    RAISE LOG '[SELECT_DISTINCT_VALUES] - p_join_mappings: %', p_join_mappings;
    RAISE LOG '[SELECT_DISTINCT_VALUES] - p_multi_join_paths: %', p_multi_join_paths;
    RAISE LOG '[SELECT_DISTINCT_VALUES] - p_filters: %', p_filters;
    
    -- 🔑 NUEVO: Inicializar mapeo de tabla principal
    table_aliases := jsonb_set(table_aliases, ARRAY[p_table_name], to_jsonb(p_table_name));
    
    -- Si se proporciona multi_join_paths, usar la nueva lógica
    IF p_multi_join_paths IS NOT NULL AND p_multi_join_paths != 'null'::jsonb THEN
        RAISE LOG '[SELECT_DISTINCT_VALUES] Usando multi_join_paths';
        
        -- Parsear el JSON si viene como string
        BEGIN
            IF jsonb_typeof(p_multi_join_paths) = 'string' THEN
                parsed_multi_join_paths := (p_multi_join_paths #>> '{}')::JSONB;
                RAISE LOG '[SELECT_DISTINCT_VALUES] JSON parseado desde string: %', parsed_multi_join_paths;
            ELSE
                parsed_multi_join_paths := p_multi_join_paths;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION 'Error al parsear p_multi_join_paths: %. Valor recibido: %', SQLERRM, p_multi_join_paths;
        END;
        
        -- Validar que el parámetro tenga la estructura correcta
        IF NOT (parsed_multi_join_paths ? 'joins' AND parsed_multi_join_paths ? 'final_column') THEN
            RAISE EXCEPTION 'p_multi_join_paths debe contener "joins" y "final_column". Recibido: %', parsed_multi_join_paths;
        END IF;
        
        -- Obtener la longitud del array de joins de forma segura
        joins_array_length := jsonb_array_length(parsed_multi_join_paths->'joins');
        
        IF joins_array_length IS NULL OR joins_array_length = 0 THEN
            RAISE EXCEPTION 'El array "joins" en p_multi_join_paths está vacío o es NULL';
        END IF;
        
        current_table := p_table_name;
        
        -- Construir JOINs múltiples basados en el array de joins
        FOR i IN 0..joins_array_length - 1 LOOP
            join_info := parsed_multi_join_paths->'joins'->i;
            
            -- Validar que el join_info tenga todas las propiedades necesarias
            IF NOT (join_info ? 'from_table' AND join_info ? 'to_table' AND join_info ? 'from_column' AND join_info ? 'to_column') THEN
                RAISE EXCEPTION 'Cada elemento del array "joins" debe contener: from_table, to_table, from_column, to_column';
            END IF;
            
            join_clause := join_clause || format(' LEFT JOIN %I t%s ON %I.%I::TEXT = t%s.%I::TEXT',
                join_info->>'to_table', 
                table_alias_counter,
                current_table,
                join_info->>'from_column',
                table_alias_counter,
                join_info->>'to_column'
            );
            
            -- 🔑 NUEVO: Registrar alias de tabla
            table_aliases := jsonb_set(table_aliases, ARRAY[join_info->>'to_table'], to_jsonb('t' || table_alias_counter));
            
            RAISE LOG '[SELECT_DISTINCT_VALUES] JOIN construido: %', join_clause;
            RAISE LOG '[SELECT_DISTINCT_VALUES] Alias registrado: % -> t%', join_info->>'to_table', table_alias_counter;
            
            current_table := 't' || table_alias_counter;
            table_alias_counter := table_alias_counter + 1;
        END LOOP;
        
        -- Extraer tabla y columna final
        parts := string_to_array(parsed_multi_join_paths->>'final_column', '.');
        IF array_length(parts, 1) = 2 THEN
            current_table := 't' || (table_alias_counter - 1); -- Usar el último alias
            current_column := parts[2];
        ELSE
            current_column := parsed_multi_join_paths->>'final_column';
        END IF;
        
    ELSE
        -- Lógica existente sin cambios para join_mappings
        BEGIN
            IF p_join_mappings IS NOT NULL AND jsonb_typeof(p_join_mappings) = 'string' THEN
                processed_mappings := (p_join_mappings #>> '{}')::JSONB;
                RAISE LOG '[SELECT_DISTINCT_VALUES] Convertido string JSON interno a JSONB: %', processed_mappings;
            ELSE
                processed_mappings := p_join_mappings;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION 'Error al procesar p_join_mappings: %. Valor recibido: %', SQLERRM, p_join_mappings;
        END;
        
        -- Dividir el column_path en partes
        parts := string_to_array(p_column_path, '.');
        current_table := p_table_name;
        
        -- Si hay más de una parte, es una relación anidada
        IF array_length(parts, 1) > 1 THEN
            RAISE LOG '[SELECT_DISTINCT_VALUES] Partes anidadas detectadas: %', array_to_string(parts, ', ');
            RAISE LOG '[SELECT_DISTINCT_VALUES] Procesando relación anidada...';
            
            -- Procesar cada nivel de la relación
            FOR i IN 1..array_length(parts, 1)-1 LOOP
                RAISE LOG '[SELECT_DISTINCT_VALUES] Procesando nivel %: buscando tabla destino para columna %', i, parts[i];
                
                -- Buscar en los mappings
                target_table := NULL;
                fk_column := NULL;
                
                -- Iterar sobre los mappings para encontrar la relación
                IF processed_mappings IS NOT NULL THEN
                    FOR mapping_key, mapping_value IN SELECT * FROM jsonb_each_text(processed_mappings) LOOP
                        RAISE LOG '[SELECT_DISTINCT_VALUES] Evaluando mapping: % -> %', mapping_key, mapping_value;
                        
                        -- CORREGIDO: Formato correcto {"tabla_destino": "columna_fk"}
                        IF mapping_key = parts[i] THEN
                            target_table := mapping_key;
                            fk_column := mapping_value;
                            RAISE LOG '[SELECT_DISTINCT_VALUES] Formato correcto detectado: tabla_destino=%, columna_fk=%', target_table, fk_column;
                            EXIT;
                        END IF;
                        
                        -- Formato legacy: {"columna_fk": "tabla_destino"}
                        IF mapping_value = parts[i] THEN
                            target_table := mapping_value;
                            fk_column := mapping_key;
                            RAISE LOG '[SELECT_DISTINCT_VALUES] Formato legacy detectado: tabla_destino=%, columna_fk=%', target_table, fk_column;
                            RAISE WARNING '[SELECT_DISTINCT_VALUES] Usando formato legacy de join_mappings. Se recomienda usar: {"%": "%"}', parts[i], target_table;
                            EXIT;
                        END IF;
                    END LOOP;
                END IF;
                
                -- Si no se encontró mapping, buscar por foreign key
                IF target_table IS NULL THEN
                    SELECT 
                        ccu.table_name,
                        kcu.column_name
                    INTO target_table, fk_column
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
                    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
                    WHERE tc.constraint_type = 'FOREIGN KEY'
                      AND tc.table_name = current_table
                      AND kcu.column_name = parts[i]
                    LIMIT 1;
                    
                    IF target_table IS NOT NULL THEN
                        RAISE LOG '[SELECT_DISTINCT_VALUES] Relación encontrada por FK: tabla_destino=%, columna_fk=%', target_table, fk_column;
                    END IF;
                END IF;
                
                -- Si aún no se encontró, error
                IF target_table IS NULL THEN
                    RAISE EXCEPTION 'No se encontró clave foránea para la columna % en la tabla % y no hay mapping disponible', parts[i], current_table;
                END IF;
                
                -- Validar que la tabla destino existe
                IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = target_table AND table_schema = 'public') THEN
                    RAISE EXCEPTION 'La tabla destino % no existe', target_table;
                END IF;
                
                -- Validar que la columna FK existe en la tabla actual
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = current_table AND column_name = fk_column AND table_schema = 'public') THEN
                    RAISE EXCEPTION 'La columna % no existe en la tabla %', fk_column, current_table;
                END IF;
                
                -- Construir el JOIN
                join_clause := join_clause || format(' LEFT JOIN %I t%s ON %I.%I::TEXT = t%s.id::TEXT',
                    target_table, table_alias_counter, current_table, fk_column, table_alias_counter);
                
                -- 🔑 NUEVO: Registrar alias de tabla
                table_aliases := jsonb_set(table_aliases, ARRAY[target_table], to_jsonb('t' || table_alias_counter));
                
                RAISE LOG '[SELECT_DISTINCT_VALUES] JOIN construido: %', join_clause;
                RAISE LOG '[SELECT_DISTINCT_VALUES] Alias registrado: % -> t%', target_table, table_alias_counter;
                
                current_table := 't' || table_alias_counter;
                table_alias_counter := table_alias_counter + 1;
            END LOOP;
            
            current_column := parts[array_length(parts, 1)];
        ELSE
            current_column := p_column_path;
        END IF;
    END IF;
    
    -- 🔑 MODIFICADO: Procesar filtros con soporte para relaciones
    IF p_filters IS NOT NULL AND p_filters != 'null'::jsonb AND jsonb_typeof(p_filters) != 'null' THEN
        RAISE LOG '[SELECT_DISTINCT_VALUES] Procesando filtros: %', p_filters;
        
        -- Parsear el JSON si viene como string
        BEGIN
            IF jsonb_typeof(p_filters) = 'string' THEN
                parsed_filters := (p_filters #>> '{}')::JSONB;
                RAISE LOG '[SELECT_DISTINCT_VALUES] Filtros parseados desde string: %', parsed_filters;
            ELSE
                parsed_filters := p_filters;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION 'Error al parsear p_filters: %. Valor recibido: %', SQLERRM, p_filters;
        END;
        
        -- Verificar que parsed_filters no sea null antes de iterar
        IF parsed_filters IS NOT NULL AND jsonb_typeof(parsed_filters) = 'object' THEN
            -- Iterar sobre cada filtro
            FOR filter_key, filter_value IN SELECT * FROM jsonb_each_text(parsed_filters) LOOP
                RAISE LOG '[SELECT_DISTINCT_VALUES] Aplicando filtro: % = %', filter_key, filter_value;
                
                -- 🔑 NUEVO: Determinar tabla y columna del filtro
                filter_parts := string_to_array(filter_key, '.');
                IF array_length(filter_parts, 1) = 2 THEN
                    -- Filtro con tabla.columna
                    filter_table := filter_parts[1];
                    filter_column := filter_parts[2];
                    
                    -- Buscar el alias de la tabla
                    IF table_aliases ? filter_table THEN
                        filter_table := table_aliases ->> filter_table;
                        RAISE LOG '[SELECT_DISTINCT_VALUES] Usando alias para tabla %: %', filter_parts[1], filter_table;
                    ELSE
                        -- Si no hay alias, usar el nombre original
                        filter_table := filter_parts[1];
                        RAISE LOG '[SELECT_DISTINCT_VALUES] No se encontró alias para tabla %, usando nombre original', filter_table;
                    END IF;
                ELSE
                    -- Filtro simple, usar tabla principal
                    filter_table := p_table_name;
                    filter_column := filter_key;
                END IF;
                
                -- Construir condición de filtro
                IF filter_value = 'null' THEN
                    filter_conditions := array_append(filter_conditions, format('%I.%I IS NULL', filter_table, filter_column));
                ELSIF filter_value = 'not_null' THEN
                    filter_conditions := array_append(filter_conditions, format('%I.%I IS NOT NULL', filter_table, filter_column));
                ELSIF filter_value IN ('true', 'false') THEN
                    -- Para valores booleanos
                    filter_conditions := array_append(filter_conditions, format('%I.%I = %s', filter_table, filter_column, filter_value));
                ELSE
                    -- Para valores de texto
                    filter_conditions := array_append(filter_conditions, format('%I.%I::TEXT = %L', filter_table, filter_column, filter_value));
                END IF;
                
                RAISE LOG '[SELECT_DISTINCT_VALUES] Condición de filtro construida: %', filter_conditions[array_length(filter_conditions, 1)];
            END LOOP;
        END IF;
        
        -- Construir cláusula WHERE
        IF array_length(filter_conditions, 1) > 0 THEN
            where_clause := ' WHERE ' || array_to_string(filter_conditions, ' AND ');
            RAISE LOG '[SELECT_DISTINCT_VALUES] Cláusula WHERE construida: %', where_clause;
        END IF;
    ELSE
        RAISE LOG '[SELECT_DISTINCT_VALUES] No se aplicarán filtros (p_filters es null o vacío)';
    END IF;
    
    -- Construir la consulta final
    query := format('SELECT COALESCE(%I.%I::TEXT, ''null'') as col_value, COUNT(*) as col_count FROM %I%s%s GROUP BY COALESCE(%I.%I::TEXT, ''null'') ORDER BY col_value ASC',
        current_table, current_column, p_table_name, join_clause, where_clause, current_table, current_column);
    
    RAISE LOG '[SELECT_DISTINCT_VALUES] Consulta SQL generada: %', query;
    
    -- Ejecutar la consulta
    RETURN QUERY EXECUTE query;
    
    RAISE LOG '[SELECT_DISTINCT_VALUES] === FIN DE EJECUCIÓN ===';
END;
$function$;

-- function update_company_by_defect (origen: supabase/migrations/20251103211302_initial_structure.sql)
CREATE OR REPLACE FUNCTION public.update_company_by_defect()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NEW.by_defect = true THEN
        UPDATE company
        SET by_defect = false
        WHERE owner_id = NEW.owner_id AND id <> NEW.id;
    END IF;
    RETURN NEW;
END;
$function$;

-- function update_updated_at_column (origen: supabase/migrations/20260202113926_fixing-maintenance-flow.sql)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- ============================================================================
-- TRIGGERS (7)
-- ============================================================================

-- trigger update_company_by_defect_trigger ON company (origen: supabase/migrations/20251103211302_initial_structure.sql)
DROP TRIGGER IF EXISTS update_company_by_defect_trigger ON public.company;
CREATE TRIGGER update_company_by_defect_trigger AFTER INSERT OR UPDATE OF by_defect ON public.company FOR EACH ROW EXECUTE FUNCTION public.update_company_by_defect();

-- trigger after_service_update ON customer_services (origen: supabase/migrations/20251103211302_initial_structure.sql)
DROP TRIGGER IF EXISTS after_service_update ON public.customer_services;
CREATE TRIGGER after_service_update AFTER UPDATE OF is_active ON public.customer_services FOR EACH ROW WHEN ((old.is_active IS DISTINCT FROM new.is_active)) EXECUTE FUNCTION public.deactivate_service_items();

-- trigger update_empleado_aptitudes_updated_at ON empleado_aptitudes (origen: supabase/migrations/20251103211302_initial_structure.sql)
DROP TRIGGER IF EXISTS update_empleado_aptitudes_updated_at ON public.empleado_aptitudes;
CREATE TRIGGER update_empleado_aptitudes_updated_at BEFORE UPDATE ON public.empleado_aptitudes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- trigger after_employee_insert ON employees (origen: supabase/migrations/20251103211302_initial_structure.sql)
DROP TRIGGER IF EXISTS after_employee_insert ON public.employees;
CREATE TRIGGER after_employee_insert AFTER INSERT ON public.employees FOR EACH ROW EXECUTE FUNCTION public.add_to_companies_employees();

-- trigger format_employee_names_trigger ON employees (origen: supabase/migrations/20251103211302_initial_structure.sql)
DROP TRIGGER IF EXISTS format_employee_names_trigger ON public.employees;
CREATE TRIGGER format_employee_names_trigger BEFORE INSERT OR UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.format_employee_names();

-- trigger after_service_update ON service_items (origen: supabase/migrations/20251103211302_initial_structure.sql)
DROP TRIGGER IF EXISTS after_service_update ON public.service_items;
CREATE TRIGGER after_service_update AFTER UPDATE OF is_active ON public.service_items FOR EACH ROW WHEN ((old.is_active IS DISTINCT FROM new.is_active)) EXECUTE FUNCTION public.deactivate_service_items();

-- trigger add_contractor_equipment_after_insert ON vehicles (origen: supabase/migrations/20251103211302_initial_structure.sql)
DROP TRIGGER IF EXISTS add_contractor_equipment_after_insert ON public.vehicles;
CREATE TRIGGER add_contractor_equipment_after_insert AFTER INSERT ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.equipment_allocated_to();

-- ── prisma/sql/permissions.sql ───────────────────────────────────────────────────────────────
-- Generado por scripts/sql/extract-sql-objects.ts — editar a mano SOLO en la revisión de Task 4
-- Dominio: permissions — 6 objeto(s)

-- ============================================================================
-- FUNCTIONS (5)
-- ============================================================================

-- function assign_owner_role_on_company_creation (origen: supabase/migrations/20260202113926_fixing-maintenance-flow.sql)
CREATE OR REPLACE FUNCTION public.assign_owner_role_on_company_creation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_owner_role_id BIGINT;
  v_user_id UUID;
BEGIN
  -- Verificar que la empresa tiene un owner_id
  IF NEW.owner_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_user_id := NEW.owner_id;

  -- Obtener el ID del rol OWNER
  SELECT id INTO v_owner_role_id
  FROM roles
  WHERE slug = 'owner'
  LIMIT 1;

  -- Si no existe el rol OWNER, no hacer nada (evitar errores)
  IF v_owner_role_id IS NULL THEN
    RAISE WARNING 'Rol OWNER no encontrado. No se asignará rol automáticamente.';
    RETURN NEW;
  END IF;

  -- Asignar el rol OWNER al usuario si no lo tiene ya
  INSERT INTO user_roles (user_id, role_id)
  VALUES (v_user_id, v_owner_role_id)
  ON CONFLICT (user_id, role_id) DO NOTHING;

  -- Asegurar que el usuario tenga acceso a la empresa en share_company_users
  -- (solo si no existe ya)
  IF NOT EXISTS (
    SELECT 1 
    FROM share_company_users 
    WHERE company_id = NEW.id AND profile_id = v_user_id
  ) THEN
    INSERT INTO share_company_users (company_id, profile_id)
    VALUES (NEW.id, v_user_id);
  END IF;

  RETURN NEW;
END;
$function$;

-- function check_multiple_permissions (origen: supabase/migrations/20260202113926_fixing-maintenance-flow.sql)
CREATE OR REPLACE FUNCTION public.check_multiple_permissions(p_user_id uuid, p_permissions jsonb)
 RETURNS TABLE(module_slug text, tab_slug text, action_slug text, has_permission boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    perm->>'module' as module_slug,
    perm->>'tab' as tab_slug,
    perm->>'action' as action_slug,
    EXISTS (
      SELECT 1 
      FROM public.get_user_permissions(p_user_id) up
      WHERE up.module_slug = perm->>'module'
        AND up.tab_slug = perm->>'tab'
        AND up.action_slug = perm->>'action'
        AND up.is_granted = true
    ) as has_permission
  FROM jsonb_array_elements(p_permissions) as perm;
END;
$function$;

-- function get_user_accessible_modules (origen: supabase/migrations/20260202113926_fixing-maintenance-flow.sql)
CREATE OR REPLACE FUNCTION public.get_user_accessible_modules(p_user_id uuid)
 RETURNS TABLE(module_id uuid, module_slug text, module_name text, module_icon text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        m.id,
        m.slug,
        m.name,
        m.icon
    FROM public.modules m
    WHERE m.is_active = true
        AND EXISTS (
            SELECT 1
            FROM public.get_user_permissions(p_user_id) up
            WHERE up.module_id = m.id
                AND up.action_slug = 'view'  -- Only count 'view' permissions
        )
    ORDER BY m.id;
END;
$function$;

-- function get_user_permissions (origen: supabase/migrations/20260202113926_fixing-maintenance-flow.sql)
CREATE OR REPLACE FUNCTION public.get_user_permissions(p_user_id uuid)
 RETURNS TABLE(module_id uuid, module_slug text, module_name text, tab_id uuid, tab_slug text, tab_name text, action_id uuid, action_slug text, action_name text, source text, is_granted boolean, role_id bigint, role_name text, role_color text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    WITH user_role_permissions AS (
        -- Get permissions from user's roles
        SELECT DISTINCT
            m.id as module_id,
            m.slug as module_slug,
            m.name as module_name,
            t.id as tab_id,
            t.slug as tab_slug,
            t.name as tab_name,
            a.id as action_id,
            a.slug as action_slug,
            a.name as action_name,
            'role' as source,
            true as is_granted,
            r.id as role_id,
            r.name as role_name,
            r.color as role_color
        FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        JOIN public.role_permissions rp ON ur.role_id = rp.role_id
        JOIN public.tabs t ON rp.tab_id = t.id
        JOIN public.modules m ON t.module_id = m.id
        JOIN public.actions a ON rp.action_id = a.id
        WHERE ur.user_id = p_user_id
            AND m.is_active = true
            AND t.is_active = true
            AND r.is_active = true
    ),
    user_custom_permissions AS (
        -- Get custom permissions (overrides)
        SELECT
            m.id as module_id,
            m.slug as module_slug,
            m.name as module_name,
            t.id as tab_id,
            t.slug as tab_slug,
            t.name as tab_name,
            a.id as action_id,
            a.slug as action_slug,
            a.name as action_name,
            'custom' as source,
            up.is_granted,
            NULL::bigint as role_id,
            NULL::text as role_name,
            NULL::text as role_color
        FROM public.user_permissions up
        JOIN public.tabs t ON up.tab_id = t.id
        JOIN public.modules m ON t.module_id = m.id
        JOIN public.actions a ON up.action_id = a.id
        WHERE up.user_id = p_user_id
            AND m.is_active = true
            AND t.is_active = true
    )
    -- Combine both, with custom permissions taking precedence
    SELECT DISTINCT ON (
        COALESCE(ucp.module_id, urp.module_id), 
        COALESCE(ucp.tab_id, urp.tab_id), 
        COALESCE(ucp.action_id, urp.action_id)
    )
        COALESCE(ucp.module_id, urp.module_id),
        COALESCE(ucp.module_slug, urp.module_slug),
        COALESCE(ucp.module_name, urp.module_name),
        COALESCE(ucp.tab_id, urp.tab_id),
        COALESCE(ucp.tab_slug, urp.tab_slug),
        COALESCE(ucp.tab_name, urp.tab_name),
        COALESCE(ucp.action_id, urp.action_id),
        COALESCE(ucp.action_slug, urp.action_slug),
        COALESCE(ucp.action_name, urp.action_name),
        COALESCE(ucp.source, urp.source),
        COALESCE(ucp.is_granted, urp.is_granted),
        COALESCE(ucp.role_id, urp.role_id),
        COALESCE(ucp.role_name, urp.role_name),
        COALESCE(ucp.role_color, urp.role_color)
    FROM user_role_permissions urp
    FULL OUTER JOIN user_custom_permissions ucp 
        ON urp.tab_id = ucp.tab_id AND urp.action_id = ucp.action_id
    WHERE COALESCE(ucp.is_granted, urp.is_granted) = true
    ORDER BY 
        COALESCE(ucp.module_id, urp.module_id), 
        COALESCE(ucp.tab_id, urp.tab_id), 
        COALESCE(ucp.action_id, urp.action_id), 
        ucp.source NULLS LAST;
END;
$function$;

-- function user_has_permission (origen: supabase/migrations/20260202113926_fixing-maintenance-flow.sql)
CREATE OR REPLACE FUNCTION public.user_has_permission(p_user_id uuid, p_module_slug text, p_tab_slug text, p_action_slug text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
    v_has_permission boolean;
BEGIN
    -- Check if user has the permission (from role or custom)
    SELECT EXISTS (
        SELECT 1
        FROM public.get_user_permissions(p_user_id) up
        WHERE up.module_slug = p_module_slug
            AND up.tab_slug = p_tab_slug
            AND up.action_slug = p_action_slug
            AND up.is_granted = true
    ) INTO v_has_permission;
    
    RETURN v_has_permission;
END;
$function$;

-- ============================================================================
-- TRIGGERS (1)
-- ============================================================================

-- trigger assign_owner_role_trigger ON company (origen: supabase/migrations/20251215222557_adding-kpi.sql)
DROP TRIGGER IF EXISTS assign_owner_role_trigger ON public.company;
CREATE TRIGGER assign_owner_role_trigger AFTER INSERT ON public.company FOR EACH ROW EXECUTE FUNCTION public.assign_owner_role_on_company_creation();

-- ── prisma/sql/documents.sql ─────────────────────────────────────────────────────────────────
-- Generado por scripts/sql/extract-sql-objects.ts — editar a mano SOLO en la revisión de Task 4
-- Dominio: documents — 28 objeto(s)
-- Revisado a mano en la Task 4 (P1): actor por app.user_id, tipos de documento filtrados por empresa.

-- ============================================================================
-- FUNCTIONS (14)
-- ============================================================================

-- function controlar_alertas_documentos_single_employee (origen: prisma/migrations/20260917120000_ticket_712_unificar_status_documentacion/migration.sql)
CREATE OR REPLACE FUNCTION public.controlar_alertas_documentos_single_employee(
  employee_id_param uuid,
  company_id_param uuid
)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
  user_id uuid;
  doc RECORD;
  where_sql text;
  conditions_jsonb jsonb;
  employee_matches boolean;
  emp_active boolean;
  -- Clasificacion de los tipos recorridos en el loop:
  v_limpiar_vacias uuid[] := '{}';  -- baja sin doc de egreso, o ya no aplica
  v_archivar       uuid[] := '{}';  -- ya no aplica y tiene archivo -> historial
  v_desarchivar    uuid[] := '{}';  -- volvio a cumplir la condicion special
  v_crear_alerta   uuid[] := '{}';  -- aplica: alerta pendiente si no hay fila
BEGIN
  -- Task 4: actor de la transaccion (SET LOCAL app.user_id, helper withActor) en lugar
  -- del sub del JWT de Supabase. Desde triggers/jobs queda NULL, como antes.
  user_id := public.app_current_user_id();

  SELECT is_active INTO emp_active FROM employees WHERE id = employee_id_param;

  FOR doc IN
    SELECT * FROM document_types
    WHERE mandatory = true AND applies = 'Persona' AND is_active = true
      -- Task 4: tipos globales (company_id NULL) o de la empresa del empleado
      AND (company_id IS NULL OR company_id = company_id_param)
  LOOP
    -- Empleado dado de baja + tipo NO de baja: no debe tener alerta; limpiar la vacia.
    IF NOT (COALESCE(doc.down_document, false) OR COALESCE(emp_active, true)) THEN
      v_limpiar_vacias := array_append(v_limpiar_vacias, doc.id);
      CONTINUE;
    END IF;

    IF doc.special AND doc.conditions IS NOT NULL AND array_length(doc.conditions, 1) > 0 THEN
      SELECT array_to_json(doc.conditions)::jsonb INTO conditions_jsonb;
      where_sql := build_employee_where_alias(conditions_jsonb, 'e');

      IF where_sql IS NULL OR where_sql = '' OR where_sql = 'TRUE' THEN
        CONTINUE;
      END IF;

      EXECUTE format(
        'SELECT EXISTS(SELECT 1 FROM employees e WHERE e.id = %L AND e.company_id = %L AND %s)',
        employee_id_param, company_id_param, where_sql
      ) INTO employee_matches;

      IF employee_matches THEN
        -- 358: vuelve a aplicar -> re-activar lo archivado (conserva archivo/validity)
        v_desarchivar  := array_append(v_desarchivar, doc.id);
        v_crear_alerta := array_append(v_crear_alerta, doc.id);
      ELSE
        -- 358: ya no aplica. Sin archivo -> borrar (alerta vacia). Con archivo -> archivar.
        v_limpiar_vacias := array_append(v_limpiar_vacias, doc.id);
        v_archivar       := array_append(v_archivar, doc.id);
      END IF;
    ELSE
      v_crear_alerta := array_append(v_crear_alerta, doc.id);
    END IF;
  END LOOP;

  -- Escrituras agrupadas (una sentencia por tipo de operacion).
  IF cardinality(v_limpiar_vacias) > 0 THEN
    DELETE FROM documents_employees
    WHERE applies = employee_id_param
      AND id_document_types = ANY(v_limpiar_vacias)
      AND (document_path IS NULL OR document_path = '');
  END IF;

  IF cardinality(v_archivar) > 0 THEN
    UPDATE documents_employees SET archived_at = now()
    WHERE applies = employee_id_param
      AND id_document_types = ANY(v_archivar)
      AND document_path IS NOT NULL AND document_path <> ''
      AND archived_at IS NULL;
  END IF;

  IF cardinality(v_desarchivar) > 0 THEN
    UPDATE documents_employees SET archived_at = NULL
    WHERE applies = employee_id_param
      AND id_document_types = ANY(v_desarchivar)
      AND archived_at IS NOT NULL;
  END IF;

  IF cardinality(v_crear_alerta) > 0 THEN
    INSERT INTO documents_employees (id_document_types, applies, validity, state, is_active, user_id, deny_reason, document_path)
    SELECT t.id, employee_id_param, NULL, 'pendiente', TRUE, user_id, NULL, NULL
    FROM unnest(v_crear_alerta) AS t(id)
    WHERE NOT EXISTS (
      SELECT 1 FROM documents_employees
      WHERE id_document_types = t.id AND applies = employee_id_param
    );
  END IF;

  -- 712: una sola formula de status (antes habia una propia, que nunca podia
  -- dar 'Completo' porque contaba como faltantes los tipos especiales que no
  -- le corresponden al empleado).
  PERFORM public.recalcular_status_documentacion(ARRAY[employee_id_param], 'Persona');
END;
$function$;

-- function controlar_alertas_documentos_single_vehicle (origen: prisma/migrations/20260917120000_ticket_712_unificar_status_documentacion/migration.sql)
CREATE OR REPLACE FUNCTION public.controlar_alertas_documentos_single_vehicle(
  vehicle_id_param uuid,
  company_id_param uuid
)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
  user_id uuid;
  doc RECORD;
  where_sql text;
  conditions_jsonb jsonb;
  vehicle_matches boolean;
  veh_active boolean;
  v_limpiar_vacias uuid[] := '{}';
  v_archivar       uuid[] := '{}';
  v_desarchivar    uuid[] := '{}';
  v_crear_alerta   uuid[] := '{}';
BEGIN
  -- Task 4: actor de la transaccion (SET LOCAL app.user_id, helper withActor) en lugar
  -- del sub del JWT de Supabase. Desde triggers/jobs queda NULL, como antes.
  user_id := public.app_current_user_id();

  SELECT is_active INTO veh_active FROM vehicles WHERE id = vehicle_id_param;

  FOR doc IN
    SELECT * FROM document_types
    WHERE mandatory = true AND applies = 'Equipos' AND is_active = true
      -- Task 4: tipos globales (company_id NULL) o de la empresa del vehiculo
      AND (company_id IS NULL OR company_id = company_id_param)
  LOOP
    IF NOT (COALESCE(doc.down_document, false) OR COALESCE(veh_active, true)) THEN
      v_limpiar_vacias := array_append(v_limpiar_vacias, doc.id);
      CONTINUE;
    END IF;

    IF doc.special AND doc.conditions IS NOT NULL AND array_length(doc.conditions, 1) > 0 THEN
      SELECT array_to_json(doc.conditions)::jsonb INTO conditions_jsonb;
      where_sql := build_vehicle_where_alias(conditions_jsonb, 'v');

      IF where_sql IS NULL OR where_sql = '' OR where_sql = 'TRUE' THEN
        CONTINUE;
      END IF;

      EXECUTE format(
        'SELECT EXISTS(SELECT 1 FROM vehicles v WHERE v.id = %L AND v.company_id = %L AND %s)',
        vehicle_id_param, company_id_param, where_sql
      ) INTO vehicle_matches;

      IF vehicle_matches THEN
        v_desarchivar  := array_append(v_desarchivar, doc.id);
        v_crear_alerta := array_append(v_crear_alerta, doc.id);
      ELSE
        v_limpiar_vacias := array_append(v_limpiar_vacias, doc.id);
        v_archivar       := array_append(v_archivar, doc.id);
      END IF;
    ELSE
      v_crear_alerta := array_append(v_crear_alerta, doc.id);
    END IF;
  END LOOP;

  IF cardinality(v_limpiar_vacias) > 0 THEN
    DELETE FROM documents_equipment
    WHERE applies = vehicle_id_param
      AND id_document_types = ANY(v_limpiar_vacias)
      AND (document_path IS NULL OR document_path = '');
  END IF;

  IF cardinality(v_archivar) > 0 THEN
    UPDATE documents_equipment SET archived_at = now()
    WHERE applies = vehicle_id_param
      AND id_document_types = ANY(v_archivar)
      AND document_path IS NOT NULL AND document_path <> ''
      AND archived_at IS NULL;
  END IF;

  IF cardinality(v_desarchivar) > 0 THEN
    UPDATE documents_equipment SET archived_at = NULL
    WHERE applies = vehicle_id_param
      AND id_document_types = ANY(v_desarchivar)
      AND archived_at IS NOT NULL;
  END IF;

  IF cardinality(v_crear_alerta) > 0 THEN
    INSERT INTO documents_equipment (id_document_types, applies, validity, state, is_active, user_id, deny_reason, document_path)
    SELECT t.id, vehicle_id_param, NULL, 'pendiente', TRUE, user_id, NULL, NULL
    FROM unnest(v_crear_alerta) AS t(id)
    WHERE NOT EXISTS (
      SELECT 1 FROM documents_equipment
      WHERE id_document_types = t.id AND applies = vehicle_id_param
    );
  END IF;

  PERFORM public.recalcular_status_documentacion(ARRAY[vehicle_id_param], 'Equipos');
END;
$function$;

-- function controlar_alertas_single_document_all_employees (origen: prisma/migrations/20260703150000_reactivar_documentos_al_cumplir_condicion_all/migration.sql)
CREATE OR REPLACE FUNCTION public.controlar_alertas_single_document_all_employees(document_type_id_param uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  doc RECORD;
  employee_record RECORD;
  employee_matches boolean;
  where_sql text;
  conditions_jsonb jsonb;
BEGIN
  SELECT * INTO doc FROM document_types
  WHERE id = document_type_id_param
    AND mandatory = true
    AND applies = 'Persona'
    AND is_active = true;

  IF NOT FOUND THEN RETURN; END IF;

  IF doc.special AND doc.conditions IS NOT NULL AND array_length(doc.conditions, 1) > 0 THEN
    SELECT array_to_json(doc.conditions)::jsonb INTO conditions_jsonb;
    where_sql := build_employee_where_alias(conditions_jsonb, 'e');

    -- Guard: si where_sql es invalido, no hacer nada
    IF where_sql IS NULL OR where_sql = '' OR where_sql = 'TRUE' THEN RETURN; END IF;

    -- Task 4 (multi-empresa): un tipo global (company_id NULL) aplica a los empleados de
    -- todas las empresas; un tipo de una empresa, solo a los de esa empresa. El match final
    -- lo decide la condicion (where_sql). Antes se recorrian TODOS los empleados sin filtro
    -- ("solo GH opera recursos"), y mas atras el filtro roto "company_id = doc.company_id"
    -- (con NULL no iteraba a nadie).
    FOR employee_record IN
      SELECT id FROM employees
      WHERE (COALESCE(doc.down_document, false) OR is_active = true)
        AND (doc.company_id IS NULL OR company_id = doc.company_id)
    LOOP
      EXECUTE format(
        'SELECT EXISTS(SELECT 1 FROM employees e WHERE e.id = %L AND %s)',
        employee_record.id, where_sql
      ) INTO employee_matches;

      IF employee_matches THEN
        -- 411: vuelve a cumplir -> re-activar lo que estuviese archivado (conserva archivo/validity)
        UPDATE documents_employees SET archived_at = NULL
        WHERE id_document_types = doc.id
          AND applies = employee_record.id
          AND archived_at IS NOT NULL;
        -- crear alerta pendiente si no existe ninguna fila
        INSERT INTO documents_employees (id_document_types, applies, validity, state, is_active, user_id, deny_reason, document_path)
        SELECT doc.id, employee_record.id, NULL, 'pendiente', TRUE, NULL, NULL, NULL
        WHERE NOT EXISTS (
          SELECT 1 FROM documents_employees
          WHERE id_document_types = doc.id AND applies = employee_record.id
        );
      ELSE
        -- Empleado ya no cumple condiciones: borrar alerta vacia (sin doc subido)
        DELETE FROM documents_employees
        WHERE id_document_types = doc.id
          AND applies = employee_record.id
          AND (document_path IS NULL OR document_path = '');
      END IF;
    END LOOP;
  ELSE
    -- Tipo no especial: crear para todos los empleados de la(s) empresa(s) del tipo
    FOR employee_record IN
      SELECT id FROM employees
      WHERE (COALESCE(doc.down_document, false) OR is_active = true)
        AND (doc.company_id IS NULL OR company_id = doc.company_id)
    LOOP
      INSERT INTO documents_employees (id_document_types, applies, validity, state, is_active, user_id, deny_reason, document_path)
      SELECT doc.id, employee_record.id, NULL, 'pendiente', TRUE, NULL, NULL, NULL
      WHERE NOT EXISTS (
        SELECT 1 FROM documents_employees
        WHERE id_document_types = doc.id AND applies = employee_record.id
      );
    END LOOP;
  END IF;
END;
$function$;

-- function controlar_alertas_single_document_all_vehicles (origen: prisma/migrations/20260703150000_reactivar_documentos_al_cumplir_condicion_all/migration.sql)
CREATE OR REPLACE FUNCTION public.controlar_alertas_single_document_all_vehicles(document_type_id_param uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  doc RECORD;
  vehicle_record RECORD;
  vehicle_matches boolean;
  where_sql text;
  conditions_jsonb jsonb;
BEGIN
  SELECT * INTO doc FROM document_types
  WHERE id = document_type_id_param
    AND mandatory = true
    AND applies = 'Equipos'
    AND is_active = true;

  IF NOT FOUND THEN RETURN; END IF;

  IF doc.special AND doc.conditions IS NOT NULL AND array_length(doc.conditions, 1) > 0 THEN
    SELECT array_to_json(doc.conditions)::jsonb INTO conditions_jsonb;
    where_sql := build_vehicle_where_alias(conditions_jsonb, 'v');

    IF where_sql IS NULL OR where_sql = '' OR where_sql = 'TRUE' THEN RETURN; END IF;

    -- Task 4 (multi-empresa): tipo global -> vehiculos de todas las empresas; tipo de una
    -- empresa -> solo los de esa. El match final lo decide la condicion (where_sql).
    FOR vehicle_record IN
      SELECT id FROM vehicles
      WHERE (COALESCE(doc.down_document, false) OR is_active = true)
        AND (doc.company_id IS NULL OR company_id = doc.company_id)
    LOOP
      EXECUTE format(
        'SELECT EXISTS(SELECT 1 FROM vehicles v WHERE v.id = %L AND %s)',
        vehicle_record.id, where_sql
      ) INTO vehicle_matches;

      IF vehicle_matches THEN
        -- 411: vuelve a cumplir -> re-activar lo que estuviese archivado (conserva archivo/validity)
        UPDATE documents_equipment SET archived_at = NULL
        WHERE id_document_types = doc.id
          AND applies = vehicle_record.id
          AND archived_at IS NOT NULL;
        INSERT INTO documents_equipment (id_document_types, applies, validity, state, is_active, user_id, deny_reason, document_path)
        SELECT doc.id, vehicle_record.id, NULL, 'pendiente', TRUE, NULL, NULL, NULL
        WHERE NOT EXISTS (
          SELECT 1 FROM documents_equipment
          WHERE id_document_types = doc.id AND applies = vehicle_record.id
        );
      ELSE
        -- Vehiculo ya no cumple condiciones: borrar alerta vacia (sin doc subido)
        DELETE FROM documents_equipment
        WHERE id_document_types = doc.id
          AND applies = vehicle_record.id
          AND (document_path IS NULL OR document_path = '');
      END IF;
    END LOOP;
  ELSE
    -- Tipo no especial: crear para todos los vehiculos de la(s) empresa(s) del tipo
    FOR vehicle_record IN
      SELECT id FROM vehicles
      WHERE (COALESCE(doc.down_document, false) OR is_active = true)
        AND (doc.company_id IS NULL OR company_id = doc.company_id)
    LOOP
      INSERT INTO documents_equipment (id_document_types, applies, validity, state, is_active, user_id, deny_reason, document_path)
      SELECT doc.id, vehicle_record.id, NULL, 'pendiente', TRUE, NULL, NULL, NULL
      WHERE NOT EXISTS (
        SELECT 1 FROM documents_equipment
        WHERE id_document_types = doc.id AND applies = vehicle_record.id
      );
    END LOOP;
  END IF;
END;
$function$;

-- function get_documents_expiry_summary (origen: prisma/migrations/20260512190920_add_expired_doctype_ids_to_expiry_rpc/migration.sql)
CREATE OR REPLACE FUNCTION public.get_documents_expiry_summary(
  p_days_ahead int DEFAULT 7,
  p_detail_limit int DEFAULT 20,
  -- Task 4: empresa a resumir (el job de P5 corre una vez por empresa). NULL = todas.
  p_company_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date;
  v_window_end date;
  v_result jsonb;
BEGIN
  v_today := (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;
  v_window_end := v_today + p_days_ahead;

  WITH
    employees_expiring_all AS (
      SELECT
        de.id,
        de.applies AS employee_id,
        de.id_document_types AS document_type_id,
        de.validity::date AS validity,
        e.file AS file_number,
        TRIM(BOTH ' ' FROM CONCAT_WS(', ', e.lastname, e.firstname)) AS employee_name,
        dt.name AS document_type_name,
        (de.validity::date - v_today)::int AS days_remaining
      FROM documents_employees de
      INNER JOIN employees e ON e.id = de.applies
      INNER JOIN document_types dt ON dt.id = de.id_document_types
      WHERE
        de.is_active = true
        AND e.is_active = true
        AND (p_company_id IS NULL OR e.company_id = p_company_id)
        AND dt.is_active = true
        AND de.state <> 'pendiente'
        AND de.validity IS NOT NULL
        AND de.validity::date BETWEEN v_today AND v_window_end
    ),
    equipment_expiring_all AS (
      SELECT
        deq.id,
        deq.applies AS vehicle_id,
        deq.id_document_types AS document_type_id,
        deq.validity::date AS validity,
        COALESCE(v.domain, '—') AS domain,
        COALESCE(v.intern_number, '—') AS intern_number,
        dt.name AS document_type_name,
        (deq.validity::date - v_today)::int AS days_remaining
      FROM documents_equipment deq
      INNER JOIN vehicles v ON v.id = deq.applies
      INNER JOIN document_types dt ON dt.id = deq.id_document_types
      WHERE
        deq.is_active = true
        AND v.is_active = true
        AND (p_company_id IS NULL OR v.company_id = p_company_id)
        AND dt.is_active = true
        AND deq.state <> 'pendiente'
        AND deq.validity IS NOT NULL
        AND deq.validity::date BETWEEN v_today AND v_window_end
    ),
    company_docs_parsed AS (
      SELECT
        dc.id,
        dc.id_document_types AS document_type_id,
        dc.state,
        dc.validity AS validity_raw,
        CASE
          WHEN dc.validity ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$'
            THEN TO_DATE(dc.validity, 'DD/MM/YYYY')
          ELSE NULL
        END AS validity_parsed,
        dt.name AS document_type_name
      FROM documents_company dc
      INNER JOIN document_types dt ON dt.id = dc.id_document_types
      WHERE
        dc.is_active = true
        AND dt.is_active = true
        AND (p_company_id IS NULL OR dc.applies = p_company_id)
    ),
    company_expiring_all AS (
      SELECT
        id,
        document_type_id,
        validity_parsed AS validity,
        validity_raw,
        document_type_name,
        (validity_parsed - v_today)::int AS days_remaining
      FROM company_docs_parsed
      WHERE
        state <> 'pendiente'
        AND validity_parsed IS NOT NULL
        AND validity_parsed BETWEEN v_today AND v_window_end
    ),
    -- ── IDs distintos de doc_types para vencidos (por entidad) ──────────────
    employees_expired_doc_type_ids AS (
      SELECT DISTINCT de.id_document_types AS dt_id
      FROM documents_employees de
      INNER JOIN employees e ON e.id = de.applies
      INNER JOIN document_types dt ON dt.id = de.id_document_types
      WHERE de.is_active = true
        AND e.is_active = true
        AND (p_company_id IS NULL OR e.company_id = p_company_id)
        AND dt.is_active = true
        AND de.state <> 'pendiente'
        AND de.validity IS NOT NULL
        AND de.validity::date < v_today
    ),
    equipment_expired_doc_type_ids AS (
      SELECT DISTINCT deq.id_document_types AS dt_id
      FROM documents_equipment deq
      INNER JOIN vehicles v ON v.id = deq.applies
      INNER JOIN document_types dt ON dt.id = deq.id_document_types
      WHERE deq.is_active = true
        AND v.is_active = true
        AND (p_company_id IS NULL OR v.company_id = p_company_id)
        AND dt.is_active = true
        AND deq.state <> 'pendiente'
        AND deq.validity IS NOT NULL
        AND deq.validity::date < v_today
    ),
    company_expired_doc_type_ids AS (
      SELECT DISTINCT document_type_id AS dt_id
      FROM company_docs_parsed
      WHERE state <> 'pendiente'
        AND validity_parsed IS NOT NULL
        AND validity_parsed < v_today
    )

  SELECT jsonb_build_object(
    'generated_at',  NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires',
    'today',         v_today,
    'window_end',    v_window_end,
    'days_ahead',    p_days_ahead,
    'detail_limit',  p_detail_limit,

    'expiring_soon', jsonb_build_object(
      'employees', jsonb_build_object(
        'total',  (SELECT COUNT(*) FROM employees_expiring_all),
        'detail', COALESCE(
          (SELECT jsonb_agg(
              jsonb_build_object(
                'id',                  d.id,
                'employee_id',         d.employee_id,
                'document_type_id',    d.document_type_id,
                'file_number',         d.file_number,
                'employee_name',       d.employee_name,
                'document_type_name',  d.document_type_name,
                'validity',            d.validity,
                'days_remaining',      d.days_remaining
              ) ORDER BY d.validity, d.employee_name
           ) FROM employees_expiring_all d),
          '[]'::jsonb
        )
      ),
      'equipment', jsonb_build_object(
        'total',  (SELECT COUNT(*) FROM equipment_expiring_all),
        'detail', COALESCE(
          (SELECT jsonb_agg(
              jsonb_build_object(
                'id',                  d.id,
                'vehicle_id',          d.vehicle_id,
                'document_type_id',    d.document_type_id,
                'domain',              d.domain,
                'intern_number',       d.intern_number,
                'document_type_name',  d.document_type_name,
                'validity',            d.validity,
                'days_remaining',      d.days_remaining
              ) ORDER BY d.validity, d.domain
           ) FROM equipment_expiring_all d),
          '[]'::jsonb
        )
      ),
      'company', jsonb_build_object(
        'total',  (SELECT COUNT(*) FROM company_expiring_all),
        'detail', COALESCE(
          (SELECT jsonb_agg(
              jsonb_build_object(
                'id',                  d.id,
                'document_type_id',    d.document_type_id,
                'document_type_name',  d.document_type_name,
                'validity',            d.validity,
                'validity_raw',        d.validity_raw,
                'days_remaining',      d.days_remaining
              ) ORDER BY d.validity, d.document_type_name
           ) FROM company_expiring_all d),
          '[]'::jsonb
        )
      )
    ),

    'expired_counts', jsonb_build_object(
      'employees', (
        SELECT COUNT(*)
        FROM documents_employees de
        INNER JOIN employees e ON e.id = de.applies
        INNER JOIN document_types dt ON dt.id = de.id_document_types
        WHERE de.is_active = true
          AND e.is_active = true
          AND (p_company_id IS NULL OR e.company_id = p_company_id)
          AND dt.is_active = true
          AND de.state <> 'pendiente'
          AND de.validity IS NOT NULL
          AND de.validity::date < v_today
      ),
      'equipment', (
        SELECT COUNT(*)
        FROM documents_equipment deq
        INNER JOIN vehicles v ON v.id = deq.applies
        INNER JOIN document_types dt ON dt.id = deq.id_document_types
        WHERE deq.is_active = true
          AND v.is_active = true
          AND (p_company_id IS NULL OR v.company_id = p_company_id)
          AND dt.is_active = true
          AND deq.state <> 'pendiente'
          AND deq.validity IS NOT NULL
          AND deq.validity::date < v_today
      ),
      'company', (
        SELECT COUNT(*)
        FROM company_docs_parsed
        WHERE state <> 'pendiente'
          AND validity_parsed IS NOT NULL
          AND validity_parsed < v_today
      )
    ),

    -- NUEVO: IDs distintos de doc_types con vencidos, por entidad
    'expired_doc_type_ids', jsonb_build_object(
      'employees', COALESCE(
        (SELECT jsonb_agg(dt_id) FROM employees_expired_doc_type_ids),
        '[]'::jsonb
      ),
      'equipment', COALESCE(
        (SELECT jsonb_agg(dt_id) FROM equipment_expired_doc_type_ids),
        '[]'::jsonb
      ),
      'company', COALESCE(
        (SELECT jsonb_agg(dt_id) FROM company_expired_doc_type_ids),
        '[]'::jsonb
      )
    ),

    'pending_counts', jsonb_build_object(
      'employees', (
        SELECT COUNT(*)
        FROM documents_employees de
        INNER JOIN employees e ON e.id = de.applies
        INNER JOIN document_types dt ON dt.id = de.id_document_types
        WHERE de.is_active = true
          AND e.is_active = true
          AND (p_company_id IS NULL OR e.company_id = p_company_id)
          AND dt.is_active = true
          AND de.state = 'pendiente'
      ),
      'equipment', (
        SELECT COUNT(*)
        FROM documents_equipment deq
        INNER JOIN vehicles v ON v.id = deq.applies
        INNER JOIN document_types dt ON dt.id = deq.id_document_types
        WHERE deq.is_active = true
          AND v.is_active = true
          AND (p_company_id IS NULL OR v.company_id = p_company_id)
          AND dt.is_active = true
          AND deq.state = 'pendiente'
      ),
      'company', (
        SELECT COUNT(*)
        FROM company_docs_parsed
        WHERE state = 'pendiente'
      )
    )
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

-- function log_document_employee_changes (origen: prisma/migrations/20260629120100_optimize_document_triggers/migration.sql)
CREATE OR REPLACE FUNCTION public.log_document_employee_changes()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO documents_employees_logs (documents_employees_id, modified_by, updated_at)
  SELECT id, user_id, now() FROM affected_rows WHERE user_id IS NOT NULL;
  RETURN NULL;
END; $$;

-- function log_document_equipment_changes (origen: prisma/migrations/20260629120100_optimize_document_triggers/migration.sql)
CREATE OR REPLACE FUNCTION public.log_document_equipment_changes()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO documents_equipment_logs (documents_equipment_id, modified_by, updated_at)
  SELECT id, user_id, now() FROM affected_rows WHERE user_id IS NOT NULL;
  RETURN NULL;
END; $$;

-- function recalcular_status_documentacion (origen: prisma/migrations/20260917120000_ticket_712_unificar_status_documentacion/migration.sql)
CREATE OR REPLACE FUNCTION public.recalcular_status_documentacion(
  resource_ids uuid[],
  resource_type text
)
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
  IF resource_ids IS NULL OR cardinality(resource_ids) = 0 THEN
    RETURN;
  END IF;

  IF resource_type = 'Persona' THEN
    UPDATE employees e
    SET status = calc.nuevo
    FROM (
      SELECT x.id,
        (CASE
          WHEN EXISTS (
            SELECT 1 FROM documents_employees d
            WHERE d.applies = x.id AND d.state = 'vencido' AND d.archived_at IS NULL
          ) THEN 'Completo con doc vencida'
          WHEN NOT EXISTS (
            SELECT 1 FROM documents_employees d
            WHERE d.applies = x.id AND d.state <> 'presentado' AND d.archived_at IS NULL
          ) THEN 'Completo'
          ELSE 'Incompleto'
        END)::status_type AS nuevo
      FROM employees x
      WHERE x.id = ANY(resource_ids)
    ) calc
    WHERE e.id = calc.id
      AND e.status IS DISTINCT FROM calc.nuevo;

  ELSIF resource_type = 'Equipos' THEN
    UPDATE vehicles v
    SET status = calc.nuevo
    FROM (
      SELECT x.id,
        (CASE
          WHEN EXISTS (
            SELECT 1 FROM documents_equipment d
            WHERE d.applies = x.id AND d.state = 'vencido' AND d.archived_at IS NULL
          ) THEN 'Completo con doc vencida'
          WHEN NOT EXISTS (
            SELECT 1 FROM documents_equipment d
            WHERE d.applies = x.id AND d.state <> 'presentado' AND d.archived_at IS NULL
          ) THEN 'Completo'
          ELSE 'Incompleto'
        END)::status_type AS nuevo
      FROM vehicles x
      WHERE x.id = ANY(resource_ids)
    ) calc
    WHERE v.id = calc.id
      AND v.status IS DISTINCT FROM calc.nuevo;
  END IF;
END;
$function$;

-- function trg_controlar_alertas_employees (origen: supabase/migrations/20260202113926_fixing-maintenance-flow.sql)
CREATE OR REPLACE FUNCTION public.trg_controlar_alertas_employees()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF current_setting('myapp.inside_controlar_alertas', true) = 'true' THEN
    RETURN NEW;
  END IF;
  
  PERFORM set_config('myapp.inside_controlar_alertas', 'true', true);
  PERFORM controlar_alertas_documentos_single_employee(NEW.id, NEW.company_id);
  PERFORM set_config('myapp.inside_controlar_alertas', 'false', true);
  
  RETURN NEW;
END;
$function$;

-- function trg_controlar_alertas_vehicles (origen: supabase/migrations/20260202113926_fixing-maintenance-flow.sql)
CREATE OR REPLACE FUNCTION public.trg_controlar_alertas_vehicles()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF current_setting('myapp.inside_controlar_alertas_vehicles', true) = 'true' THEN
    RETURN NEW;
  END IF;
  
  PERFORM set_config('myapp.inside_controlar_alertas_vehicles', 'true', true);
  PERFORM controlar_alertas_documentos_single_vehicle(NEW.id, NEW.company_id);
  PERFORM set_config('myapp.inside_controlar_alertas_vehicles', 'false', true);
  
  RETURN NEW;
END;
$function$;

-- function trg_document_types_insert (origen: supabase/migrations/20260202113926_fixing-maintenance-flow.sql)
CREATE OR REPLACE FUNCTION public.trg_document_types_insert()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.mandatory THEN
    IF NEW.applies = 'Persona' THEN
      PERFORM controlar_alertas_single_document_all_employees(NEW.id);
    ELSIF NEW.applies = 'Equipos' THEN
      PERFORM controlar_alertas_single_document_all_vehicles(NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- function trg_document_types_update (origen: prisma/migrations/20260313120000_fix_document_types_triggers/migration.sql)
CREATE OR REPLACE FUNCTION trg_document_types_update()
RETURNS trigger AS $$
BEGIN
  -- Si se esta desactivando, no reconciliar (la app maneja la limpieza)
  IF NEW.is_active = false THEN
    RETURN NEW;
  END IF;
  -- Si se esta reactivando, no reconciliar (la app maneja la creacion de alertas)
  IF OLD.is_active = false AND NEW.is_active = true THEN
    RETURN NEW;
  END IF;
  -- Reconciliacion normal: solo si tipo esta activo y cambio mandatory/conditions
  IF NEW.mandatory OR (OLD.mandatory AND NEW.conditions IS DISTINCT FROM OLD.conditions) THEN
    IF NEW.applies = 'Persona' THEN
      PERFORM controlar_alertas_single_document_all_employees(NEW.id);
    ELSIF NEW.applies = 'Equipos' THEN
      PERFORM controlar_alertas_single_document_all_vehicles(NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- function update_employee_diagram_status (origen: supabase/migrations/20251103211302_initial_structure.sql)
CREATE OR REPLACE FUNCTION public.update_employee_diagram_status(p_employee_id uuid, p_is_active boolean)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    affected_rows INTEGER;
    result JSON;
BEGIN
    -- Verificar que el empleado existe
    IF NOT EXISTS (SELECT 1 FROM employees WHERE id = p_employee_id) THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Employee not found',
            'affected_rows', 0
        );
    END IF;

    -- Actualizar todos los registros de employees_diagram para el empleado
    UPDATE employees_diagram 
    SET is_active = p_is_active
    WHERE employee_id = p_employee_id;
    
    -- Obtener el número de filas afectadas
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    -- Construir respuesta
    result := json_build_object(
        'success', true,
        'message', 'Employee diagram status updated successfully',
        'affected_rows', affected_rows,
        'employee_id', p_employee_id,
        'new_status', p_is_active
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error updating employee diagram status: ' || SQLERRM,
            'affected_rows', 0
        );
END;
$function$;

-- function update_status_trigger (origen: prisma/migrations/20260917120000_ticket_712_unificar_status_documentacion/migration.sql)
CREATE OR REPLACE FUNCTION public.update_status_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  ids uuid[];
BEGIN
  SELECT array_agg(DISTINCT applies) INTO ids
  FROM affected_rows
  WHERE applies IS NOT NULL;

  IF ids IS NULL THEN
    RETURN NULL;
  END IF;

  IF TG_TABLE_NAME = 'documents_employees' THEN
    PERFORM public.recalcular_status_documentacion(ids, 'Persona');
  ELSIF TG_TABLE_NAME = 'documents_equipment' THEN
    PERFORM public.recalcular_status_documentacion(ids, 'Equipos');
  END IF;

  RETURN NULL;
END;
$function$;

-- ============================================================================
-- TRIGGERS (14)
-- ============================================================================

-- trigger document_types_after_insert ON document_types (origen: supabase/migrations/20251103211302_initial_structure.sql)
DROP TRIGGER IF EXISTS document_types_after_insert ON public.document_types;
CREATE TRIGGER document_types_after_insert AFTER INSERT ON public.document_types FOR EACH ROW EXECUTE FUNCTION public.trg_document_types_insert();

-- trigger document_types_after_update ON document_types (origen: supabase/migrations/20251103211302_initial_structure.sql)
DROP TRIGGER IF EXISTS document_types_after_update ON public.document_types;
CREATE TRIGGER document_types_after_update AFTER UPDATE ON public.document_types FOR EACH ROW EXECUTE FUNCTION public.trg_document_types_update();

-- trigger document_employee_changes_trigger ON documents_employees (origen: prisma/migrations/20260629120100_optimize_document_triggers/migration.sql)
DROP TRIGGER IF EXISTS document_employee_changes_trigger ON public.documents_employees;
CREATE TRIGGER document_employee_changes_trigger
  AFTER INSERT ON public.documents_employees
  REFERENCING NEW TABLE AS affected_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.log_document_employee_changes();

-- trigger trg_update_documents_employees ON documents_employees (origen: prisma/migrations/20260629120100_optimize_document_triggers/migration.sql)
DROP TRIGGER IF EXISTS trg_update_documents_employees ON public.documents_employees;
CREATE TRIGGER trg_update_documents_employees
  AFTER UPDATE ON public.documents_employees
  REFERENCING NEW TABLE AS affected_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.update_status_trigger();

-- trigger trg_update_documents_employees_del ON documents_employees (origen: prisma/migrations/20260917120000_ticket_712_unificar_status_documentacion/migration.sql)
DROP TRIGGER IF EXISTS trg_update_documents_employees_del ON public.documents_employees;
CREATE TRIGGER trg_update_documents_employees_del
  AFTER DELETE ON public.documents_employees
  REFERENCING OLD TABLE AS affected_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.update_status_trigger();

-- trigger trg_update_documents_employees_ins ON documents_employees (origen: prisma/migrations/20260629120100_optimize_document_triggers/migration.sql)
DROP TRIGGER IF EXISTS trg_update_documents_employees_ins ON public.documents_employees;
CREATE TRIGGER trg_update_documents_employees_ins
  AFTER INSERT ON public.documents_employees
  REFERENCING NEW TABLE AS affected_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.update_status_trigger();

-- trigger document_equipment_changes_trigger ON documents_equipment (origen: prisma/migrations/20260629120100_optimize_document_triggers/migration.sql)
DROP TRIGGER IF EXISTS document_equipment_changes_trigger ON public.documents_equipment;
CREATE TRIGGER document_equipment_changes_trigger
  AFTER INSERT ON public.documents_equipment
  REFERENCING NEW TABLE AS affected_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.log_document_equipment_changes();

-- trigger trg_update_documents_equipment ON documents_equipment (origen: prisma/migrations/20260629120100_optimize_document_triggers/migration.sql)
DROP TRIGGER IF EXISTS trg_update_documents_equipment ON public.documents_equipment;
CREATE TRIGGER trg_update_documents_equipment
  AFTER UPDATE ON public.documents_equipment
  REFERENCING NEW TABLE AS affected_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.update_status_trigger();

-- trigger trg_update_documents_equipment_del ON documents_equipment (origen: prisma/migrations/20260917120000_ticket_712_unificar_status_documentacion/migration.sql)
DROP TRIGGER IF EXISTS trg_update_documents_equipment_del ON public.documents_equipment;
CREATE TRIGGER trg_update_documents_equipment_del
  AFTER DELETE ON public.documents_equipment
  REFERENCING OLD TABLE AS affected_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.update_status_trigger();

-- trigger trg_update_documents_equipment_ins ON documents_equipment (origen: prisma/migrations/20260629120100_optimize_document_triggers/migration.sql)
DROP TRIGGER IF EXISTS trg_update_documents_equipment_ins ON public.documents_equipment;
CREATE TRIGGER trg_update_documents_equipment_ins
  AFTER INSERT ON public.documents_equipment
  REFERENCING NEW TABLE AS affected_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.update_status_trigger();

-- trigger controlar_alertas_employees ON employees (origen: prisma/migrations/20260629150000_ampliar_guarda_controlar_alertas/migration.sql)
DROP TRIGGER IF EXISTS controlar_alertas_employees ON public.employees;
CREATE TRIGGER controlar_alertas_employees
  AFTER UPDATE ON public.employees
  FOR EACH ROW
  WHEN (
    old.is_active            IS DISTINCT FROM new.is_active
    OR old.company_id        IS DISTINCT FROM new.company_id
    OR old.company_position  IS DISTINCT FROM new.company_position
    OR old.category_id       IS DISTINCT FROM new.category_id
    OR old.cost_center_id    IS DISTINCT FROM new.cost_center_id
    OR old.covenants_id      IS DISTINCT FROM new.covenants_id
    OR old.guild_id          IS DISTINCT FROM new.guild_id
    OR old.hierarchical_position IS DISTINCT FROM new.hierarchical_position
  )
  EXECUTE FUNCTION public.trg_controlar_alertas_employees();

-- trigger controlar_alertas_employees_insert ON employees (origen: supabase/migrations/20251204151557_adding-documents-triggers.sql)
DROP TRIGGER IF EXISTS controlar_alertas_employees_insert ON public.employees;
CREATE TRIGGER controlar_alertas_employees_insert AFTER INSERT ON public.employees FOR EACH ROW EXECUTE FUNCTION public.trg_controlar_alertas_employees();

-- trigger controlar_alertas_vehicles ON vehicles (origen: prisma/migrations/20260629150000_ampliar_guarda_controlar_alertas/migration.sql)
DROP TRIGGER IF EXISTS controlar_alertas_vehicles ON public.vehicles;
CREATE TRIGGER controlar_alertas_vehicles
  AFTER UPDATE ON public.vehicles
  FOR EACH ROW
  WHEN (
    old.is_active        IS DISTINCT FROM new.is_active
    OR old.company_id    IS DISTINCT FROM new.company_id
    OR old.type          IS DISTINCT FROM new.type
    OR old.type_of_vehicle IS DISTINCT FROM new.type_of_vehicle
    OR old."subType"     IS DISTINCT FROM new."subType"
  )
  EXECUTE FUNCTION public.trg_controlar_alertas_vehicles();

-- trigger controlar_alertas_vehicles_insert ON vehicles (origen: supabase/migrations/20251204151557_adding-documents-triggers.sql)
DROP TRIGGER IF EXISTS controlar_alertas_vehicles_insert ON public.vehicles;
CREATE TRIGGER controlar_alertas_vehicles_insert AFTER INSERT ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.trg_controlar_alertas_vehicles();

-- ── prisma/sql/diagrams.sql ──────────────────────────────────────────────────────────────────
-- Generado por scripts/sql/extract-sql-objects.ts — editar a mano SOLO en la revisión de Task 4
-- Dominio: diagrams — 13 objeto(s)

-- ============================================================================
-- FUNCTIONS (12)
-- ============================================================================

-- function check_diagram_conflicts_with_operations_v2 (origen: supabase/migrations/20260202113926_fixing-maintenance-flow.sql)
CREATE OR REPLACE FUNCTION public.check_diagram_conflicts_with_operations_v2(p_employee_ids text[], p_work_diagram_id uuid, p_date_from date, p_date_to date)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    conflict_record RECORD;
    operation_conflicts json[] := '{}';
    simple_conflicts json[] := '{}';
    result json;
BEGIN
    -- Verificar conflictos con operaciones (registros en uso)
    FOR conflict_record IN
        SELECT DISTINCT
            ed.employee_id,
            CONCAT(e.firstname, ' ', e.lastname) as employee_name,
            TO_CHAR(make_date(ed.year, ed.month, ed.day), 'DD/MM/YYYY') as date,
            dt.name as diagram_type
        FROM employees_diagram ed
        JOIN employees e ON e.id = ed.employee_id::uuid
        JOIN diagram_type dt ON dt.id = ed.diagram_type::uuid
        WHERE ed.employee_id = ANY(p_employee_ids)
          AND make_date(ed.year, ed.month, ed.day) BETWEEN p_date_from AND p_date_to
          AND EXISTS (
              SELECT 1 
              FROM dailyreportemployeerelations drer
              JOIN dailyreportrows drr ON drr.id = drer.daily_report_row_id
              JOIN dailyreport dr ON dr.id = drr.daily_report_id
              WHERE drer.employee_id = ed.employee_id::uuid
                AND dr.date = make_date(ed.year, ed.month, ed.day)
          )
    LOOP
        operation_conflicts := operation_conflicts || json_build_object(
            'employee_id', conflict_record.employee_id,
            'employee_name', conflict_record.employee_name,
            'date', conflict_record.date,
            'diagram_type', conflict_record.diagram_type,
            'conflict_type', 'OPERATION_IN_USE'
        );
    END LOOP;

    -- Verificar conflictos simples (registros existentes pero no en uso)
    FOR conflict_record IN
        SELECT DISTINCT
            ed.employee_id,
            CONCAT(e.firstname, ' ', e.lastname) as employee_name,
            TO_CHAR(make_date(ed.year, ed.month, ed.day), 'DD/MM/YYYY') as date,
            dt.name as diagram_type
        FROM employees_diagram ed
        JOIN employees e ON e.id = ed.employee_id::uuid
        JOIN diagram_type dt ON dt.id = ed.diagram_type::uuid
        WHERE ed.employee_id = ANY(p_employee_ids)
          AND make_date(ed.year, ed.month, ed.day) BETWEEN p_date_from AND p_date_to
          AND NOT EXISTS (
              SELECT 1 
              FROM dailyreportemployeerelations drer
              JOIN dailyreportrows drr ON drr.id = drer.daily_report_row_id
              JOIN dailyreport dr ON dr.id = drr.daily_report_id
              WHERE drer.employee_id = ed.employee_id::uuid
                AND dr.date = make_date(ed.year, ed.month, ed.day)
          )
    LOOP
        simple_conflicts := simple_conflicts || json_build_object(
            'employee_id', conflict_record.employee_id,
            'employee_name', conflict_record.employee_name,
            'date', conflict_record.date,
            'diagram_type', conflict_record.diagram_type,
            'conflict_type', 'SIMPLE_CONFLICT'
        );
    END LOOP;

    -- Construir resultado
    result := json_build_object(
        'operation_conflicts', array_to_json(operation_conflicts),
        'simple_conflicts', array_to_json(simple_conflicts),
        'total_operation_conflicts', array_length(operation_conflicts, 1),
        'total_simple_conflicts', array_length(simple_conflicts, 1)
    );

    RETURN result;
END;
$function$;

-- function check_novelty_conflicts (origen: prisma/migrations/20260416180000_add_novelty_massive_rpcs/migration.sql)
CREATE OR REPLACE FUNCTION public.check_novelty_conflicts(
  p_employee_ids text[],
  p_diagram_type_id text,
  p_date_from date,
  p_date_to date
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_conflicts json[];
  v_conflict_record json;
  v_current_date date;
  employee_record RECORD;
  v_existing_diagram_id uuid;
  v_existing_diagram_name text;
  v_existing_diagram_color text;
  v_new_novelty_name text;
  v_new_novelty_color text;
BEGIN
  -- Info de la novedad nueva
  SELECT dt.name, dt.color
    INTO v_new_novelty_name, v_new_novelty_color
  FROM diagram_type dt
  WHERE dt.id = p_diagram_type_id::uuid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Novelty not found: %', p_diagram_type_id;
  END IF;

  -- Por cada empleado × día del rango: ver si ya existe registro y si está en uso por operaciones
  FOR employee_record IN
    SELECT e.id, e.firstname, e.lastname
    FROM employees e
    WHERE e.id::text = ANY(p_employee_ids)
  LOOP
    v_current_date := p_date_from;
    WHILE v_current_date <= p_date_to LOOP
      SELECT ed.diagram_type, dt.name, dt.color
        INTO v_existing_diagram_id, v_existing_diagram_name, v_existing_diagram_color
      FROM employees_diagram ed
      LEFT JOIN diagram_type dt ON ed.diagram_type = dt.id
      WHERE ed.employee_id = employee_record.id
        AND ed.day = EXTRACT(DAY FROM v_current_date)
        AND ed.month = EXTRACT(MONTH FROM v_current_date)
        AND ed.year = EXTRACT(YEAR FROM v_current_date);

      IF FOUND THEN
        IF EXISTS (
          SELECT 1
          FROM dailyreportemployeerelations drer
          JOIN dailyreportrows drr ON drer.daily_report_row_id = drr.id
          JOIN dailyreport dr ON drr.daily_report_id = dr.id
          WHERE drer.employee_id = employee_record.id
            AND dr.date = v_current_date
        ) THEN
          -- IN_USE: no se puede actualizar
          v_conflict_record := json_build_object(
            'employee_id', employee_record.id,
            'employee_name', employee_record.firstname || ' ' || employee_record.lastname,
            'day', EXTRACT(DAY FROM v_current_date),
            'month', EXTRACT(MONTH FROM v_current_date),
            'year', EXTRACT(YEAR FROM v_current_date),
            'date_formatted', v_current_date::text,
            'current_diagram_type', v_existing_diagram_id,
            'current_diagram_name', COALESCE(v_existing_diagram_name, 'Sin nombre'),
            'current_diagram_color', COALESCE(v_existing_diagram_color, '#6b7280'),
            'new_diagram_name', COALESCE(v_new_novelty_name, 'Sin nombre'),
            'new_diagram_color', COALESCE(v_new_novelty_color, '#6b7280'),
            'is_used_in_operations', true,
            'can_update', false,
            'conflict_type', 'IN_USE'
          );
        ELSE
          -- CAN_UPDATE: se puede reemplazar
          v_conflict_record := json_build_object(
            'employee_id', employee_record.id,
            'employee_name', employee_record.firstname || ' ' || employee_record.lastname,
            'day', EXTRACT(DAY FROM v_current_date),
            'month', EXTRACT(MONTH FROM v_current_date),
            'year', EXTRACT(YEAR FROM v_current_date),
            'date_formatted', v_current_date::text,
            'current_diagram_type', v_existing_diagram_id,
            'current_diagram_name', COALESCE(v_existing_diagram_name, 'Sin nombre'),
            'current_diagram_color', COALESCE(v_existing_diagram_color, '#6b7280'),
            'new_diagram_name', COALESCE(v_new_novelty_name, 'Sin nombre'),
            'new_diagram_color', COALESCE(v_new_novelty_color, '#6b7280'),
            'is_used_in_operations', false,
            'can_update', true,
            'conflict_type', 'CAN_UPDATE'
          );
        END IF;
        v_conflicts := array_append(v_conflicts, v_conflict_record);
      END IF;

      v_current_date := v_current_date + INTERVAL '1 day';
    END LOOP;
  END LOOP;

  RETURN json_build_object(
    'conflicts', COALESCE(v_conflicts, '{}'),
    'diagram_type_id', p_diagram_type_id
  );
END;
$$;

-- function get_employee_diagram_count_by_day (origen: supabase/migrations/20251103211302_initial_structure.sql)
CREATE OR REPLACE FUNCTION public.get_employee_diagram_count_by_day(p_day integer, p_month integer, p_year integer, p_company_position_ids uuid[] DEFAULT NULL::uuid[], save_to_table boolean DEFAULT false, p_company_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE 
  total_active_employees INTEGER; 
  employees_with_diagram INTEGER; 
  employees_without_diagram INTEGER; 
  result_array JSON; 
BEGIN 
  -- Contar empleados activos (con filtro opcional por company_position) 
  SELECT COUNT(*) 
  INTO total_active_employees 
  FROM employees e 
  WHERE e.is_active = true 
    AND ( 
      p_company_position_ids IS NULL 
      OR array_length(p_company_position_ids, 1) = 0 
      OR e.company_position = ANY(p_company_position_ids) 
    )
    AND (p_company_id IS NULL OR e.company_id = p_company_id); 

  -- Contar empleados que tienen diagrama para el día especificado 
  SELECT COUNT(DISTINCT e.id) 
  INTO employees_with_diagram 
  FROM employees e 
  JOIN employees_diagram ed ON e.id = ed.employee_id 
  WHERE e.is_active = true 
    AND ed.day = p_day 
    AND ed.month = p_month 
    AND ed.year = p_year 
    AND ( 
      p_company_position_ids IS NULL 
      OR array_length(p_company_position_ids, 1) = 0 
      OR e.company_position = ANY(p_company_position_ids) 
    )
    AND (p_company_id IS NULL OR e.company_id = p_company_id); 
  
  -- Calcular empleados sin diagrama de forma más directa 
  employees_without_diagram := total_active_employees - employees_with_diagram; 
  
  -- Construir el array de resultados 
  WITH diagram_counts AS ( 
    SELECT 
      dt.id as diagram_type_id, 
      dt.name as diagram_type_name, 
      dt.color as diagram_type_color, 
      COUNT(DISTINCT ed.employee_id) as cantidad_empleados 
    FROM diagram_type dt 
    JOIN employees_diagram ed ON dt.id = ed.diagram_type 
    JOIN employees e ON ed.employee_id = e.id 
    WHERE ed.day = p_day 
      AND ed.month = p_month 
      AND ed.year = p_year 
      AND e.is_active = true 
      AND ( 
        p_company_position_ids IS NULL 
        OR array_length(p_company_position_ids, 1) = 0 
        OR e.company_position = ANY(p_company_position_ids) 
      )
      AND (p_company_id IS NULL OR e.company_id = p_company_id) 
    GROUP BY dt.id, dt.name, dt.color 
  ), 
  diagram_results AS ( 
    SELECT 
      diagram_type_id::TEXT as diagram_type_id_text, 
      diagram_type_name, 
      diagram_type_color, 
      cantidad_empleados 
    FROM diagram_counts 
  ), 
  combined_results AS ( 
    -- Resultados de diagram_types con empleados 
    SELECT * FROM diagram_results 
    
    UNION ALL 
    
    -- Agregar el objeto "Sin diagrama" de forma explícita 
    SELECT 
      '0' as diagram_type_id_text, 
      'Sin diagrama' as diagram_type_name, 
      '#CCCCCC' as diagram_type_color, 
      employees_without_diagram as cantidad_empleados 
    WHERE employees_without_diagram > 0 
  ),
  
  -- Insertar en daily_indicators si save_to_table es true
  insert_data AS (
    INSERT INTO public.daily_indicators (
      company_id,
      snapshot_date,
      metrics,
      source
    )
    SELECT 
      p_company_id,
      make_date(p_year, p_month, p_day),
      json_agg(
        json_build_object(
          'diagram_type_id', diagram_type_id_text,
          'diagram_type_name', diagram_type_name,
          'diagram_type_color', diagram_type_color,
          'cantidad_empleados', cantidad_empleados
        )
      ),
      'get_employee_diagram_count_by_day'::public.indicator_function
    FROM combined_results
    WHERE save_to_table = true AND p_company_id IS NOT NULL
    GROUP BY p_company_id
    RETURNING id
  )
  
  SELECT json_agg( 
    json_build_object( 
      'diagram_type_id', diagram_type_id_text, 
      'diagram_type_name', diagram_type_name, 
      'diagram_type_color', diagram_type_color, 
      'cantidad_empleados', cantidad_empleados 
    ) 
  ) 
  INTO result_array 
  FROM combined_results; 

  -- Si no hay resultados, devolver un array vacío 
  RETURN COALESCE(result_array, '[]'::json); 
END; 
$function$;

-- function handle_employees_diagram_changes (origen: supabase/migrations/20251103211302_initial_structure.sql)
CREATE OR REPLACE FUNCTION public.handle_employees_diagram_changes()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$DECLARE
    v_short_description TEXT;
    v_prev_date TIMESTAMPTZ;
    v_diagram_name TEXT;
    v_old_diagram_name TEXT;
BEGIN
    -- Obtener la descripción corta y el nombre del diagrama actual
    SELECT short_description, name INTO v_short_description, v_diagram_name
    FROM diagram_type
    WHERE id = NEW.diagram_type;

    -- Formatear la fecha
    v_prev_date := TO_TIMESTAMP(NEW.day || '-' || NEW.month || '-' || NEW.year || ' 00:00:00', 'DD-MM-YYYY HH24:MI:SS');

    -- Insertar en diagrams_logs
    IF TG_OP = 'INSERT' THEN
        INSERT INTO diagrams_logs (prev_date, description, state, prev_state, employee_id, diagram_id)
        VALUES (v_prev_date, v_short_description, v_diagram_name, 'Nuevo', NEW.employee_id, NEW.diagram_type);
    ELSIF TG_OP = 'UPDATE' THEN
        -- Obtener el nombre del diagrama anterior
        SELECT name INTO v_old_diagram_name
        FROM diagram_type
        WHERE id = OLD.diagram_type;

        -- Obtener la fecha anterior
        v_prev_date := TO_TIMESTAMP(OLD.day || '-' || OLD.month || '-' || OLD.year || ' 00:00:00', 'DD-MM-YYYY HH24:MI:SS');
        
        INSERT INTO diagrams_logs (prev_date, description, state, prev_state, employee_id, diagram_id)
        VALUES (v_prev_date, v_short_description, v_diagram_name, v_old_diagram_name, NEW.employee_id, NEW.diagram_type);
    END IF;

    RETURN NEW;
END;$function$;

-- function hr_get_absenteeism_summary (origen: supabase/migrations/20251103211302_initial_structure.sql)
CREATE OR REPLACE FUNCTION public.hr_get_absenteeism_summary(p_company_id uuid, p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date, save_to_table boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  tz text := 'America/Argentina/Buenos_Aires';
  today date := (now() at time zone tz)::date;
  dfrom date := COALESCE(p_from, date_trunc('month', today)::date);
  dto date := COALESCE(p_to, today);
  dotacion_anterior int;
  altas int;
  bajas int;
  dotacion_actual int;
  total_ausentes int;
  porcentaje numeric;
  result jsonb;
BEGIN
  SELECT count(*) INTO dotacion_anterior
  FROM public.employees e
  WHERE e.company_id = p_company_id
    AND e.date_of_admission <= (dfrom - 1)
    AND (e.termination_date IS NULL OR e.termination_date > (dfrom - 1));

  SELECT count(*) INTO altas
  FROM public.employees e
  WHERE e.company_id = p_company_id
    AND e.date_of_admission BETWEEN dfrom AND dto;

  SELECT count(*) INTO bajas
  FROM public.employees e
  WHERE e.company_id = p_company_id
    AND e.termination_date BETWEEN dfrom AND dto;

  SELECT count(*) INTO dotacion_actual
  FROM public.employees e
  WHERE e.company_id = p_company_id
    AND e.date_of_admission <= dto
    AND (e.termination_date IS NULL OR e.termination_date > dto);

  WITH d AS (
    SELECT ed.employee_id, ed.diagram_type
    FROM public.employees_diagram ed
    WHERE make_date(ed.year::int, ed.month::int, ed.day::int) = dto
  ),
  absent AS (
    SELECT DISTINCT d.employee_id
    FROM d
    JOIN public.diagram_type dt ON dt.id = d.diagram_type
    WHERE dt.work_active = false
      AND NOT (
        lower(dt.name) LIKE 'franco%' OR dt.short_description IN ('F','FN')
        OR lower(dt.name) LIKE 'ausencia dia de vacaciones%'
      )
  )
  SELECT count(*) INTO total_ausentes
  FROM absent a
  JOIN public.employees e ON e.id = a.employee_id
  WHERE e.company_id = p_company_id
    AND e.date_of_admission <= dto
    AND (e.termination_date IS NULL OR e.termination_date > dto);

  porcentaje := CASE WHEN dotacion_actual > 0
                     THEN round((total_ausentes::numeric * 100.0 / dotacion_actual)::numeric, 2)
                     ELSE 0 END;

  result := jsonb_build_object(
    'dotacionAnterior', dotacion_anterior,
    'altas', altas,
    'bajas', bajas,
    'dotacionActual', dotacion_actual,
    'totalAusentes', total_ausentes,
    'porcentajeAusentismo', porcentaje
  );

  IF save_to_table AND p_company_id IS NOT NULL THEN
    INSERT INTO public.daily_indicators (id, company_id, snapshot_date, metrics, source, created_at)
    VALUES (gen_random_uuid(), p_company_id, dto, result, 'hr_get_absenteeism_summary', now())
    ON CONFLICT (company_id, snapshot_date, source)
    DO UPDATE SET metrics = EXCLUDED.metrics, created_at = now();
  END IF;

  RETURN result;
END
$function$;

-- function hr_get_absenteeism_trend (origen: supabase/migrations/20251103211302_initial_structure.sql)
CREATE OR REPLACE FUNCTION public.hr_get_absenteeism_trend(p_company_id uuid, p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date, save_to_table boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  tz text := 'America/Argentina/Buenos_Aires';
  today date := (now() at time zone tz)::date;
  dfrom date := COALESCE(p_from, date_trunc('month', today)::date);
  dto date := COALESCE(p_to, today);
  result jsonb;
BEGIN
  result := (
    SELECT coalesce(
      jsonb_agg(
        jsonb_build_object(
          'date', to_char(gs.d, 'FMDD/FMMM/YYYY'),
          'percentage', CASE WHEN hc.headcount > 0
                             THEN round((coalesce(ab.absents,0)::numeric * 100.0 / hc.headcount)::numeric, 2)
                             ELSE 0 END
        )
        ORDER BY gs.d
      ),
      '[]'::jsonb
    )
    FROM generate_series(dfrom, dto, interval '1 day') AS gs(d)
    CROSS JOIN LATERAL (
      SELECT count(*)::int AS headcount
      FROM public.employees e
      WHERE e.company_id = p_company_id
        AND e.date_of_admission <= gs.d
        AND (e.termination_date IS NULL OR e.termination_date > gs.d)
    ) hc
    LEFT JOIN LATERAL (
      WITH d AS (
        SELECT ed.employee_id, ed.diagram_type
        FROM public.employees_diagram ed
        WHERE make_date(ed.year::int, ed.month::int, ed.day::int) = gs.d
      ),
      absent AS (
        SELECT DISTINCT d.employee_id
        FROM d
        JOIN public.diagram_type dt ON dt.id = d.diagram_type
        WHERE dt.work_active = false
          AND NOT (
            lower(dt.name) LIKE 'franco%' OR dt.short_description IN ('F','FN')
            OR lower(dt.name) LIKE 'ausencia dia de vacaciones%'
          )
      )
      SELECT count(*)::int AS absents
      FROM absent a
      JOIN public.employees e ON e.id = a.employee_id
      WHERE e.company_id = p_company_id
        AND e.date_of_admission <= gs.d
        AND (e.termination_date IS NULL OR e.termination_date > gs.d)
    ) ab ON true
  );

  IF save_to_table AND p_company_id IS NOT NULL THEN
    INSERT INTO public.daily_indicators (id, company_id, snapshot_date, metrics, source, created_at)
    SELECT
      gen_random_uuid(),
      p_company_id,
      gs.d::date,
      jsonb_build_object(
        'percentage',
        CASE WHEN hc.headcount > 0
             THEN round((coalesce(ab.absents,0)::numeric * 100.0 / hc.headcount)::numeric, 2)
             ELSE 0 END
      ),
      'hr_get_absenteeism_trend',
      now()
    FROM generate_series(dfrom, dto, interval '1 day') AS gs(d)
    CROSS JOIN LATERAL (
      SELECT count(*)::int AS headcount
      FROM public.employees e
      WHERE e.company_id = p_company_id
        AND e.date_of_admission <= gs.d
        AND (e.termination_date IS NULL OR e.termination_date > gs.d)
    ) hc
    LEFT JOIN LATERAL (
      WITH d AS (
        SELECT ed.employee_id, ed.diagram_type
        FROM public.employees_diagram ed
        WHERE make_date(ed.year::int, ed.month::int, ed.day::int) = gs.d
      ),
      absent AS (
        SELECT DISTINCT d.employee_id
        FROM d
        JOIN public.diagram_type dt ON dt.id = d.diagram_type
        WHERE dt.work_active = false
          AND NOT (
            lower(dt.name) LIKE 'franco%' OR dt.short_description IN ('F','FN')
            OR lower(dt.name) LIKE 'ausencia dia de vacaciones%'
          )
      )
      SELECT count(*)::int AS absents
      FROM absent a
      JOIN public.employees e ON e.id = a.employee_id
      WHERE e.company_id = p_company_id
        AND e.date_of_admission <= gs.d
        AND (e.termination_date IS NULL OR e.termination_date > gs.d)
    ) ab ON true
    ON CONFLICT (company_id, snapshot_date, source)
    DO UPDATE SET metrics = EXCLUDED.metrics, created_at = now();
  END IF;

  RETURN result;
END
$function$;

-- function hr_get_current_absent_employees (origen: prisma/migrations/20260812150000_absence_reports_include_diagram_comment/migration.sql)
CREATE OR REPLACE FUNCTION public.hr_get_current_absent_employees(p_company_id uuid, p_date date DEFAULT NULL::date, save_to_table boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  tz text := 'America/Argentina/Buenos_Aires';
  target_date date := COALESCE(p_date, (now() at time zone tz)::date);
  ausentes jsonb;
  altas_info jsonb;
  bajas_info jsonb;
  result jsonb;
BEGIN
  ausentes := (
    WITH base AS (
      SELECT
        e.id AS employee_id,
        e.file AS legajo,
        trim(e.lastname || ' ' || e.firstname) AS nombre,
        cp.name AS company_position,
        h.name AS hierarchical_position
      FROM public.employees e
      LEFT JOIN public.company_positions cp ON cp.id = e.company_position
      LEFT JOIN public.hierarchy h ON h.id = e.hierarchical_position
      WHERE e.company_id = p_company_id
      AND e.date_of_admission <= target_date
      AND (e.termination_date IS NULL OR e.termination_date >= target_date) -- incluir baja en el mismo día
    ),
    today_type AS (
      SELECT DISTINCT ON (ed.employee_id)
        ed.employee_id,
        dt.id AS dt_id,
        dt.name AS turno,
        ed.comments AS comentario
      FROM public.employees_diagram ed
      JOIN public.diagram_type dt ON dt.id = ed.diagram_type
      WHERE make_date(ed.year::int, ed.month::int, ed.day::int) = target_date
      AND dt.work_active = false
      AND NOT (
        lower(dt.name) LIKE 'franco%' OR dt.short_description IN ('F','FN')
        OR lower(dt.name) LIKE 'ausencia dia de vacaciones%'
      )
      ORDER BY ed.employee_id, dt.id
    ),
    period AS (
      SELECT
        b.employee_id,
        b.legajo,
        b.nombre,
        coalesce(b.company_position,'') AS tarea,
        coalesce(b.hierarchical_position,'') AS linea,
        t.turno,
        ''::text AS motivo,
        t.comentario,
        COALESCE(
          (
            SELECT (max(make_date(ed2.year::int, ed2.month::int, ed2.day::int)) + INTERVAL '1 day')::date
            FROM public.employees_diagram ed2
            JOIN public.diagram_type dt2 ON dt2.id = ed2.diagram_type
            WHERE ed2.employee_id = b.employee_id
            AND make_date(ed2.year::int, ed2.month::int, ed2.day::int) < target_date
            AND dt2.id <> t.dt_id
          ),
          (
            SELECT min(make_date(ed3.year::int, ed3.month::int, ed3.day::int))::date
            FROM public.employees_diagram ed3
            WHERE ed3.employee_id = b.employee_id
            AND ed3.diagram_type = t.dt_id
            AND make_date(ed3.year::int, ed3.month::int, ed3.day::int) <= target_date
          ),
          target_date
        ) AS desde,
        COALESCE(
          (
            SELECT (min(make_date(ed4.year::int, ed4.month::int, ed4.day::int)) - INTERVAL '1 day')::date
            FROM public.employees_diagram ed4
            JOIN public.diagram_type dt4 ON dt4.id = ed4.diagram_type
            WHERE ed4.employee_id = b.employee_id
            AND make_date(ed4.year::int, ed4.month::int, ed4.day::int) > target_date
            AND dt4.id <> t.dt_id
          ),
          target_date
        ) AS hasta
      FROM base b
      JOIN today_type t ON t.employee_id = b.employee_id
    )
    SELECT coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', p.employee_id,
          'legajo', p.legajo,
          'nombre', p.nombre,
          'tarea', p.tarea,
          'linea', p.linea,
          'turno', p.turno,
          'motivo', '',
          'desde', to_char(p.desde, 'DD/MM/YYYY'),
          'hasta', to_char(p.hasta, 'DD/MM/YYYY'),
          'diasCaidos', GREATEST(1, (p.hasta - p.desde + 1))::int,
          'observaciones', COALESCE(p.comentario, '')
        )
        ORDER BY p.nombre
      ),
      '[]'::jsonb
    )
    FROM period p
  );

  -- Detalle de ALTAS del día (date_of_admission = target_date)
  altas_info := (
    WITH base AS (
      SELECT
        e.id,
        e.file AS legajo,
        trim(e.lastname || ' ' || e.firstname) AS nombre,
        cp.name AS company_position,
        h.name AS hierarchical_position
      FROM public.employees e
      LEFT JOIN public.company_positions cp ON cp.id = e.company_position
      LEFT JOIN public.hierarchy h ON h.id = e.hierarchical_position
      WHERE e.company_id = p_company_id
      AND e.date_of_admission = target_date
    ),
    turno_today AS (
      SELECT DISTINCT ON (ed.employee_id)
        ed.employee_id,
        dt.name AS turno
      FROM public.employees_diagram ed
      JOIN public.diagram_type dt ON dt.id = ed.diagram_type
      WHERE make_date(ed.year::int, ed.month::int, ed.day::int) = target_date
      ORDER BY ed.employee_id, dt.id
    )
    SELECT coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', b.id,
          'legajo', b.legajo,
          'nombre', b.nombre,
          'tarea', coalesce(b.company_position,''),
          'linea', coalesce(b.hierarchical_position,''),
          'turno', coalesce(t.turno,''),
          'motivo', 'Alta',
          'desde', to_char(target_date, 'DD/MM/YYYY'),
          'hasta', to_char(target_date, 'DD/MM/YYYY'),
          'diasCaidos', 0,
          'observaciones', ''
        )
        ORDER BY b.nombre
      ),
      '[]'::jsonb
    )
    FROM base b
    LEFT JOIN turno_today t ON t.employee_id = b.id
  );

  -- Detalle de BAJAS del día (termination_date = target_date)
  bajas_info := (
    WITH base AS (
      SELECT
        e.id,
        e.file AS legajo,
        trim(e.lastname || ' ' || e.firstname) AS nombre,
        cp.name AS company_position,
        h.name AS hierarchical_position,
        (e.reason_for_termination)::text AS motivo
      FROM public.employees e
      LEFT JOIN public.company_positions cp ON cp.id = e.company_position
      LEFT JOIN public.hierarchy h ON h.id = e.hierarchical_position
      WHERE e.company_id = p_company_id
      AND e.termination_date = target_date
    )
    SELECT coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', b.id,
          'legajo', b.legajo,
          'nombre', b.nombre,
          'tarea', coalesce(b.company_position,''),
          'linea', coalesce(b.hierarchical_position,''),
          'turno', '',
          'motivo', coalesce(b.motivo,'Baja'),
          'desde', to_char(target_date, 'DD/MM/YYYY'),
          'hasta', to_char(target_date, 'DD/MM/YYYY'),
          'diasCaidos', 0,
          'observaciones', ''
        )
        ORDER BY b.nombre
      ),
      '[]'::jsonb
    )
    FROM base b
  );

  -- Construir el resultado final con el nuevo formato
  result := jsonb_build_object(
    'data', ausentes,
    'detalles', jsonb_build_object(
      'ausentes_info', ausentes,
      'bajas_info', bajas_info,
      'altas_info', altas_info
    )
  );

  IF save_to_table AND p_company_id IS NOT NULL THEN
    INSERT INTO public.daily_indicators (id, company_id, snapshot_date, metrics, source, created_at)
    VALUES (gen_random_uuid(), p_company_id, target_date, result, 'hr_get_current_absent_employees', now())
    ON CONFLICT (company_id, snapshot_date, source)
    DO UPDATE SET metrics = EXCLUDED.metrics, created_at = now();
  END IF;

  RETURN result;
END
$function$;

-- function hr_get_daily_absence_timeseries (origen: supabase/migrations/20251103211302_initial_structure.sql)
CREATE OR REPLACE FUNCTION public.hr_get_daily_absence_timeseries(p_company_id uuid, p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date, save_to_table boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  tz text := 'America/Argentina/Buenos_Aires';
  today date := (now() at time zone tz)::date;
  dfrom date := COALESCE(p_from, date_trunc('month', today)::date);
  dto date := COALESCE(p_to, today);
  result jsonb;
BEGIN
  result := (
    WITH days AS (
      SELECT gs.d::date AS d
      FROM generate_series(dfrom, dto, interval '1 day') AS gs(d)
    ),
    headcounts AS (
      SELECT
        d.d,
        (SELECT count(*) FROM public.employees e
          WHERE e.company_id = p_company_id
            AND e.date_of_admission <= d.d
            AND (e.termination_date IS NULL OR e.termination_date > d.d))::int AS total_dotacion,
        (SELECT count(*) FROM public.employees e
          WHERE e.company_id = p_company_id
            AND e.date_of_admission <= (d.d - 1)
            AND (e.termination_date IS NULL OR e.termination_date > (d.d - 1)))::int AS dotacion_prev,
        (SELECT count(*) FROM public.employees e
          WHERE e.company_id = p_company_id
            AND e.date_of_admission = d.d)::int AS altas,
        (SELECT count(*) FROM public.employees e
          WHERE e.company_id = p_company_id
            AND e.termination_date = d.d)::int AS bajas
      FROM days d
    ),
    absent AS (
      SELECT
        d.d,
        count(*)::int AS total_ausentes
      FROM days d
      JOIN public.employees_diagram ed
        ON make_date(ed.year::int, ed.month::int, ed.day::int) = d.d
      JOIN public.diagram_type dt ON dt.id = ed.diagram_type
      JOIN public.employees e ON e.id = ed.employee_id
      WHERE e.company_id = p_company_id
        AND e.date_of_admission <= d.d
        AND (e.termination_date IS NULL OR e.termination_date > d.d)
        AND dt.work_active = false
        AND NOT (
          lower(dt.name) LIKE 'franco%' OR dt.short_description IN ('F','FN')
          OR lower(dt.name) LIKE 'ausencia dia de vacaciones%'
        )
      GROUP BY d.d
    ),
    vacaciones AS (
      SELECT
        d.d,
        count(DISTINCT ed.employee_id)::int AS vacaciones
      FROM days d
      JOIN public.employees_diagram ed
        ON make_date(ed.year::int, ed.month::int, ed.day::int) = d.d
      JOIN public.diagram_type dt ON dt.id = ed.diagram_type
      JOIN public.employees e ON e.id = ed.employee_id
      WHERE e.company_id = p_company_id
        AND e.date_of_admission <= d.d
        AND (e.termination_date IS NULL OR e.termination_date > d.d)
        AND (lower(dt.name) LIKE 'ausencia dia de vacaciones%' OR dt.short_description = 'AVA')
      GROUP BY d.d
    )
    SELECT coalesce(
      jsonb_agg(
        jsonb_build_object(
          'fecha', to_char(h.d, 'FMDD/FMMM/YYYY'),
          'dotacion', h.dotacion_prev,
          'altas', h.altas,
          'bajas', h.bajas,
          'vacaciones', coalesce(v.vacaciones, 0),
          'totalDotacion', h.total_dotacion,
          'totalAusentes', coalesce(a.total_ausentes, 0),
          'porcentajeAusentismo',
            CASE WHEN h.total_dotacion > 0
                 THEN round((coalesce(a.total_ausentes,0)::numeric * 100.0 / h.total_dotacion)::numeric, 2)
                 ELSE 0 END
        )
        ORDER BY h.d
      ),
      '[]'::jsonb
    )
    FROM headcounts h
    LEFT JOIN absent a ON a.d = h.d
    LEFT JOIN vacaciones v ON v.d = h.d
  );

  IF save_to_table AND p_company_id IS NOT NULL THEN
    WITH days AS (
      SELECT gs.d::date AS d
      FROM generate_series(dfrom, dto, interval '1 day') AS gs(d)
    ),
    headcounts AS (
      SELECT
        d.d,
        (SELECT count(*) FROM public.employees e
          WHERE e.company_id = p_company_id
            AND e.date_of_admission <= d.d
            AND (e.termination_date IS NULL OR e.termination_date > d.d))::int AS total_dotacion,
        (SELECT count(*) FROM public.employees e
          WHERE e.company_id = p_company_id
            AND e.date_of_admission <= (d.d - 1)
            AND (e.termination_date IS NULL OR e.termination_date > (d.d - 1)))::int AS dotacion_prev,
        (SELECT count(*) FROM public.employees e
          WHERE e.company_id = p_company_id
            AND e.date_of_admission = d.d)::int AS altas,
        (SELECT count(*) FROM public.employees e
          WHERE e.company_id = p_company_id
            AND e.termination_date = d.d)::int AS bajas
      FROM days d
    ),
    absent AS (
      SELECT
        d.d,
        count(*)::int AS total_ausentes
      FROM days d
      JOIN public.employees_diagram ed
        ON make_date(ed.year::int, ed.month::int, ed.day::int) = d.d
      JOIN public.diagram_type dt ON dt.id = ed.diagram_type
      JOIN public.employees e ON e.id = ed.employee_id
      WHERE e.company_id = p_company_id
        AND e.date_of_admission <= d.d
        AND (e.termination_date IS NULL OR e.termination_date > d.d)
        AND dt.work_active = false
        AND NOT (
          lower(dt.name) LIKE 'franco%' OR dt.short_description IN ('F','FN')
          OR lower(dt.name) LIKE 'ausencia dia de vacaciones%'
        )
      GROUP BY d.d
    ),
    vacaciones AS (
      SELECT
        d.d,
        count(DISTINCT ed.employee_id)::int AS vacaciones
      FROM days d
      JOIN public.employees_diagram ed
        ON make_date(ed.year::int, ed.month::int, ed.day::int) = d.d
      JOIN public.diagram_type dt ON dt.id = ed.diagram_type
      JOIN public.employees e ON e.id = ed.employee_id
      WHERE e.company_id = p_company_id
        AND e.date_of_admission <= d.d
        AND (e.termination_date IS NULL OR e.termination_date > d.d)
        AND (lower(dt.name) LIKE 'ausencia dia de vacaciones%' OR dt.short_description = 'AVA')
      GROUP BY d.d
    )
    INSERT INTO public.daily_indicators (id, company_id, snapshot_date, metrics, source, created_at)
    SELECT
      gen_random_uuid(),
      p_company_id,
      h.d,
      jsonb_build_object(
        'dotacion', h.dotacion_prev,
        'altas', h.altas,
        'bajas', h.bajas,
        'vacaciones', coalesce(v.vacaciones, 0),
        'totalDotacion', h.total_dotacion,
        'totalAusentes', coalesce(a.total_ausentes, 0),
        'porcentajeAusentismo',
          CASE WHEN h.total_dotacion > 0
               THEN round((coalesce(a.total_ausentes,0)::numeric * 100.0 / h.total_dotacion)::numeric, 2)
               ELSE 0 END
      ),
      'hr_get_daily_absence_timeseries',
      now()
    FROM headcounts h
    LEFT JOIN absent a ON a.d = h.d
    LEFT JOIN vacaciones v ON v.d = h.d
    ON CONFLICT (company_id, snapshot_date, source)
    DO UPDATE SET metrics = EXCLUDED.metrics, created_at = now();
  END IF;

  RETURN result;
END
$function$;

-- function hr_get_department_absence_reasons (origen: supabase/migrations/20251103211302_initial_structure.sql)
CREATE OR REPLACE FUNCTION public.hr_get_department_absence_reasons(p_company_id uuid, p_date date DEFAULT NULL::date, save_to_table boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  tz text := 'America/Argentina/Buenos_Aires';
  target_date date := COALESCE(p_date, (now() at time zone tz)::date);
  result jsonb;
BEGIN
  result := (
    WITH base AS (
      SELECT e.id AS employee_id, COALESCE(cc.name, 'SIN SECTOR') AS sector
      FROM public.employees e
      LEFT JOIN public.cost_center cc ON cc.id = e.cost_center_id
      WHERE e.company_id = p_company_id
        AND e.date_of_admission <= target_date
        AND (e.termination_date IS NULL OR e.termination_date > target_date)
    ),
    raw AS (
      SELECT
        b.sector AS department,
        dt.name AS reason,
        COALESCE(dt.color, '#999999') AS color,
        count(DISTINCT ed.employee_id)::int AS value
      FROM base b
      JOIN public.employees_diagram ed ON ed.employee_id = b.employee_id
      JOIN public.diagram_type dt ON dt.id = ed.diagram_type
      WHERE make_date(ed.year::int, ed.month::int, ed.day::int) = target_date
        AND dt.work_active = false
        AND NOT (
          lower(dt.name) LIKE 'franco%' OR dt.short_description IN ('F','FN')
          OR lower(dt.name) LIKE 'ausencia dia de vacaciones%'
        )
      GROUP BY 1,2,3
    ),
    grouped AS (
      SELECT
        department,
        jsonb_agg(
          jsonb_build_object('name', reason, 'value', value, 'color', color)
          ORDER BY value DESC
        ) AS data
      FROM raw
      GROUP BY department
    )
    SELECT coalesce(
      jsonb_agg(jsonb_build_object('department', department, 'data', data) ORDER BY department),
      '[]'::jsonb
    )
    FROM grouped
  );

  IF save_to_table AND p_company_id IS NOT NULL THEN
    INSERT INTO public.daily_indicators (id, company_id, snapshot_date, metrics, source, created_at)
    VALUES (gen_random_uuid(), p_company_id, target_date, result, 'hr_get_department_absence_reasons', now())
    ON CONFLICT (company_id, snapshot_date, source)
    DO UPDATE SET metrics = EXCLUDED.metrics, created_at = now();
  END IF;

  RETURN result;
END
$function$;

-- function hr_get_department_absence_summary (origen: prisma/migrations/20260812150000_absence_reports_include_diagram_comment/migration.sql)
CREATE OR REPLACE FUNCTION public.hr_get_department_absence_summary(p_company_id uuid, p_date date DEFAULT NULL::date, save_to_table boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  tz text := 'America/Argentina/Buenos_Aires';
  target_date date := COALESCE(p_date, (now() at time zone tz)::date);
  result jsonb;
BEGIN
  result := (
    WITH base AS (
      SELECT
        e.id AS employee_id,
        COALESCE(cc.name, 'SIN SECTOR') AS sector,
        e.file AS legajo,
        trim(e.lastname || ' ' || e.firstname) AS nombre,
        cp.name AS company_position,
        h.name AS hierarchical_position
      FROM public.employees e
      LEFT JOIN public.cost_center cc ON cc.id = e.cost_center_id
      LEFT JOIN public.company_positions cp ON cp.id = e.company_position
      LEFT JOIN public.hierarchy h ON h.id = e.hierarchical_position
      WHERE e.company_id = p_company_id
      AND e.date_of_admission <= target_date
      AND (e.termination_date IS NULL OR e.termination_date > target_date)
    ),
    today_type AS (
      SELECT DISTINCT ON (ed.employee_id)
        ed.employee_id,
        dt.id AS dt_id,
        dt.name AS turno,
        ed.comments AS comentario
      FROM public.employees_diagram ed
      JOIN public.diagram_type dt ON dt.id = ed.diagram_type
      WHERE make_date(ed.year::int, ed.month::int, ed.day::int) = target_date
      AND dt.work_active = false
      AND NOT (
        lower(dt.name) LIKE 'franco%' OR dt.short_description IN ('F','FN')
        OR lower(dt.name) LIKE 'ausencia dia de vacaciones%'
      )
      ORDER BY ed.employee_id, dt.id
    ),
    period AS (
      SELECT
        b.sector,
        b.employee_id,
        b.legajo,
        b.nombre,
        coalesce(b.company_position,'') AS tarea,
        coalesce(b.hierarchical_position,'') AS linea,
        t.turno,
        ''::text AS motivo,
        t.comentario,
        COALESCE(
          (
            SELECT (max(make_date(ed2.year::int, ed2.month::int, ed2.day::int)) + INTERVAL '1 day')::date
            FROM public.employees_diagram ed2
            JOIN public.diagram_type dt2 ON dt2.id = ed2.diagram_type
            WHERE ed2.employee_id = b.employee_id
            AND make_date(ed2.year::int, ed2.month::int, ed2.day::int) < target_date
            AND dt2.id <> t.dt_id
          ),
          (
            SELECT min(make_date(ed3.year::int, ed3.month::int, ed3.day::int))::date
            FROM public.employees_diagram ed3
            WHERE ed3.employee_id = b.employee_id
            AND ed3.diagram_type = t.dt_id
            AND make_date(ed3.year::int, ed3.month::int, ed3.day::int) <= target_date
          ),
          target_date
        ) AS desde,
        COALESCE(
          (
            SELECT (min(make_date(ed4.year::int, ed4.month::int, ed4.day::int)) - INTERVAL '1 day')::date
            FROM public.employees_diagram ed4
            JOIN public.diagram_type dt4 ON dt4.id = ed4.diagram_type
            WHERE ed4.employee_id = b.employee_id
            AND make_date(ed4.year::int, ed4.month::int, ed4.day::int) > target_date
            AND dt4.id <> t.dt_id
          ),
          target_date
        ) AS hasta
      FROM base b
      JOIN today_type t ON t.employee_id = b.employee_id
    ),
    absent_details_grouped AS (
      SELECT
        p.sector,
        jsonb_agg(
          jsonb_build_object(
            'employee_id', p.employee_id,
            'legajo', p.legajo,
            'nombre', p.nombre,
            'tarea', p.tarea,
            'linea', p.linea,
            'turno', p.turno,
            'motivo', p.motivo,
            'desde', to_char(p.desde, 'DD/MM/YYYY'),
            'hasta', to_char(p.hasta, 'DD/MM/YYYY'),
            'observaciones', COALESCE(p.comentario, ''),
            'diasCaidos', GREATEST(1, (p.hasta - p.desde + 1))::int
          )
          ORDER BY p.nombre
        ) AS data
      FROM period p
      GROUP BY p.sector
    ),
    per_sector AS (
      SELECT
        b.sector,
        count(*)::int AS dotacion,
        count(tt.employee_id)::int AS ausentes
      FROM base b
      LEFT JOIN today_type tt ON tt.employee_id = b.employee_id
      GROUP BY b.sector
    )
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'sector', ps.sector,
          'dotacion', ps.dotacion,
          'ausentes', ps.ausentes,
          'porcentaje', CASE
            WHEN ps.dotacion > 0
            THEN round((ps.ausentes::numeric * 100.0 / ps.dotacion), 2)
            ELSE 0
          END,
          'data', COALESCE(adg.data, '[]'::jsonb)
        )
        ORDER BY ps.sector
      ),
      '[]'::jsonb
    )
    FROM per_sector ps
    LEFT JOIN absent_details_grouped adg ON adg.sector = ps.sector
  );

  IF save_to_table AND p_company_id IS NOT NULL THEN
    INSERT INTO public.daily_indicators (id, company_id, snapshot_date, metrics, source, created_at)
    VALUES (gen_random_uuid(), p_company_id, target_date, result, 'hr_get_department_absence_summary', now())
    ON CONFLICT (company_id, snapshot_date, source)
    DO UPDATE SET metrics = EXCLUDED.metrics, created_at = now();
  END IF;

  RETURN result;
END
$function$;

-- function process_massive_diagram_creation_v2 (origen: supabase/migrations/20251103211302_initial_structure.sql)
CREATE OR REPLACE FUNCTION public.process_massive_diagram_creation_v2(p_employee_ids uuid[], p_work_diagram_id uuid, p_active_novelty_id uuid, p_date_from date, p_date_to date, p_conflict_resolution text)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_work_diagram RECORD;
    v_employee_id UUID;
    v_current_date DATE;
    v_day_in_cycle INTEGER;
    v_is_active_day BOOLEAN;
    v_existing_record RECORD;
    v_result JSON;
    v_total_employees INTEGER := 0;
    v_processed_employees INTEGER := 0;
    v_total_days INTEGER := 0;
    v_processed_days INTEGER := 0;
    v_created_records INTEGER := 0;
    v_updated_records INTEGER := 0;
    v_skipped_records INTEGER := 0;
    v_errors TEXT[] := ARRAY[]::TEXT[];
    v_start_time TIMESTAMP := NOW();
    v_end_time TIMESTAMP;
    v_created_data JSON[] := ARRAY[]::JSON[];
    v_updated_data JSON[] := ARRAY[]::JSON[];
    v_novelty_info RECORD;
    v_inactive_novelty_info RECORD;
    v_employee_name TEXT;
    v_previous_novelty RECORD;
BEGIN
    -- Validar parámetros de entrada
    IF p_date_from IS NULL OR p_date_to IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Las fechas de inicio y fin son requeridas'
        );
    END IF;
    
    IF p_date_from > p_date_to THEN
        RETURN json_build_object(
            'success', false,
            'error', 'La fecha de inicio no puede ser mayor que la fecha de fin'
        );
    END IF;
    
    IF p_employee_ids IS NULL OR array_length(p_employee_ids, 1) = 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Debe seleccionar al menos un empleado'
        );
    END IF;
    
    IF p_work_diagram_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Debe seleccionar un diagrama de trabajo'
        );
    END IF;
    
    IF p_active_novelty_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Debe seleccionar una novedad activa'
        );
    END IF;
    
    -- Obtener información del diagrama de trabajo
    SELECT * INTO v_work_diagram
    FROM work_diagram
    WHERE id = p_work_diagram_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Diagrama de trabajo no encontrado o inactivo'
        );
    END IF;
    
    -- Obtener información de la novedad activa
    SELECT name, color INTO v_novelty_info
    FROM diagram_type
    WHERE id = p_active_novelty_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Novedad no encontrada o inactiva'
        );
    END IF;
    
    -- Obtener información de la novedad inactiva
    SELECT name, color INTO v_inactive_novelty_info
    FROM diagram_type
    WHERE id = v_work_diagram.inactive_novelty;
    
    -- Calcular totales para el reporte
    v_total_employees := array_length(p_employee_ids, 1);
    v_total_days := (p_date_to - p_date_from + 1);
    
    -- Procesar cada empleado
    FOREACH v_employee_id IN ARRAY p_employee_ids
    LOOP
        BEGIN
            v_processed_employees := v_processed_employees + 1;
            
            -- Verificar que el empleado existe y obtener su nombre
            SELECT CONCAT(firstname, ' ', lastname) INTO v_employee_name
            FROM employees 
            WHERE id = v_employee_id;
            
            IF NOT FOUND THEN
                v_errors := array_append(v_errors, 'Empleado con ID ' || v_employee_id || ' no encontrado');
                CONTINUE;
            END IF;
            
            -- Procesar cada día en el rango
            v_current_date := p_date_from;
            WHILE v_current_date <= p_date_to LOOP
                v_processed_days := v_processed_days + 1;
                
                -- Calcular día en el ciclo (reiniciando desde p_date_from)
                v_day_in_cycle := ((v_current_date - p_date_from) % (v_work_diagram.active_working_days + v_work_diagram.inactive_working_days)) + 1;
                
                -- Determinar si es día activo
                v_is_active_day := v_day_in_cycle <= v_work_diagram.active_working_days;
                
                -- Verificar si ya existe un registro para esta fecha y empleado
                SELECT * INTO v_existing_record
                FROM employees_diagram
                WHERE employee_id = v_employee_id
                AND day = EXTRACT(DAY FROM v_current_date)
                AND month = EXTRACT(MONTH FROM v_current_date)
                AND year = EXTRACT(YEAR FROM v_current_date);
                
                IF FOUND THEN
                    -- Obtener información de la novedad anterior
                    SELECT dt.name, dt.color INTO v_previous_novelty
                    FROM diagram_type dt
                    WHERE dt.id = v_existing_record.diagram_type;
                    
                    -- Manejar conflicto según la estrategia seleccionada
                    IF p_conflict_resolution = 'skip' THEN
                        v_skipped_records := v_skipped_records + 1;
                    ELSIF p_conflict_resolution = 'update' THEN
                        UPDATE employees_diagram
                        SET 
                            diagram_type = CASE 
                                WHEN v_is_active_day THEN p_active_novelty_id
                                ELSE v_work_diagram.inactive_novelty
                            END,
                            created_at = NOW()
                        WHERE employee_id = v_employee_id
                        AND day = EXTRACT(DAY FROM v_current_date)
                        AND month = EXTRACT(MONTH FROM v_current_date)
                        AND year = EXTRACT(YEAR FROM v_current_date);
                        
                        v_updated_records := v_updated_records + 1;
                        
                        -- Agregar a los datos actualizados con información de novedad anterior
                        v_updated_data := array_append(v_updated_data, json_build_object(
                            'employee_id', v_employee_id,
                            'employee_name', v_employee_name,
                            'date', v_current_date,
                            'day', EXTRACT(DAY FROM v_current_date),
                            'month', EXTRACT(MONTH FROM v_current_date),
                            'year', EXTRACT(YEAR FROM v_current_date),
                            'is_active', v_is_active_day,
                            'novelty_name', CASE 
                                WHEN v_is_active_day THEN v_novelty_info.name 
                                ELSE v_inactive_novelty_info.name 
                            END,
                            'novelty_color', CASE 
                                WHEN v_is_active_day THEN v_novelty_info.color 
                                ELSE v_inactive_novelty_info.color 
                            END,
                            'previous_novelty_name', v_previous_novelty.name,
                            'previous_novelty_color', v_previous_novelty.color
                        ));
                    END IF;
                ELSE
                    -- Crear nuevo registro para días activos e inactivos
                    INSERT INTO employees_diagram (
                        employee_id,
                        diagram_type,
                        day,
                        month,
                        year,
                        created_at
                    ) VALUES (
                        v_employee_id,
                        CASE 
                            WHEN v_is_active_day THEN p_active_novelty_id
                            ELSE v_work_diagram.inactive_novelty
                        END,
                        EXTRACT(DAY FROM v_current_date),
                        EXTRACT(MONTH FROM v_current_date),
                        EXTRACT(YEAR FROM v_current_date),
                        NOW()
                    );
                    
                    v_created_records := v_created_records + 1;
                    
                    -- Agregar a los datos creados
                    v_created_data := array_append(v_created_data, json_build_object(
                        'employee_id', v_employee_id,
                        'employee_name', v_employee_name,
                        'date', v_current_date,
                        'day', EXTRACT(DAY FROM v_current_date),
                        'month', EXTRACT(MONTH FROM v_current_date),
                        'year', EXTRACT(YEAR FROM v_current_date),
                        'is_active', v_is_active_day,
                        'novelty_name', CASE 
                            WHEN v_is_active_day THEN v_novelty_info.name 
                            ELSE v_inactive_novelty_info.name 
                        END,
                        'novelty_color', CASE 
                            WHEN v_is_active_day THEN v_novelty_info.color 
                            ELSE v_inactive_novelty_info.color 
                        END
                    ));
                END IF;
                
                v_current_date := v_current_date + 1;
            END LOOP;
            
        EXCEPTION
            WHEN OTHERS THEN
                v_errors := array_append(v_errors, 'Error procesando empleado ' || v_employee_id || ': ' || SQLERRM);
        END;
    END LOOP;
    
    v_end_time := NOW();
    
    -- Construir respuesta
    v_result := json_build_object(
        'success', true,
        'summary', json_build_object(
            'total_employees', v_total_employees,
            'processed_employees', v_processed_employees,
            'total_days', v_total_days,
            'processed_days', v_processed_days,
            'created_records', v_created_records,
            'updated_records', v_updated_records,
            'skipped_records', v_skipped_records,
            'errors_count', array_length(v_errors, 1),
            'processing_time_seconds', EXTRACT(EPOCH FROM (v_end_time - v_start_time)),
            'start_time', v_start_time,
            'end_time', v_end_time
        ),
        'data', json_build_object(
            'created', v_created_data,
            'updated', v_updated_data
        ),
        'details', json_build_object(
            'date_range', json_build_object(
                'from', p_date_from,
                'to', p_date_to
            ),
            'work_diagram', json_build_object(
                'id', v_work_diagram.id,
                'name', v_work_diagram.name,
                'active_days', v_work_diagram.active_working_days,
                'inactive_days', v_work_diagram.inactive_working_days,
                'cycle_length', v_work_diagram.active_working_days + v_work_diagram.inactive_working_days
            ),
            'active_novelty', json_build_object(
                'id', p_active_novelty_id,
                'name', v_novelty_info.name,
                'color', v_novelty_info.color
            ),
            'inactive_novelty', json_build_object(
                'id', v_work_diagram.inactive_novelty,
                'name', v_inactive_novelty_info.name,
                'color', v_inactive_novelty_info.color
            ),
            'conflict_resolution', p_conflict_resolution,
            'employee_ids', p_employee_ids
        ),
        'errors', v_errors
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Error interno del servidor: ' || SQLERRM,
            'details', json_build_object(
                'processed_employees', v_processed_employees,
                'processed_days', v_processed_days,
                'created_records', v_created_records,
                'updated_records', v_updated_records,
                'skipped_records', v_skipped_records
            )
        );
END;
$function$;

-- function process_massive_novelty_creation (origen: prisma/migrations/20260416180000_add_novelty_massive_rpcs/migration.sql)
CREATE OR REPLACE FUNCTION public.process_massive_novelty_creation(
  p_employee_ids uuid[],
  p_diagram_type_id uuid,
  p_date_from date,
  p_date_to date,
  p_conflict_resolution text
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_employee_id uuid;
  v_current_date date;
  v_existing_record RECORD;
  v_result json;
  v_total_employees integer := 0;
  v_processed_employees integer := 0;
  v_total_days integer := 0;
  v_processed_days integer := 0;
  v_created_records integer := 0;
  v_updated_records integer := 0;
  v_skipped_records integer := 0;
  v_errors text[] := ARRAY[]::text[];
  v_start_time timestamp := NOW();
  v_end_time timestamp;
  v_created_data json[] := ARRAY[]::json[];
  v_updated_data json[] := ARRAY[]::json[];
  v_novelty_info RECORD;
  v_employee_name text;
  v_previous_novelty RECORD;
BEGIN
  -- Validaciones
  IF p_date_from IS NULL OR p_date_to IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Las fechas de inicio y fin son requeridas');
  END IF;

  IF p_date_from > p_date_to THEN
    RETURN json_build_object('success', false, 'error', 'La fecha de inicio no puede ser mayor que la fecha de fin');
  END IF;

  IF p_employee_ids IS NULL OR array_length(p_employee_ids, 1) = 0 THEN
    RETURN json_build_object('success', false, 'error', 'Debe seleccionar al menos un empleado');
  END IF;

  IF p_diagram_type_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Debe seleccionar una novedad');
  END IF;

  -- Info de la novedad
  SELECT id, name, color INTO v_novelty_info
  FROM diagram_type
  WHERE id = p_diagram_type_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Novedad no encontrada o inactiva');
  END IF;

  v_total_employees := array_length(p_employee_ids, 1);
  v_total_days := (p_date_to - p_date_from + 1);

  -- Procesar por empleado
  FOREACH v_employee_id IN ARRAY p_employee_ids
  LOOP
    BEGIN
      v_processed_employees := v_processed_employees + 1;

      SELECT CONCAT(firstname, ' ', lastname) INTO v_employee_name
      FROM employees
      WHERE id = v_employee_id;

      IF NOT FOUND THEN
        v_errors := array_append(v_errors, 'Empleado con ID ' || v_employee_id || ' no encontrado');
        CONTINUE;
      END IF;

      -- Cada día del rango → siempre la misma novedad
      v_current_date := p_date_from;
      WHILE v_current_date <= p_date_to LOOP
        v_processed_days := v_processed_days + 1;

        SELECT * INTO v_existing_record
        FROM employees_diagram
        WHERE employee_id = v_employee_id
          AND day = EXTRACT(DAY FROM v_current_date)
          AND month = EXTRACT(MONTH FROM v_current_date)
          AND year = EXTRACT(YEAR FROM v_current_date);

        IF FOUND THEN
          SELECT dt.name, dt.color INTO v_previous_novelty
          FROM diagram_type dt
          WHERE dt.id = v_existing_record.diagram_type;

          IF p_conflict_resolution = 'skip' THEN
            v_skipped_records := v_skipped_records + 1;
          ELSIF p_conflict_resolution = 'update' THEN
            UPDATE employees_diagram
            SET diagram_type = p_diagram_type_id,
                created_at = NOW()
            WHERE employee_id = v_employee_id
              AND day = EXTRACT(DAY FROM v_current_date)
              AND month = EXTRACT(MONTH FROM v_current_date)
              AND year = EXTRACT(YEAR FROM v_current_date);

            v_updated_records := v_updated_records + 1;

            v_updated_data := array_append(v_updated_data, json_build_object(
              'employee_id', v_employee_id,
              'employee_name', v_employee_name,
              'date', v_current_date,
              'day', EXTRACT(DAY FROM v_current_date),
              'month', EXTRACT(MONTH FROM v_current_date),
              'year', EXTRACT(YEAR FROM v_current_date),
              'is_active', true,
              'novelty_name', v_novelty_info.name,
              'novelty_color', v_novelty_info.color,
              'previous_novelty_name', v_previous_novelty.name,
              'previous_novelty_color', v_previous_novelty.color
            ));
          END IF;
        ELSE
          INSERT INTO employees_diagram (
            employee_id, diagram_type, day, month, year, created_at
          ) VALUES (
            v_employee_id,
            p_diagram_type_id,
            EXTRACT(DAY FROM v_current_date),
            EXTRACT(MONTH FROM v_current_date),
            EXTRACT(YEAR FROM v_current_date),
            NOW()
          );

          v_created_records := v_created_records + 1;

          v_created_data := array_append(v_created_data, json_build_object(
            'employee_id', v_employee_id,
            'employee_name', v_employee_name,
            'date', v_current_date,
            'day', EXTRACT(DAY FROM v_current_date),
            'month', EXTRACT(MONTH FROM v_current_date),
            'year', EXTRACT(YEAR FROM v_current_date),
            'is_active', true,
            'novelty_name', v_novelty_info.name,
            'novelty_color', v_novelty_info.color
          ));
        END IF;

        v_current_date := v_current_date + 1;
      END LOOP;

    EXCEPTION WHEN OTHERS THEN
      v_errors := array_append(v_errors, 'Error procesando empleado ' || v_employee_id || ': ' || SQLERRM);
    END;
  END LOOP;

  v_end_time := NOW();

  v_result := json_build_object(
    'success', true,
    'summary', json_build_object(
      'total_employees', v_total_employees,
      'processed_employees', v_processed_employees,
      'total_days', v_total_days,
      'processed_days', v_processed_days,
      'created_records', v_created_records,
      'updated_records', v_updated_records,
      'skipped_records', v_skipped_records,
      'errors_count', array_length(v_errors, 1),
      'processing_time_seconds', EXTRACT(EPOCH FROM (v_end_time - v_start_time)),
      'start_time', v_start_time,
      'end_time', v_end_time
    ),
    'data', json_build_object(
      'created', v_created_data,
      'updated', v_updated_data
    ),
    'details', json_build_object(
      'date_range', json_build_object('from', p_date_from, 'to', p_date_to),
      'mode', 'novelty',
      'novelty', json_build_object(
        'id', v_novelty_info.id,
        'name', v_novelty_info.name,
        'color', v_novelty_info.color
      ),
      'conflict_resolution', p_conflict_resolution,
      'employee_ids', p_employee_ids
    ),
    'errors', v_errors
  );

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', 'Error interno del servidor: ' || SQLERRM,
    'details', json_build_object(
      'processed_employees', v_processed_employees,
      'processed_days', v_processed_days,
      'created_records', v_created_records,
      'updated_records', v_updated_records,
      'skipped_records', v_skipped_records
    )
  );
END;
$$;

-- ============================================================================
-- TRIGGERS (1)
-- ============================================================================

-- trigger trg_employees_diagram_changes ON employees_diagram (origen: supabase/migrations/20251103211302_initial_structure.sql)
DROP TRIGGER IF EXISTS trg_employees_diagram_changes ON public.employees_diagram;
CREATE TRIGGER trg_employees_diagram_changes AFTER INSERT OR UPDATE ON public.employees_diagram FOR EACH ROW EXECUTE FUNCTION public.handle_employees_diagram_changes();

-- ── prisma/sql/daily-report.sql ──────────────────────────────────────────────────────────────
-- Generado por scripts/sql/extract-sql-objects.ts — editar a mano SOLO en la revisión de Task 4
-- Dominio: daily-report — 16 objeto(s)
-- Revisado a mano en la Task 4 (P1): sin tabla de usuarios de Supabase, actor por app.user_id, + marcar_prepartes_vencidos (job P5).

-- ============================================================================
-- FUNCTIONS (7)
-- ============================================================================

-- function actualizar_estado_daily_reports (origen: supabase/migrations/20260304035040_sinc-2.sql)
CREATE OR REPLACE FUNCTION public.actualizar_estado_daily_reports()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    report_record RECORD;
    row_record RECORD;
    tiene_filas BOOLEAN;
    todas_completas BOOLEAN;
    tiene_recursos BOOLEAN;
BEGIN
    -- Parte 1: Actualizar filas 'sin_recursos_asignados' que ya tienen recursos asignados
    FOR row_record IN
        SELECT dr.id
        FROM dailyreportrows dr
        WHERE dr.status = 'sin_recursos_asignados'
    LOOP
        SELECT EXISTS (
            SELECT 1 FROM dailyreportemployeerelations
            WHERE daily_report_row_id = row_record.id
            UNION
            SELECT 1 FROM dailyreportequipmentrelations
            WHERE daily_report_row_id = row_record.id
        ) INTO tiene_recursos;

        IF tiene_recursos THEN
            UPDATE dailyreportrows
            SET status = 'pendiente',
                updated_at = (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')
            WHERE id = row_record.id;
        END IF;
    END LOOP;

    -- Parte 2: Cierre de reportes con fecha pasada
    FOR report_record IN
        SELECT id
        FROM dailyreport
        WHERE date < ( (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date )
        AND status IN ('abierto', 'cerrado_incompleto')
    LOOP
        SELECT EXISTS (SELECT 1 FROM dailyreportrows WHERE daily_report_id = report_record.id) INTO tiene_filas;

        IF NOT tiene_filas THEN
            UPDATE dailyreport
            SET status = 'cerrado_completo',
                updated_at = (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')
            WHERE id = report_record.id;
        ELSE
            -- Estados completos: ejecutado, reprogramado, cancelado, en_certificacion
            -- NO se verifica document_path (el remito no es requisito para cierre)
            SELECT NOT EXISTS (
                SELECT 1
                FROM dailyreportrows
                WHERE daily_report_id = report_record.id
                AND status NOT IN ('ejecutado', 'reprogramado', 'cancelado', 'en_certificacion')
            ) INTO todas_completas;

            IF todas_completas THEN
                UPDATE dailyreport
                SET status = 'cerrado_completo',
                    updated_at = (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')
                WHERE id = report_record.id;
            ELSE
                UPDATE dailyreport
                SET status = 'cerrado_incompleto',
                    updated_at = (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')
                WHERE id = report_record.id;
            END IF;
        END IF;
    END LOOP;
END;
$function$;

-- function after_dailyreportrows_update_optimized (origen: supabase/migrations/20260304035040_sinc-2.sql)
CREATE OR REPLACE FUNCTION public.after_dailyreportrows_update_optimized()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    affected_reports UUID[];
    v_report_id UUID;
BEGIN
    -- Recopilar todos los report_ids únicos afectados en esta transacción
    SELECT ARRAY_AGG(DISTINCT daily_report_id)
    INTO affected_reports
    FROM (
        SELECT NEW.daily_report_id AS daily_report_id
        UNION
        SELECT OLD.daily_report_id AS daily_report_id WHERE TG_OP = 'UPDATE'
    ) reports
    WHERE daily_report_id IS NOT NULL;

    IF affected_reports IS NOT NULL AND array_length(affected_reports, 1) > 0 THEN
        FOREACH v_report_id IN ARRAY affected_reports
        LOOP
            -- Actualizar filas 'sin_recursos_asignados' que ahora tienen los recursos requeridos
            -- Respeta los flags needs_personnel y needs_equipment de service_items
            UPDATE dailyreportrows dr
            SET status = 'pendiente',
                updated_at = (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')
            FROM service_items si
            WHERE dr.item_id = si.id
              AND dr.status = 'sin_recursos_asignados'
              AND dr.daily_report_id = v_report_id
              AND (
                (NOT COALESCE(si.needs_personnel, true) OR EXISTS (
                  SELECT 1 FROM dailyreportemployeerelations WHERE daily_report_row_id = dr.id
                ))
                AND
                (NOT COALESCE(si.needs_equipment, true) OR EXISTS (
                  SELECT 1 FROM dailyreportequipmentrelations WHERE daily_report_row_id = dr.id
                ))
              );

            -- NOTA: La lógica de cierre de partes fue removida
            -- El cierre ahora es responsabilidad exclusiva del cronjob
            -- que ejecuta actualizar_estado_daily_reports() a las 00:00 Argentina
        END LOOP;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$function$;

-- function get_daily_report_deviations (origen: prisma/migrations/20260915190000_exclude_other_equipment_from_deviations/migration.sql)
CREATE OR REPLACE FUNCTION public.get_daily_report_deviations(p_daily_report_id uuid, p_report_date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_day INT;
  v_month INT;
  v_year INT;
  v_rows_with_deviations JSONB;
  v_summary JSONB;
  v_total_employee_deviations INT := 0;
  v_total_equipment_deviations INT := 0;
  v_total_duplicated_employees INT := 0;
  v_total_duplicated_equipment INT := 0;
BEGIN
  v_day   := EXTRACT(DAY   FROM p_report_date)::INT;
  v_month := EXTRACT(MONTH FROM p_report_date)::INT;
  v_year  := EXTRACT(YEAR  FROM p_report_date)::INT;

  WITH employee_devs AS (
    SELECT
      der.daily_report_row_id AS row_id,
      der.employee_id,
      COALESCE(e.firstname || ' ' || e.lastname, '—') AS employee_name,
      COALESCE(e.cuil, '—') AS employee_cuil,
      der.role::text AS role,
      dr.customer_id,
      (COUNT(*) OVER (PARTITION BY der.employee_id)) > 1 AS is_duplicated,
      NOT EXISTS (
        SELECT 1 FROM contractor_employee ce
        WHERE ce.employee_id = der.employee_id
          AND ce.contractor_id = dr.customer_id
      ) AS is_unassigned_to_client,
      ed.id IS NULL AS has_no_diagram,
      CASE
        WHEN ed.id IS NOT NULL THEN COALESCE(dt.work_active, true) = false
        ELSE false
      END AS is_non_work_day,
      dt.name AS diagram_type_name
    FROM dailyreportemployeerelations der
    INNER JOIN dailyreportrows dr ON dr.id = der.daily_report_row_id
    LEFT JOIN employees e ON e.id = der.employee_id
    LEFT JOIN employees_diagram ed
      ON ed.employee_id = der.employee_id
      AND ed.day = v_day AND ed.month = v_month AND ed.year = v_year
      AND (ed.is_active = true OR ed.is_active IS NULL)
    LEFT JOIN diagram_type dt ON dt.id = ed.diagram_type
    WHERE dr.daily_report_id = p_daily_report_id
  ),
  equipment_devs AS (
    SELECT
      deq.daily_report_row_id AS row_id,
      -- Id efectivo de la relacion polimorfica: vehiculo XOR otro equipo.
      COALESCE(deq.equipment_id, deq.other_equipment_id) AS equipment_id,
      deq.other_equipment_id IS NOT NULL AS is_other_equipment,
      -- Los otros equipos no tienen patente; se los identifica por serie/interno.
      COALESCE(v.domain, '—') AS equipment_domain,
      COALESCE(v.intern_number, oe.intern_number, '—') AS equipment_intern_number,
      COALESCE(v.domain, oe.serial_number, oe.intern_number, '—') AS equipment_label,
      -- Varios tipos vienen cargados con espacios al principio (" Contenedor")
      NULLIF(TRIM(t.name), '') AS equipment_type,
      COALESCE(v.condition::text, oe.condition::text) AS condition,
      dr.customer_id,
      (COUNT(*) OVER (PARTITION BY COALESCE(deq.equipment_id, deq.other_equipment_id))) > 1 AS is_duplicated,
      -- Cada tipo de equipo tiene su propia pivote de afectacion a cliente.
      CASE
        WHEN deq.other_equipment_id IS NOT NULL THEN NOT EXISTS (
          SELECT 1 FROM contractor_other_equipment coe
          WHERE coe.equipment_id = deq.other_equipment_id
            AND coe.contractor_id = dr.customer_id
        )
        ELSE NOT EXISTS (
          SELECT 1 FROM contractor_equipment ce
          WHERE ce.equipment_id = deq.equipment_id
            AND ce.contractor_id = dr.customer_id
        )
      END AS is_unassigned_to_client
    FROM dailyreportequipmentrelations deq
    INNER JOIN dailyreportrows dr ON dr.id = deq.daily_report_row_id
    LEFT JOIN vehicles v ON v.id = deq.equipment_id
    LEFT JOIN other_equipment oe ON oe.id = deq.other_equipment_id
    LEFT JOIN type t ON t.id = oe.type_id
    WHERE dr.daily_report_id = p_daily_report_id
      -- Ticket 698: otros equipos excluidos temporalmente de los desvios.
      AND deq.other_equipment_id IS NULL
  ),
  emp_by_row AS (
    SELECT
      row_id,
      jsonb_agg(
        jsonb_build_object(
          'employee_id', employee_id,
          'employee_name', employee_name,
          'employee_cuil', employee_cuil,
          'role', COALESCE(role, 'sin_rol'),
          'is_duplicated', is_duplicated,
          'is_unassigned_to_client', is_unassigned_to_client,
          'has_no_diagram', has_no_diagram,
          'is_non_work_day', is_non_work_day,
          'diagram_type_name', diagram_type_name
        )
      ) AS employee_deviations
    FROM employee_devs
    WHERE is_duplicated OR is_unassigned_to_client OR has_no_diagram OR is_non_work_day
    GROUP BY row_id
  ),
  equip_by_row AS (
    SELECT
      row_id,
      jsonb_agg(
        jsonb_build_object(
          'equipment_id', equipment_id,
          'equipment_domain', equipment_domain,
          'equipment_intern_number', equipment_intern_number,
          'equipment_label', equipment_label,
          'equipment_type', equipment_type,
          'is_other_equipment', is_other_equipment,
          'condition', COALESCE(condition, 'desconocido'),
          'is_duplicated', is_duplicated,
          'is_unassigned_to_client', is_unassigned_to_client
        )
      ) AS equipment_deviations
    FROM equipment_devs
    WHERE is_duplicated OR is_unassigned_to_client OR (condition IS NOT NULL AND condition <> 'operativo')
    GROUP BY row_id
  ),
  -- Customer equipment per row
  cust_equip_by_row AS (
    SELECT
      dcer.daily_report_row_id AS row_id,
      jsonb_agg(
        jsonb_build_object(
          'name', COALESCE(ec.name, '—'),
          'type', COALESCE(ec.type::text, '—')
        )
      ) AS customer_equipment
    FROM dailyreport_customer_equipment_relations dcer
    LEFT JOIN equipos_clientes ec ON ec.id = dcer.customer_equipment_id
    INNER JOIN dailyreportrows dr ON dr.id = dcer.daily_report_row_id
    WHERE dr.daily_report_id = p_daily_report_id
    GROUP BY dcer.daily_report_row_id
  ),
  rows_data AS (
    SELECT
      dr.id AS row_id,
      dr.customer_id,
      c.name AS customer_name,
      cs.service_name AS service_name,
      si.item_name AS item_name,
      dr.start_time,
      dr.end_time,
      dr.working_day,
      dr.type_service::text AS type_service,
      dr.status::text AS status,
      dr.description,
      sec.name AS sector_name,
      ac.descripcion_corta AS area_name,
      COALESCE(ebr.employee_deviations, '[]'::jsonb) AS employee_deviations,
      COALESCE(eqr.equipment_deviations, '[]'::jsonb) AS equipment_deviations,
      COALESCE(cer.customer_equipment, '[]'::jsonb) AS customer_equipment
    FROM dailyreportrows dr
    LEFT JOIN customers c ON c.id = dr.customer_id
    LEFT JOIN customer_services cs ON cs.id = dr.service_id
    LEFT JOIN service_items si ON si.id = dr.item_id
    LEFT JOIN service_sectors ss ON ss.id = dr.sector_service_id
    LEFT JOIN sectors sec ON sec.id = ss.sector_id
    LEFT JOIN service_areas sa ON sa.id = dr.areas_service_id
    LEFT JOIN areas_cliente ac ON ac.id = sa.area_id
    LEFT JOIN emp_by_row ebr ON ebr.row_id = dr.id
    LEFT JOIN equip_by_row eqr ON eqr.row_id = dr.id
    LEFT JOIN cust_equip_by_row cer ON cer.row_id = dr.id
    WHERE dr.daily_report_id = p_daily_report_id
      AND (ebr.row_id IS NOT NULL OR eqr.row_id IS NOT NULL)
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'row_id', rd.row_id,
      'customer_id', rd.customer_id,
      'customer_name', COALESCE(rd.customer_name, '—'),
      'service_name', COALESCE(rd.service_name, '—'),
      'item_name', COALESCE(rd.item_name, '—'),
      'start_time', rd.start_time,
      'end_time', rd.end_time,
      'working_day', rd.working_day,
      'type_service', rd.type_service,
      'status', rd.status,
      'description', rd.description,
      'sector_name', rd.sector_name,
      'area_name', rd.area_name,
      'customer_equipment', rd.customer_equipment,
      'employee_deviations', rd.employee_deviations,
      'equipment_deviations', rd.equipment_deviations
    )
    ORDER BY rd.customer_name, rd.service_name
  ), '[]'::jsonb)
  INTO v_rows_with_deviations
  FROM rows_data rd;

  -- CONTADORES
  SELECT COUNT(*) INTO v_total_employee_deviations
  FROM (
    SELECT der.employee_id
    FROM dailyreportemployeerelations der
    INNER JOIN dailyreportrows dr ON dr.id = der.daily_report_row_id
    LEFT JOIN employees_diagram ed
      ON ed.employee_id = der.employee_id
      AND ed.day = v_day AND ed.month = v_month AND ed.year = v_year
      AND (ed.is_active = true OR ed.is_active IS NULL)
    LEFT JOIN diagram_type dt ON dt.id = ed.diagram_type
    WHERE dr.daily_report_id = p_daily_report_id
      AND (
        NOT EXISTS (
          SELECT 1 FROM contractor_employee ce
          WHERE ce.employee_id = der.employee_id AND ce.contractor_id = dr.customer_id
        )
        OR ed.id IS NULL
        OR (ed.id IS NOT NULL AND COALESCE(dt.work_active, true) = false)
      )
  ) sub;

  SELECT COUNT(*) INTO v_total_equipment_deviations
  FROM (
    SELECT deq.id
    FROM dailyreportequipmentrelations deq
    INNER JOIN dailyreportrows dr ON dr.id = deq.daily_report_row_id
    LEFT JOIN vehicles v ON v.id = deq.equipment_id
    LEFT JOIN other_equipment oe ON oe.id = deq.other_equipment_id
    WHERE dr.daily_report_id = p_daily_report_id
      -- Ticket 698: otros equipos excluidos temporalmente de los desvios.
      AND deq.other_equipment_id IS NULL
      AND (
        CASE
          WHEN deq.other_equipment_id IS NOT NULL THEN NOT EXISTS (
            SELECT 1 FROM contractor_other_equipment coe
            WHERE coe.equipment_id = deq.other_equipment_id AND coe.contractor_id = dr.customer_id
          )
          ELSE NOT EXISTS (
            SELECT 1 FROM contractor_equipment ce
            WHERE ce.equipment_id = deq.equipment_id AND ce.contractor_id = dr.customer_id
          )
        END
        OR (
          COALESCE(v.condition::text, oe.condition::text) IS NOT NULL
          AND COALESCE(v.condition::text, oe.condition::text) <> 'operativo'
        )
      )
  ) sub;

  SELECT COUNT(DISTINCT employee_id) INTO v_total_duplicated_employees
  FROM (
    SELECT der.employee_id
    FROM dailyreportemployeerelations der
    INNER JOIN dailyreportrows dr ON dr.id = der.daily_report_row_id
    WHERE dr.daily_report_id = p_daily_report_id
    GROUP BY der.employee_id
    HAVING COUNT(*) > 1
  ) sub;

  SELECT COUNT(DISTINCT equipment_id) INTO v_total_duplicated_equipment
  FROM (
    SELECT COALESCE(deq.equipment_id, deq.other_equipment_id) AS equipment_id
    FROM dailyreportequipmentrelations deq
    INNER JOIN dailyreportrows dr ON dr.id = deq.daily_report_row_id
    WHERE dr.daily_report_id = p_daily_report_id
      -- Ticket 698: otros equipos excluidos temporalmente de los desvios.
      AND deq.other_equipment_id IS NULL
    GROUP BY COALESCE(deq.equipment_id, deq.other_equipment_id)
    HAVING COUNT(*) > 1
  ) sub;

  v_summary := jsonb_build_object(
    'total_employee_deviations', v_total_employee_deviations,
    'total_equipment_deviations', v_total_equipment_deviations,
    'total_duplicated_employees', v_total_duplicated_employees,
    'total_duplicated_equipment', v_total_duplicated_equipment,
    'total_rows_with_deviations', jsonb_array_length(v_rows_with_deviations)
  );

  RETURN jsonb_build_object(
    'rows_with_deviations', v_rows_with_deviations,
    'summary', v_summary
  );
END;
$function$;

-- function get_daily_report_deviations_indicator (origen: prisma/migrations/20260915190000_exclude_other_equipment_from_deviations/migration.sql)
CREATE OR REPLACE FUNCTION public.get_daily_report_deviations_indicator(
  p_company_id uuid DEFAULT NULL::uuid,
  p_date date DEFAULT NULL::date,
  save_to_table boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
  v_tz text := 'America/Argentina/Buenos_Aires';
  v_date date := COALESCE(p_date, (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date);
  v_is_live boolean;
  v_result jsonb;
BEGIN
  IF p_company_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Solo el dia corriente se puede medir con fidelidad: es el unico en que las
  -- tablas maestras (afectaciones, diagramas, condicion del equipo) todavia
  -- estan como las vio el reporte nocturno. Estrictamente igual, no >=: los
  -- partes futuros se crean vacios por adelantado y marcarlos como medidos
  -- afirmaria "cero desvios" sobre dias que todavia no ocurrieron.
  v_is_live := v_date = (NOW() AT TIME ZONE v_tz)::date;

  WITH reports AS (
    SELECT dr.id
    FROM dailyreport dr
    WHERE dr.company_id = p_company_id
      AND dr.date = v_date
      AND dr.is_active = true
  ),
  emp AS (
    SELECT
      drr.id AS row_id,
      drr.customer_id,
      der.employee_id,
      (COUNT(*) OVER (PARTITION BY drr.daily_report_id, der.employee_id)) > 1 AS is_duplicated,
      NOT EXISTS (
        SELECT 1 FROM contractor_employee ce
        WHERE ce.employee_id = der.employee_id
          AND ce.contractor_id = drr.customer_id
      ) AS is_unassigned,
      ed.id IS NULL AS has_no_diagram,
      CASE WHEN ed.id IS NOT NULL THEN COALESCE(dt.work_active, true) = false ELSE false END AS is_non_work_day
    FROM dailyreportemployeerelations der
    INNER JOIN dailyreportrows drr ON drr.id = der.daily_report_row_id
    INNER JOIN reports r ON r.id = drr.daily_report_id
    LEFT JOIN employees_diagram ed
      ON ed.employee_id = der.employee_id
      AND ed.day = EXTRACT(DAY FROM v_date)::int
      AND ed.month = EXTRACT(MONTH FROM v_date)::int
      AND ed.year = EXTRACT(YEAR FROM v_date)::int
      AND (ed.is_active = true OR ed.is_active IS NULL)
    LEFT JOIN diagram_type dt ON dt.id = ed.diagram_type
  ),
  eq AS (
    SELECT
      drr.id AS row_id,
      drr.customer_id,
      -- Id efectivo de la relacion polimorfica: vehiculo XOR otro equipo.
      COALESCE(deq.equipment_id, deq.other_equipment_id) AS equipment_id,
      (COUNT(*) OVER (PARTITION BY drr.daily_report_id, COALESCE(deq.equipment_id, deq.other_equipment_id))) > 1 AS is_duplicated,
      CASE
        WHEN deq.other_equipment_id IS NOT NULL THEN NOT EXISTS (
          SELECT 1 FROM contractor_other_equipment coe
          WHERE coe.equipment_id = deq.other_equipment_id
            AND coe.contractor_id = drr.customer_id
        )
        ELSE NOT EXISTS (
          SELECT 1 FROM contractor_equipment ce
          WHERE ce.equipment_id = deq.equipment_id
            AND ce.contractor_id = drr.customer_id
        )
      END AS is_unassigned,
      (
        COALESCE(v.condition::text, oe.condition::text) IS NOT NULL
        AND COALESCE(v.condition::text, oe.condition::text) <> 'operativo'
      ) AS is_non_operative
    FROM dailyreportequipmentrelations deq
    INNER JOIN dailyreportrows drr ON drr.id = deq.daily_report_row_id
    INNER JOIN reports r ON r.id = drr.daily_report_id
    LEFT JOIN vehicles v ON v.id = deq.equipment_id
    LEFT JOIN other_equipment oe ON oe.id = deq.other_equipment_id
    -- Ticket 698: otros equipos excluidos temporalmente de los desvios.
    WHERE deq.other_equipment_id IS NULL
  ),
  bad_rows AS (
    SELECT row_id, customer_id FROM emp
    WHERE is_duplicated OR is_unassigned OR has_no_diagram OR is_non_work_day
    UNION
    SELECT row_id, customer_id FROM eq
    WHERE is_duplicated OR is_unassigned OR is_non_operative
  ),
  -- Los duplicados no dependen de ninguna tabla maestra, asi que se agregan
  -- aparte: son la unica parte que sobrevive al paso del tiempo.
  dup_rows AS (
    SELECT row_id, customer_id FROM emp WHERE is_duplicated
    UNION
    SELECT row_id, customer_id FROM eq WHERE is_duplicated
  ),
  emp_agg AS (
    SELECT
      COUNT(*) FILTER (WHERE is_unassigned OR has_no_diagram OR is_non_work_day)::int AS employee_deviations,
      COUNT(DISTINCT employee_id) FILTER (WHERE is_duplicated)::int AS duplicated_employees,
      COUNT(*) FILTER (WHERE is_unassigned)::int AS b_unassigned,
      COUNT(*) FILTER (WHERE has_no_diagram)::int AS b_no_diagram,
      COUNT(*) FILTER (WHERE is_non_work_day)::int AS b_non_work_day,
      COUNT(*) FILTER (WHERE is_duplicated)::int AS b_duplicated
    FROM emp
  ),
  eq_agg AS (
    SELECT
      COUNT(*) FILTER (WHERE is_unassigned OR is_non_operative)::int AS equipment_deviations,
      COUNT(DISTINCT equipment_id) FILTER (WHERE is_duplicated)::int AS duplicated_equipment,
      COUNT(*) FILTER (WHERE is_unassigned)::int AS b_unassigned,
      COUNT(*) FILTER (WHERE is_non_operative)::int AS b_non_operative,
      COUNT(*) FILTER (WHERE is_duplicated)::int AS b_duplicated
    FROM eq
  ),
  rows_agg AS (
    SELECT
      (SELECT COUNT(*) FROM bad_rows)::int AS rows_with_deviations,
      (SELECT COUNT(*) FROM dup_rows)::int AS rows_with_duplicates
  ),
  per_customer AS (
    SELECT
      c.id AS customer_id,
      COALESCE(cu.name, 'Sin cliente') AS customer_name,
      COALESCE((SELECT COUNT(*) FROM bad_rows br
                WHERE br.customer_id IS NOT DISTINCT FROM c.id), 0)::int AS rows_with_deviations,
      COALESCE((SELECT COUNT(*) FROM dup_rows dr2
                WHERE dr2.customer_id IS NOT DISTINCT FROM c.id), 0)::int AS rows_with_duplicates,
      COALESCE((SELECT COUNT(*) FROM emp e
                WHERE e.customer_id IS NOT DISTINCT FROM c.id
                  AND (e.is_unassigned OR e.has_no_diagram OR e.is_non_work_day)), 0)::int AS employee_deviations,
      COALESCE((SELECT COUNT(*) FROM eq q
                WHERE q.customer_id IS NOT DISTINCT FROM c.id
                  AND (q.is_unassigned OR q.is_non_operative)), 0)::int AS equipment_deviations,
      COALESCE((SELECT COUNT(DISTINCT e.employee_id) FROM emp e
                WHERE e.customer_id IS NOT DISTINCT FROM c.id
                  AND e.is_duplicated), 0)::int AS duplicated_employees,
      COALESCE((SELECT COUNT(DISTINCT q.equipment_id) FROM eq q
                WHERE q.customer_id IS NOT DISTINCT FROM c.id
                  AND q.is_duplicated), 0)::int AS duplicated_equipment
    FROM (SELECT DISTINCT customer_id AS id FROM bad_rows) c
    LEFT JOIN customers cu ON cu.id = c.id
  )
  SELECT jsonb_build_object(
    'totals', jsonb_build_object(
      -- NULL = no medible para esa fecha. Distinto de 0, que significa "no hubo".
      'rows_with_deviations', CASE WHEN v_is_live THEN ra.rows_with_deviations ELSE NULL END,
      'employee_deviations', CASE WHEN v_is_live THEN ea.employee_deviations ELSE NULL END,
      'equipment_deviations', CASE WHEN v_is_live THEN qa.equipment_deviations ELSE NULL END,
      'duplicated_employees', ea.duplicated_employees,
      'duplicated_equipment', qa.duplicated_equipment
    ),
    'employee_breakdown', CASE WHEN v_is_live THEN jsonb_build_object(
      'unassigned_to_client', ea.b_unassigned,
      'no_diagram', ea.b_no_diagram,
      'non_work_day', ea.b_non_work_day,
      'duplicated', ea.b_duplicated
    ) ELSE jsonb_build_object('duplicated', ea.b_duplicated) END,
    'equipment_breakdown', CASE WHEN v_is_live THEN jsonb_build_object(
      'unassigned_to_client', qa.b_unassigned,
      'non_operative_condition', qa.b_non_operative,
      'duplicated', qa.b_duplicated
    ) ELSE jsonb_build_object('duplicated', qa.b_duplicated) END,
    'by_customer', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'customer_id', pc.customer_id,
        'customer_name', pc.customer_name,
        'rows_with_deviations', CASE WHEN v_is_live THEN pc.rows_with_deviations ELSE NULL END,
        'employee_deviations', CASE WHEN v_is_live THEN pc.employee_deviations ELSE NULL END,
        'equipment_deviations', CASE WHEN v_is_live THEN pc.equipment_deviations ELSE NULL END,
        'duplicated_employees', pc.duplicated_employees,
        'duplicated_equipment', pc.duplicated_equipment
      ) ORDER BY pc.customer_name)
      FROM per_customer pc
      -- En backfill solo interesan los clientes que aportan duplicados.
      WHERE v_is_live OR pc.duplicated_employees > 0 OR pc.duplicated_equipment > 0
    ), '[]'::jsonb),
    'meta', jsonb_build_object(
      'report_date', v_date,
      -- true = los cinco indicadores son fieles al reporte de esa noche.
      -- false = solo los duplicados; el resto viaja en NULL.
      'captured_live', v_is_live
    )
  )
  INTO v_result
  FROM rows_agg ra
  CROSS JOIN emp_agg ea
  CROSS JOIN eq_agg qa;

  IF save_to_table AND p_company_id IS NOT NULL THEN
    INSERT INTO public.daily_indicators (id, company_id, snapshot_date, metrics, source, created_at)
    VALUES (
      gen_random_uuid(),
      p_company_id,
      v_date,
      v_result,
      'get_daily_report_deviations_indicator'::public.indicator_function,
      now()
    )
    ON CONFLICT (company_id, snapshot_date, source)
    DO UPDATE SET metrics = EXCLUDED.metrics, created_at = now()
    -- Un backfill nunca degrada un snapshot que ya se tomo en vivo.
    WHERE COALESCE(daily_indicators.metrics->'meta'->>'captured_live', 'false') <> 'true'
       OR COALESCE(EXCLUDED.metrics->'meta'->>'captured_live', 'false') = 'true';
  END IF;

  RETURN v_result;
END;
$function$;

-- function get_dailyreportrow_history (origen: supabase/migrations/20260202113926_fixing-maintenance-flow.sql)
CREATE OR REPLACE FUNCTION public.get_dailyreportrow_history(p_row_id uuid)
 RETURNS TABLE(id uuid, action_type text, changed_fields jsonb, changed_data jsonb, changed_by jsonb, created_at timestamp with time zone, related_table text, related_id uuid, metadata jsonb, reassignment_reason text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        h.id,
        h.action_type,
        h.changed_fields,
        h.changed_data,
        -- Task 4: el usuario sale de profile (credential_id = uid de Supabase), no de la tabla de usuarios de Supabase.
        -- Se conserva la forma del JSON que lee src/ (id, email, raw_user_meta_data.full_name).
        CASE WHEN u.credential_id IS NULL THEN NULL ELSE jsonb_build_object(
            'id', u.credential_id,
            'email', u.email,
            'raw_user_meta_data', jsonb_build_object('full_name', u.fullname)
        ) END as changed_by,
        h.created_at,
        h.related_table,
        h.related_id,
        h.metadata,
        h.reassignment_reason
    FROM 
        dailyreportrows_history h
    LEFT JOIN 
        profile u ON h.changed_by = u.credential_id
    WHERE 
        h.daily_report_row_id = p_row_id
    ORDER BY 
        h.created_at DESC;
END;
$function$;

-- function log_dailyreport_changes (origen: supabase/migrations/20260202113926_fixing-maintenance-flow.sql)
CREATE OR REPLACE FUNCTION public.log_dailyreport_changes()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$DECLARE
    user_id UUID;
    changed_fields JSONB;
    readable_data JSONB;
    row_exists BOOLEAN;
    v_reassignment_reason TEXT; -- Variable para capturar el motivo de reasignación
BEGIN
    -- Intentar obtener el motivo de reasignación (si existe)
    BEGIN
        v_reassignment_reason := current_setting('myapp.reassignment_reason', true);
        -- Agregar log para depuración
        RAISE NOTICE 'Valor de reassignment_reason obtenido: %', v_reassignment_reason;
    EXCEPTION WHEN OTHERS THEN
        v_reassignment_reason := NULL;
        RAISE NOTICE 'Error al obtener reassignment_reason, establecido a NULL';
    END;

    -- Actor de la transaccion (app.user_id via withActor); NULL si no hay usuario
    user_id := public.app_current_user_id();
    
    IF TG_OP = 'UPDATE' THEN
        -- Verify the row exists before proceeding
        SELECT EXISTS(SELECT 1 FROM dailyreportrows WHERE id = NEW.id) INTO row_exists;
        
        IF NOT row_exists THEN
            -- Skip logging if row doesn't exist
            RAISE NOTICE 'Fila no existe, omitiendo';
            RETURN NEW;
        END IF;
    
        changed_fields := '{}'::JSONB;
        
        IF NEW.customer_id IS DISTINCT FROM OLD.customer_id THEN
            changed_fields := jsonb_set(changed_fields, '{customer_id}', 
                jsonb_build_object('old', OLD.customer_id, 'new', NEW.customer_id));
        END IF;
        
        IF NEW.service_id IS DISTINCT FROM OLD.service_id THEN
            changed_fields := jsonb_set(changed_fields, '{service_id}', 
                jsonb_build_object('old', OLD.service_id, 'new', NEW.service_id));
        END IF;

        IF NEW.completed_night IS DISTINCT FROM OLD.completed_night THEN
            changed_fields := jsonb_set(changed_fields, '{completed_night}', 
                jsonb_build_object('old', OLD.completed_night, 'new', NEW.completed_night));
        END IF;

        IF NEW.completed_day IS DISTINCT FROM OLD.completed_day THEN
            changed_fields := jsonb_set(changed_fields, '{completed_day}', 
                jsonb_build_object('old', OLD.completed_day, 'new', NEW.completed_day));
        END IF;
        
IF NEW.item_id IS DISTINCT FROM OLD.item_id THEN
    changed_fields := jsonb_set(changed_fields, '{item_id}', 
        jsonb_build_object(
            'old',(SELECT item_name FROM service_items WHERE id = OLD.item_id),
            'new', (SELECT item_name FROM service_items WHERE id = NEW.item_id)
        ));
END IF;
        
        IF NEW.working_day IS DISTINCT FROM OLD.working_day THEN
            changed_fields := jsonb_set(changed_fields, '{working_day}', 
                jsonb_build_object('old', OLD.working_day, 'new', NEW.working_day));
        END IF;
        
        IF NEW.start_time IS DISTINCT FROM OLD.start_time THEN
            changed_fields := jsonb_set(changed_fields, '{start_time}', 
                jsonb_build_object('old', OLD.start_time::TEXT, 'new', NEW.start_time::TEXT));
        END IF;
        
        IF NEW.end_time IS DISTINCT FROM OLD.end_time THEN
            changed_fields := jsonb_set(changed_fields, '{end_time}', 
                jsonb_build_object('old', OLD.end_time::TEXT, 'new', NEW.end_time::TEXT));
        END IF;
        
        IF NEW.description IS DISTINCT FROM OLD.description THEN
            changed_fields := jsonb_set(changed_fields, '{description}', 
                jsonb_build_object('old', OLD.description, 'new', NEW.description));
        END IF;
        
        IF NEW.status IS DISTINCT FROM OLD.status THEN
            changed_fields := jsonb_set(changed_fields, '{status}', 
                jsonb_build_object('old', OLD.status::TEXT, 'new', NEW.status::TEXT));
        END IF;

        -- Eliminados los bloques que comparan employee_id y equipment_id porque no existen en esta tabla
        
        IF NEW.sector_service_id IS DISTINCT FROM OLD.sector_service_id THEN
            changed_fields := jsonb_set(changed_fields, '{sector_service_id}', 
                jsonb_build_object('old', OLD.sector_service_id, 'new', NEW.sector_service_id));
        END IF;
        
        IF NEW.areas_service_id IS DISTINCT FROM OLD.areas_service_id THEN
            changed_fields := jsonb_set(changed_fields, '{areas_service_id}', 
                jsonb_build_object('old', OLD.areas_service_id, 'new', NEW.areas_service_id));
        END IF;
        
        IF NEW.remit_number IS DISTINCT FROM OLD.remit_number THEN
            changed_fields := jsonb_set(changed_fields, '{remit_number}', 
                jsonb_build_object('old', OLD.remit_number, 'new', NEW.remit_number));
        END IF;
        
        IF NEW.cancel_reason IS DISTINCT FROM OLD.cancel_reason THEN
            changed_fields := jsonb_set(changed_fields, '{cancel_reason}', 
                jsonb_build_object('old', OLD.cancel_reason, 'new', NEW.cancel_reason));
        END IF;
        
        IF NEW.type_service IS DISTINCT FROM OLD.type_service THEN
            changed_fields := jsonb_set(changed_fields, '{type_service}', 
                jsonb_build_object('old', OLD.type_service::TEXT, 'new', NEW.type_service::TEXT));
        END IF;
        
        IF changed_fields != '{}'::JSONB THEN
            BEGIN
                SELECT jsonb_build_object(
                    'customer_name', (SELECT name FROM customers WHERE id = NEW.customer_id),
                    'service_name', (SELECT service_name FROM customer_services WHERE id = NEW.service_id),
                    'item_name', (SELECT item_name FROM service_items WHERE id = NEW.item_id),
                    'working_day', NEW.working_day,
                    'status', NEW.status,
                    'type_service', NEW.type_service
                ) INTO readable_data;
                
                RAISE NOTICE 'Insertando en dailyreportrows_history. Action: UPDATE, Reason: %', v_reassignment_reason;
                
                INSERT INTO dailyreportrows_history (
                    daily_report_row_id,
                    related_table,
                    related_id,
                    action_type,
                    changed_fields,
                    changed_data,
                    changed_by,
                    reassignment_reason
                ) VALUES (
                    NEW.id,
                    TG_TABLE_NAME,
                    NEW.id,
                    'UPDATE',
                    changed_fields,
                    readable_data,
                    user_id,
                    v_reassignment_reason
                );
                
                -- Limpiar la variable de sesión después de usarla
                IF v_reassignment_reason IS NOT NULL THEN
                    PERFORM set_config('myapp.reassignment_reason', NULL, false);
                    RAISE NOTICE 'Variable de sesión de motivo de reasignación limpiada';
                END IF;
                
            EXCEPTION WHEN foreign_key_violation THEN
                RAISE NOTICE 'Excepción de clave foránea en INSERT';
                NULL;
            WHEN OTHERS THEN
                RAISE NOTICE 'Error durante la inserción: %', SQLERRM;
            END;
        END IF;
        
    ELSIF TG_OP = 'INSERT' THEN
        BEGIN
            SELECT jsonb_build_object(
                'customer_name', (SELECT name FROM customers WHERE id = NEW.customer_id),
                'service_name', (SELECT service_name FROM customer_services WHERE id = NEW.service_id),
                'item_name', (SELECT item_name FROM service_items WHERE id = NEW.item_id),
                'working_day', NEW.working_day,
                'status', NEW.status,
                'type_service', NEW.type_service
            ) INTO readable_data;
            
            RAISE NOTICE 'Insertando en dailyreportrows_history. Action: CREATE';
            
            INSERT INTO dailyreportrows_history (
                daily_report_row_id,
                related_table,
                related_id,
                action_type,
                changed_fields,
                changed_data,
                changed_by,
                reassignment_reason
            ) VALUES (
                NEW.id,
                TG_TABLE_NAME,
                NEW.id,
                'CREATE',
                '{}'::JSONB,
                readable_data,
                user_id,
                NULL -- No hay motivo de reasignación para nuevas filas
            );
        EXCEPTION WHEN foreign_key_violation THEN
            RAISE NOTICE 'Excepción de clave foránea en INSERT para CREATE';
            NULL;
        END;
        
    ELSIF TG_OP = 'DELETE' THEN
        BEGIN
            SELECT EXISTS(SELECT 1 FROM dailyreportrows_history WHERE daily_report_row_id = OLD.id) INTO row_exists;
            
            IF row_exists THEN
                SELECT jsonb_build_object(
                    'customer_name', (SELECT name FROM customers WHERE id = OLD.customer_id),
                    'service_name', (SELECT service_name FROM customer_services WHERE id = OLD.service_id),
                    'item_name', (SELECT item_name FROM service_items WHERE id = OLD.item_id),
                    'working_day', OLD.working_day,
                    'status', OLD.status,
                    'type_service', OLD.type_service
                ) INTO readable_data;
                
                RAISE NOTICE 'Insertando en dailyreportrows_history. Action: DELETE';
                
                INSERT INTO dailyreportrows_history (
                    daily_report_row_id,
                    related_table,
                    related_id,
                    action_type,
                    changed_fields,
                    changed_data,
                    changed_by,
                    reassignment_reason
                ) VALUES (
                    OLD.id,
                    TG_TABLE_NAME,
                    OLD.id,
                    'DELETE',
                    '{}'::JSONB,
                    readable_data,
                    user_id,
                    NULL -- No hay motivo de reasignación para eliminaciones
                );
            END IF;
        EXCEPTION WHEN foreign_key_violation THEN
            RAISE NOTICE 'Excepción de clave foránea en INSERT para DELETE';
            NULL;
        END;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;$function$;

-- function marcar_prepartes_vencidos (origen: supabase/migrations/20260202113926_fixing-maintenance-flow.sql)
-- Task 4: portada desde objects.json (era huerfana: la llamaba el cron de Supabase). Llamador: job P5.
CREATE OR REPLACE FUNCTION public.marcar_prepartes_vencidos()
 RETURNS void
 LANGUAGE plpgsql
AS $function$BEGIN
    UPDATE public.preparte
    SET 
        status = 'vencido',
        updated_at = NOW()
    WHERE status = 'pendiente'
    AND "executionDate" < CURRENT_DATE
    AND (
        "executionDate"::date < CURRENT_DATE
        OR 
        ("executionDate"::date = CURRENT_DATE AND "executionDate" < NOW())
    );
END;$function$;

-- ============================================================================
-- VIEWS (1)
-- ============================================================================

-- view equipments_with_pending_deviations (origen: prisma/migrations/20260919130100_drop_repair_solicitudes/migration.sql)
CREATE OR REPLACE VIEW public.equipments_with_pending_deviations AS
 SELECT DISTINCT v.id,
    v.domain,
    v.serie,
    v.intern_number,
    v.company_id,
    tv.name AS type_name,
    count(DISTINCT cd.id) AS deviation_count,
    max(cd.created_at) AS last_deviation_date
   FROM ((public.checklist_deviations cd
     JOIN public.vehicles v ON ((cd.equipment_id = v.id)))
     LEFT JOIN public.types_of_vehicles tv ON ((v.type_of_vehicle = tv.id)))
  WHERE (NOT (EXISTS ( SELECT 1
           FROM public.maintenance_request_items mri
          WHERE (mri.checklist_deviation_id = cd.id))))
  GROUP BY v.id, v.domain, v.serie, v.intern_number, v.company_id, tv.name
 HAVING (count(DISTINCT cd.id) > 0)
  ORDER BY (max(cd.created_at)) DESC;

-- ============================================================================
-- TRIGGERS (8)
-- ============================================================================

-- trigger tr_dailyreport_customer_equipment_relations_history ON dailyreport_customer_equipment_relations (origen: supabase/migrations/20251103211302_initial_structure.sql)
DROP TRIGGER IF EXISTS tr_dailyreport_customer_equipment_relations_history ON public.dailyreport_customer_equipment_relations;
CREATE TRIGGER tr_dailyreport_customer_equipment_relations_history BEFORE INSERT OR DELETE ON public.dailyreport_customer_equipment_relations FOR EACH ROW EXECUTE FUNCTION public.log_customer_equipment_relations_changes();

-- trigger tr_dailyreport_employee_relations_history ON dailyreportemployeerelations (origen: supabase/migrations/20251103211302_initial_structure.sql)
DROP TRIGGER IF EXISTS tr_dailyreport_employee_relations_history ON public.dailyreportemployeerelations;
CREATE TRIGGER tr_dailyreport_employee_relations_history BEFORE INSERT OR DELETE ON public.dailyreportemployeerelations FOR EACH ROW EXECUTE FUNCTION public.log_employee_relations_changes();

-- trigger tr_dailyreport_equipment_relations_history ON dailyreportequipmentrelations (origen: supabase/migrations/20251103211302_initial_structure.sql)
DROP TRIGGER IF EXISTS tr_dailyreport_equipment_relations_history ON public.dailyreportequipmentrelations;
CREATE TRIGGER tr_dailyreport_equipment_relations_history BEFORE INSERT OR DELETE ON public.dailyreportequipmentrelations FOR EACH ROW EXECUTE FUNCTION public.log_equipment_relations_changes();

-- trigger before_update_log_reason ON dailyreportrows (origen: supabase/migrations/20251103211302_initial_structure.sql)
DROP TRIGGER IF EXISTS before_update_log_reason ON public.dailyreportrows;
CREATE TRIGGER before_update_log_reason BEFORE UPDATE ON public.dailyreportrows FOR EACH ROW EXECUTE FUNCTION public.log_reassignment_reason_before_update();

-- trigger tr_after_dailyreportrows_update_optimized ON dailyreportrows (origen: supabase/migrations/20251104195732_confirmed_by_and_dailyreport_perfomance.sql)
DROP TRIGGER IF EXISTS tr_after_dailyreportrows_update_optimized ON public.dailyreportrows;
CREATE TRIGGER tr_after_dailyreportrows_update_optimized AFTER INSERT OR DELETE OR UPDATE ON public.dailyreportrows FOR EACH ROW EXECUTE FUNCTION public.after_dailyreportrows_update_optimized();

-- trigger tr_dailyreportrows_history_after_insert ON dailyreportrows (origen: supabase/migrations/20251103211302_initial_structure.sql)
DROP TRIGGER IF EXISTS tr_dailyreportrows_history_after_insert ON public.dailyreportrows;
CREATE TRIGGER tr_dailyreportrows_history_after_insert AFTER INSERT ON public.dailyreportrows FOR EACH ROW EXECUTE FUNCTION public.log_dailyreport_changes();

-- trigger tr_dailyreportrows_history_before_delete ON dailyreportrows (origen: supabase/migrations/20251103211302_initial_structure.sql)
DROP TRIGGER IF EXISTS tr_dailyreportrows_history_before_delete ON public.dailyreportrows;
CREATE TRIGGER tr_dailyreportrows_history_before_delete BEFORE DELETE ON public.dailyreportrows FOR EACH ROW EXECUTE FUNCTION public.log_dailyreport_changes();

-- trigger tr_dailyreportrows_history_before_update ON dailyreportrows (origen: supabase/migrations/20251103211302_initial_structure.sql)
DROP TRIGGER IF EXISTS tr_dailyreportrows_history_before_update ON public.dailyreportrows;
CREATE TRIGGER tr_dailyreportrows_history_before_update BEFORE UPDATE ON public.dailyreportrows FOR EACH ROW EXECUTE FUNCTION public.log_dailyreport_changes();

-- ── prisma/sql/kpis.sql ──────────────────────────────────────────────────────────────────────
-- Generado por scripts/sql/extract-sql-objects.ts — editar a mano SOLO en la revisión de Task 4
-- Dominio: kpis — 7 objeto(s)
-- Revisado a mano en la Task 4 (P1): + run_daily_indicators_for_all_companies (job P5).

-- ============================================================================
-- FUNCTIONS (7)
-- ============================================================================

-- function generate_kpi_code (origen: supabase/migrations/20260202113926_fixing-maintenance-flow.sql)
CREATE OR REPLACE FUNCTION public.generate_kpi_code(company_uuid uuid)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
  max_number INTEGER;
  new_code TEXT;
BEGIN
  -- Obtener el número más grande de los códigos existentes para esta empresa
  SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM '^KPI-(\d+)$') AS INTEGER)), 0)
  INTO max_number
  FROM kpis
  WHERE company_id = company_uuid
    AND code ~ '^KPI-\d+$';
  
  -- Generar el nuevo código
  new_code := 'KPI-' || LPAD((max_number + 1)::TEXT, 4, '0');
  
  RETURN new_code;
END;
$function$;

-- function get_company_counts_indicator (origen: supabase/migrations/20251103211302_initial_structure.sql)
CREATE OR REPLACE FUNCTION public.get_company_counts_indicator(p_company_id uuid DEFAULT NULL::uuid, save_to_table boolean DEFAULT false)
 RETURNS TABLE(employee_count bigint, vehicle_count bigint, total_count bigint)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_employee_count bigint;
    v_vehicle_count bigint;
    v_total_count bigint;
    v_current_date date;
BEGIN
    -- Obtener la fecha actual en Argentina
    v_current_date := (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;
    
    -- Consultar conteo de empleados activos
    SELECT COUNT(*) INTO v_employee_count
    FROM employees 
    WHERE company_id = p_company_id 
    AND is_active = true;
    
    -- Consultar conteo de vehículos activos
    SELECT COUNT(*) INTO v_vehicle_count
    FROM vehicles 
    WHERE company_id = p_company_id 
    AND is_active = true;
    
    -- Calcular total
    v_total_count := v_employee_count + v_vehicle_count;
    
    -- Si save_to_table es true, insertar en daily_indicators
    IF save_to_table THEN
        INSERT INTO public.daily_indicators (
            company_id,
            snapshot_date,
            metrics,
            source
        )
        SELECT
            p_company_id,
            v_current_date,
            jsonb_build_object(
                'employee_count', v_employee_count,
                'vehicle_count', v_vehicle_count,
                'total_count', v_total_count
            ),
            'get_company_counts_indicator'::public.indicator_function
        WHERE save_to_table = true AND p_company_id IS NOT NULL;
    END IF;
    
    -- Retornar los resultados
    RETURN QUERY 
    SELECT 
        v_employee_count as employee_count,
        v_vehicle_count as vehicle_count,
        v_total_count as total_count;
END;
$function$;

-- function get_employee_usage_indicator (origen: supabase/migrations/20251103211302_initial_structure.sql)
CREATE OR REPLACE FUNCTION public.get_employee_usage_indicator(position_uuids uuid[] DEFAULT NULL::uuid[], save_to_table boolean DEFAULT false, p_company_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(employees_operativos integer, employees_used integer, indicator numeric)
 LANGUAGE plpgsql
AS $function$BEGIN 
    RETURN QUERY 
    WITH 
    -- CTE 1: Empleados operativos con diagrama laboral activo para HOY (fecha argentina) 
    employees_with_active_diagram AS ( 
        SELECT DISTINCT ed.employee_id 
        FROM employees_diagram ed 
        INNER JOIN diagram_type dt ON ed.diagram_type = dt.id 
        INNER JOIN employees e ON ed.employee_id = e.id 
        WHERE ed.day = EXTRACT(DAY FROM (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')) 
          AND ed.month = EXTRACT(MONTH FROM (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')) 
          AND ed.year = EXTRACT(YEAR FROM (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')) 
          AND dt.work_active = true 
          AND dt.is_active = true 
          AND (p_company_id IS NULL OR e.company_id = p_company_id) 
          AND (position_uuids IS NULL OR array_length(position_uuids, 1) IS NULL OR e.company_position = ANY(position_uuids)) 
          AND e.is_active = true 
    ), 
    
    -- CTE 2: Empleados asignados a líneas de dayReportRow para hoy (fecha argentina) 
    employees_in_daily_reports AS ( 
        SELECT DISTINCT drer.employee_id 
        FROM dailyreportemployeerelations drer 
        INNER JOIN dailyreportrows drr ON drer.daily_report_row_id = drr.id 
        INNER JOIN dailyreport dr ON drr.daily_report_id = dr.id 
        INNER JOIN employees e ON drer.employee_id = e.id 
        WHERE dr.date = (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date 
          AND (p_company_id IS NULL OR e.company_id = p_company_id) 
          AND (position_uuids IS NULL OR array_length(position_uuids, 1) IS NULL OR e.company_position = ANY(position_uuids)) 
          AND e.is_active = true 
          AND dr.is_active = true 
    ), 
    
    -- CTE 3: Calcular resultados finales 
    count_results AS ( 
        SELECT 
            COALESCE((SELECT COUNT(*) FROM employees_with_active_diagram), 0)::integer as total_operativos, 
            COALESCE((SELECT COUNT(*) FROM employees_in_daily_reports), 0)::integer as total_used 
    ), 
    
    -- CTE 4: Agregar indicador de porcentaje 
    final_calculations AS ( 
        SELECT 
            cr.total_operativos as employees_operativos, 
            cr.total_used as employees_used, 
            CASE 
                WHEN cr.total_operativos > 0 THEN 
                    ROUND((cr.total_used::decimal / cr.total_operativos::decimal) * 100, 2) 
                ELSE 0.00 
            END::NUMERIC(5,2) as indicator 
        FROM count_results cr 
    ),
    
    -- CTE 5: Insertar en daily_indicators si save_to_table es true
    insert_data AS (
        INSERT INTO public.daily_indicators (
            company_id,
            snapshot_date,
            metrics,
            source
        )
        SELECT 
            p_company_id,
            (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date,
            jsonb_build_object(
                'employees_operativos', fc.employees_operativos,
                'employees_used', fc.employees_used,
                'indicator', fc.indicator
            ),
            'get_employee_usage_indicator'::public.indicator_function
        FROM final_calculations fc
        WHERE save_to_table = true AND p_company_id IS NOT NULL
        RETURNING id
    )
    
    SELECT 
        fc.employees_operativos, 
        fc.employees_used, 
        fc.indicator 
    FROM final_calculations fc; 
END;$function$;

-- function get_kpi_range (origen: supabase/migrations/20260202113926_fixing-maintenance-flow.sql)
CREATE OR REPLACE FUNCTION public.get_kpi_range(p_kpi_code text, p_company_id uuid, p_from_date date, p_to_date date)
 RETURNS TABLE(snapshot_date date, indicator numeric, raw_data jsonb)
 LANGUAGE plpgsql
AS $function$
DECLARE
  -- IDs de tipos Tractor y Chasis
  v_tipo_tractor_id uuid := 'ea07ff34-13fb-4483-b5bc-8389e41c7d89';
  v_tipo_chasis_id uuid := '5dc2bc44-de86-4e1d-ae0c-87eafd60dccf';
  -- ID del cliente GH - Movimientos Internos
  v_gh_mi_id uuid := 'fecde2b8-f310-495d-9d70-847c9ebfa890';
BEGIN
  
  -- =====================================================
  -- KPI-0001: Ausentismo Diario (AD)
  -- =====================================================
  IF p_kpi_code = 'KPI-0001' THEN
    RETURN QUERY
    WITH 
    -- Total empleados activos (constante para todo el rango)
    te_base AS (
      SELECT COUNT(*)::integer as te
      FROM employees e
      WHERE e.company_id = p_company_id AND e.is_active = true
    ),
    -- Total ausentes por fecha
    ta_by_date AS (
      SELECT 
        make_date(ed.year::int, ed.month::int, ed.day::int) as fecha,
        COUNT(DISTINCT ed.employee_id)::integer as ta
      FROM employees_diagram ed
      JOIN employees e ON e.id = ed.employee_id
      JOIN diagram_type dt ON dt.id = ed.diagram_type
      WHERE e.company_id = p_company_id
        AND e.is_active = true
        AND dt.computes_absenteeism = true
        AND make_date(ed.year::int, ed.month::int, ed.day::int) BETWEEN p_from_date AND p_to_date
      GROUP BY make_date(ed.year::int, ed.month::int, ed.day::int)
    ),
    -- Generar todas las fechas del rango
    dates AS (
      SELECT d::date as fecha
      FROM generate_series(p_from_date, p_to_date, '1 day'::interval) d
    )
    SELECT 
      d.fecha,
      CASE WHEN tb.te = 0 THEN 0 ELSE ROUND((COALESCE(ta.ta, 0)::numeric / tb.te::numeric) * 100, 2) END,
      jsonb_build_object('date', d.fecha, 'TE', tb.te, 'TA', COALESCE(ta.ta, 0), 'AD', 
        CASE WHEN tb.te = 0 THEN 0 ELSE ROUND((COALESCE(ta.ta, 0)::numeric / tb.te::numeric) * 100, 2) END)
    FROM dates d
    CROSS JOIN te_base tb
    LEFT JOIN ta_by_date ta ON ta.fecha = d.fecha
    ORDER BY d.fecha;
    
    RETURN;
  END IF;

  -- =====================================================
  -- KPI-0002: Personal en Movimientos Internos (PMI)
  -- =====================================================
  IF p_kpi_code = 'KPI-0002' THEN
    RETURN QUERY
    WITH 
    -- TPA: Personal apto por fecha (choferes con work_active en diagrama)
    tpa_by_date AS (
      SELECT 
        make_date(ed.year::int, ed.month::int, ed.day::int) as fecha,
        COUNT(DISTINCT ed.employee_id)::integer as tpa
      FROM employees_diagram ed
      JOIN diagram_type dt ON ed.diagram_type = dt.id
      JOIN employees e ON ed.employee_id = e.id
      JOIN category cat ON cat.id = e.category_id
      WHERE e.company_id = p_company_id
        AND e.is_active = true
        AND dt.work_active = true
        AND dt.is_active = true
        AND cat.is_active = true
        AND (cat.name IN ('Chofer de 1°', 'Chofer de 3°')
             OR cat.name ILIKE '%chofer%1°%' OR cat.name ILIKE '%chofer%3°%'
             OR cat.name ILIKE '%conductor%1°%' OR cat.name ILIKE '%conductor%3°%')
        AND make_date(ed.year::int, ed.month::int, ed.day::int) BETWEEN p_from_date AND p_to_date
      GROUP BY make_date(ed.year::int, ed.month::int, ed.day::int)
    ),
    -- TMI: Personal en Movimientos Internos por fecha
    tmi_by_date AS (
      SELECT 
        dr.date as fecha,
        COUNT(DISTINCT drer.employee_id)::integer as tmi
      FROM dailyreportemployeerelations drer
      JOIN dailyreportrows drw ON drer.daily_report_row_id = drw.id
      JOIN dailyreport dr ON drw.daily_report_id = dr.id
      JOIN employees e ON e.id = drer.employee_id
      JOIN category cat ON cat.id = e.category_id
      WHERE e.company_id = p_company_id
        AND e.is_active = true
        AND cat.is_active = true
        AND (cat.name IN ('Chofer de 1°', 'Chofer de 3°')
             OR cat.name ILIKE '%chofer%1°%' OR cat.name ILIKE '%chofer%3°%'
             OR cat.name ILIKE '%conductor%1°%' OR cat.name ILIKE '%conductor%3°%')
        AND dr.is_active = true
        AND drw.customer_id = v_gh_mi_id
        AND dr.date BETWEEN p_from_date AND p_to_date
      GROUP BY dr.date
    ),
    dates AS (
      SELECT d::date as fecha FROM generate_series(p_from_date, p_to_date, '1 day'::interval) d
    )
    SELECT 
      d.fecha,
      CASE WHEN COALESCE(tpa.tpa, 0) = 0 THEN 0 
           ELSE ROUND((COALESCE(tmi.tmi, 0)::numeric / tpa.tpa::numeric) * 100, 2) END,
      jsonb_build_object('date', d.fecha, 'TPA', COALESCE(tpa.tpa, 0), 'TMI', COALESCE(tmi.tmi, 0), 'PMI',
        CASE WHEN COALESCE(tpa.tpa, 0) = 0 THEN 0 
             ELSE ROUND((COALESCE(tmi.tmi, 0)::numeric / tpa.tpa::numeric) * 100, 2) END)
    FROM dates d
    LEFT JOIN tpa_by_date tpa ON tpa.fecha = d.fecha
    LEFT JOIN tmi_by_date tmi ON tmi.fecha = d.fecha
    ORDER BY d.fecha;
    
    RETURN;
  END IF;

  -- =====================================================
  -- KPI-0003: Productividad Personal (PP)
  -- =====================================================
  IF p_kpi_code = 'KPI-0003' THEN
    RETURN QUERY
    WITH 
    -- TPA: Personal apto por fecha
    tpa_by_date AS (
      SELECT 
        make_date(ed.year::int, ed.month::int, ed.day::int) as fecha,
        COUNT(DISTINCT ed.employee_id)::integer as tpa
      FROM employees_diagram ed
      JOIN diagram_type dt ON ed.diagram_type = dt.id
      JOIN employees e ON ed.employee_id = e.id
      JOIN category cat ON cat.id = e.category_id
      WHERE e.company_id = p_company_id
        AND e.is_active = true
        AND dt.work_active = true
        AND dt.is_active = true
        AND cat.is_active = true
        AND (cat.name IN ('Chofer de 1°', 'Chofer de 3°')
             OR cat.name ILIKE '%chofer%1°%' OR cat.name ILIKE '%chofer%3°%'
             OR cat.name ILIKE '%conductor%1°%' OR cat.name ILIKE '%conductor%3°%')
        AND make_date(ed.year::int, ed.month::int, ed.day::int) BETWEEN p_from_date AND p_to_date
      GROUP BY make_date(ed.year::int, ed.month::int, ed.day::int)
    ),
    -- TMI y TPC en una sola consulta
    personal_by_date AS (
      SELECT 
        dr.date as fecha,
        COUNT(DISTINCT CASE WHEN drw.customer_id = v_gh_mi_id THEN drer.employee_id END)::integer as tmi,
        COUNT(DISTINCT CASE WHEN drw.customer_id IS NOT NULL AND drw.customer_id <> v_gh_mi_id THEN drer.employee_id END)::integer as tpc
      FROM dailyreportemployeerelations drer
      JOIN dailyreportrows drw ON drer.daily_report_row_id = drw.id
      JOIN dailyreport dr ON drw.daily_report_id = dr.id
      JOIN employees e ON e.id = drer.employee_id
      JOIN category cat ON cat.id = e.category_id
      WHERE e.company_id = p_company_id
        AND e.is_active = true
        AND cat.is_active = true
        AND (cat.name IN ('Chofer de 1°', 'Chofer de 3°')
             OR cat.name ILIKE '%chofer%1°%' OR cat.name ILIKE '%chofer%3°%'
             OR cat.name ILIKE '%conductor%1°%' OR cat.name ILIKE '%conductor%3°%')
        AND dr.is_active = true
        AND dr.date BETWEEN p_from_date AND p_to_date
      GROUP BY dr.date
    ),
    dates AS (
      SELECT d::date as fecha FROM generate_series(p_from_date, p_to_date, '1 day'::interval) d
    )
    SELECT 
      d.fecha,
      CASE WHEN GREATEST(COALESCE(tpa.tpa, 0) - COALESCE(p.tmi, 0), 0) = 0 THEN 0
           ELSE ROUND((COALESCE(p.tpc, 0)::numeric / GREATEST(COALESCE(tpa.tpa, 0) - COALESCE(p.tmi, 0), 1)::numeric) * 100, 2) END,
      jsonb_build_object('date', d.fecha, 'TPA', COALESCE(tpa.tpa, 0), 'TMI', COALESCE(p.tmi, 0), 'TPC', COALESCE(p.tpc, 0), 'PP',
        CASE WHEN GREATEST(COALESCE(tpa.tpa, 0) - COALESCE(p.tmi, 0), 0) = 0 THEN 0
             ELSE ROUND((COALESCE(p.tpc, 0)::numeric / GREATEST(COALESCE(tpa.tpa, 0) - COALESCE(p.tmi, 0), 1)::numeric) * 100, 2) END)
    FROM dates d
    LEFT JOIN tpa_by_date tpa ON tpa.fecha = d.fecha
    LEFT JOIN personal_by_date p ON p.fecha = d.fecha
    ORDER BY d.fecha;
    
    RETURN;
  END IF;

  -- =====================================================
  -- KPI-0004: Disponibilidad Operacional Mantenimiento (EDO)
  -- =====================================================
  IF p_kpi_code = 'KPI-0004' THEN
    RETURN QUERY
    WITH 
    -- EA y ENO son constantes (estado actual de vehículos)
    equipos_base AS (
      SELECT 
        COUNT(*) FILTER (WHERE v.condition <> 'en preparacion')::integer as ea,
        COUNT(*) FILTER (WHERE v.condition = 'no operativo')::integer as eno
      FROM vehicles v
      WHERE v.company_id = p_company_id
        AND v.is_active = true
        AND v.type IN (v_tipo_tractor_id, v_tipo_chasis_id)
    ),
    dates AS (
      SELECT d::date as fecha FROM generate_series(p_from_date, p_to_date, '1 day'::interval) d
    )
    SELECT 
      d.fecha,
      CASE WHEN eb.ea = 0 THEN 0 ELSE ROUND((eb.eno::numeric / eb.ea::numeric) * 100, 2) END,
      jsonb_build_object('date', d.fecha, 'EA', eb.ea, 'ENO', eb.eno, 'EDO',
        CASE WHEN eb.ea = 0 THEN 0 ELSE ROUND((eb.eno::numeric / eb.ea::numeric) * 100, 2) END)
    FROM dates d
    CROSS JOIN equipos_base eb
    ORDER BY d.fecha;
    
    RETURN;
  END IF;

  -- =====================================================
  -- KPI-0005: Equipos en Movimientos Internos (EMI)
  -- =====================================================
  IF p_kpi_code = 'KPI-0005' THEN
    RETURN QUERY
    WITH 
    -- EOA: Equipos operativos (constante)
    eoa_base AS (
      SELECT COUNT(*)::integer as eoa
      FROM vehicles v
      WHERE v.company_id = p_company_id
        AND v.is_active = true
        AND v.type IN (v_tipo_tractor_id, v_tipo_chasis_id)
        AND v.condition NOT IN ('en preparacion', 'no operativo')
    ),
    -- EAMI por fecha
    eami_by_date AS (
      SELECT 
        dr.date as fecha,
        COUNT(DISTINCT drer.equipment_id)::integer as eami
      FROM dailyreportequipmentrelations drer
      JOIN dailyreportrows drw ON drer.daily_report_row_id = drw.id
      JOIN dailyreport dr ON drw.daily_report_id = dr.id
      JOIN vehicles v ON v.id = drer.equipment_id
      WHERE v.company_id = p_company_id
        AND v.is_active = true
        AND v.type IN (v_tipo_tractor_id, v_tipo_chasis_id)
        AND v.condition NOT IN ('en preparacion', 'no operativo')
        AND dr.is_active = true
        AND drw.customer_id = v_gh_mi_id
        AND dr.date BETWEEN p_from_date AND p_to_date
      GROUP BY dr.date
    ),
    dates AS (
      SELECT d::date as fecha FROM generate_series(p_from_date, p_to_date, '1 day'::interval) d
    )
    SELECT 
      d.fecha,
      CASE WHEN eb.eoa = 0 THEN 0 ELSE ROUND((COALESCE(eami.eami, 0)::numeric / eb.eoa::numeric) * 100, 2) END,
      jsonb_build_object('date', d.fecha, 'EOA', eb.eoa, 'EAMI', COALESCE(eami.eami, 0), 'EMI',
        CASE WHEN eb.eoa = 0 THEN 0 ELSE ROUND((COALESCE(eami.eami, 0)::numeric / eb.eoa::numeric) * 100, 2) END)
    FROM dates d
    CROSS JOIN eoa_base eb
    LEFT JOIN eami_by_date eami ON eami.fecha = d.fecha
    ORDER BY d.fecha;
    
    RETURN;
  END IF;

  -- =====================================================
  -- KPI-0006: Equipos Operativos en Cliente (EOC)
  -- =====================================================
  IF p_kpi_code = 'KPI-0006' THEN
    RETURN QUERY
    WITH 
    -- EOA: Equipos operativos (constante)
    eoa_base AS (
      SELECT COUNT(*)::integer as eoa
      FROM vehicles v
      WHERE v.company_id = p_company_id
        AND v.is_active = true
        AND v.type IN (v_tipo_tractor_id, v_tipo_chasis_id)
        AND v.condition NOT IN ('en preparacion', 'no operativo')
    ),
    -- EAMI y TEOC en una sola consulta
    equipos_by_date AS (
      SELECT 
        dr.date as fecha,
        COUNT(DISTINCT CASE WHEN drw.customer_id = v_gh_mi_id THEN drer.equipment_id END)::integer as eami,
        COUNT(DISTINCT CASE WHEN drw.customer_id IS NOT NULL AND drw.customer_id <> v_gh_mi_id THEN drer.equipment_id END)::integer as teoc
      FROM dailyreportequipmentrelations drer
      JOIN dailyreportrows drw ON drer.daily_report_row_id = drw.id
      JOIN dailyreport dr ON drw.daily_report_id = dr.id
      JOIN vehicles v ON v.id = drer.equipment_id
      WHERE v.company_id = p_company_id
        AND v.is_active = true
        AND v.type IN (v_tipo_tractor_id, v_tipo_chasis_id)
        AND v.condition NOT IN ('en preparacion', 'no operativo')
        AND dr.is_active = true
        AND dr.date BETWEEN p_from_date AND p_to_date
      GROUP BY dr.date
    ),
    dates AS (
      SELECT d::date as fecha FROM generate_series(p_from_date, p_to_date, '1 day'::interval) d
    )
    SELECT 
      d.fecha,
      CASE WHEN GREATEST(eb.eoa - COALESCE(eq.eami, 0), 0) = 0 THEN 0
           ELSE ROUND((COALESCE(eq.teoc, 0)::numeric / GREATEST(eb.eoa - COALESCE(eq.eami, 0), 1)::numeric) * 100, 2) END,
      jsonb_build_object('date', d.fecha, 'EOA', eb.eoa, 'EAMI', COALESCE(eq.eami, 0), 
        'TEOA', GREATEST(eb.eoa - COALESCE(eq.eami, 0), 0), 'TEOC', COALESCE(eq.teoc, 0), 'EOC',
        CASE WHEN GREATEST(eb.eoa - COALESCE(eq.eami, 0), 0) = 0 THEN 0
             ELSE ROUND((COALESCE(eq.teoc, 0)::numeric / GREATEST(eb.eoa - COALESCE(eq.eami, 0), 1)::numeric) * 100, 2) END)
    FROM dates d
    CROSS JOIN eoa_base eb
    LEFT JOIN equipos_by_date eq ON eq.fecha = d.fecha
    ORDER BY d.fecha;
    
    RETURN;
  END IF;

  -- KPI no reconocido - retornar vacío
  RETURN;
END;
$function$;

-- function get_services_summary_by_type (origen: supabase/migrations/20260202113926_fixing-maintenance-flow.sql)
CREATE OR REPLACE FUNCTION public.get_services_summary_by_type(p_company_id uuid, save_to_history boolean DEFAULT false)
 RETURNS TABLE(type_service text, service_count bigint, percentage numeric)
 LANGUAGE plpgsql
AS $function$BEGIN
  RETURN QUERY
  WITH service_summary AS (
    SELECT 
      COALESCE(dr.type_service::TEXT, 'sin_tipo') AS type_service,
      COUNT(*) AS count_services
    FROM dailyreportrows dr
    INNER JOIN dailyreport d 
      ON dr.daily_report_id = d.id
    WHERE d.company_id = p_company_id
      AND d.date = (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
    GROUP BY dr.type_service
  ),
  total_services AS (
    SELECT SUM(count_services) AS total 
    FROM service_summary
  )
  SELECT 
    ss.type_service,
    ss.count_services AS service_count,
    CASE 
      WHEN ts.total > 0 
        THEN ROUND((ss.count_services::NUMERIC / ts.total::NUMERIC) * 100, 2)
      ELSE 0
    END AS percentage
  FROM service_summary ss
  CROSS JOIN total_services ts
  ORDER BY ss.count_services DESC;
END;$function$;

-- function get_vehicle_usage_indicator (origen: supabase/migrations/20260202113926_fixing-maintenance-flow.sql)
CREATE OR REPLACE FUNCTION public.get_vehicle_usage_indicator(p_vehicle_type_ids uuid[] DEFAULT NULL::uuid[], p_company_id uuid DEFAULT NULL::uuid, save_to_table boolean DEFAULT false)
 RETURNS TABLE(type_id uuid, type_name text, subtype_id uuid, subtype_name text, available_units bigint, not_available_units bigint, used_units bigint, usage_indicator numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- 1️⃣ Tabla temporal para los tipos y subtipos de vehículos a procesar
    CREATE TEMP TABLE vehicle_types_subtypes_to_process AS
    SELECT DISTINCT 
        t.id as type_id, 
        t.name as type_name,
        v."subType" as subtype_id,
        st.name as subtype_name
    FROM vehicles v
    JOIN type t ON v.type = t.id
    LEFT JOIN sub_type st ON v."subType" = st.id
    WHERE v.is_active = TRUE
      AND (array_length(p_vehicle_type_ids, 1) IS NULL
           OR array_length(p_vehicle_type_ids, 1) = 0
           OR v.type = ANY(p_vehicle_type_ids))
      AND (p_company_id IS NULL OR v.company_id = p_company_id);

    -- 2️⃣ Contar unidades disponibles por tipo y subtipo
    CREATE TEMP TABLE available_counts AS
    SELECT
        v.type as type_id,
        v."subType" as subtype_id,
        COUNT(v.id) AS total
    FROM vehicles v
    WHERE v.is_active = TRUE
      AND v.condition NOT IN ('no operativo', 'en reparacion')
      AND EXISTS (
          SELECT 1 
          FROM vehicle_types_subtypes_to_process vtp
          WHERE vtp.type_id = v.type 
            AND COALESCE(vtp.subtype_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(v."subType", '00000000-0000-0000-0000-000000000000'::uuid)
      )
      AND (p_company_id IS NULL OR v.company_id = p_company_id)
    GROUP BY v.type, v."subType";

    -- 3️⃣ Contar unidades NO disponibles por tipo y subtipo
    CREATE TEMP TABLE not_available_counts AS
    SELECT
        v.type as type_id,
        v."subType" as subtype_id,
        COUNT(v.id) AS total
    FROM vehicles v
    WHERE v.is_active = TRUE
      AND v.condition IN ('no operativo', 'en reparacion')
      AND EXISTS (
          SELECT 1 
          FROM vehicle_types_subtypes_to_process vtp
          WHERE vtp.type_id = v.type 
            AND COALESCE(vtp.subtype_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(v."subType", '00000000-0000-0000-0000-000000000000'::uuid)
      )
      AND (p_company_id IS NULL OR v.company_id = p_company_id)
    GROUP BY v.type, v."subType";

    -- 4️⃣ Contar unidades utilizadas hoy por tipo y subtipo
    CREATE TEMP TABLE used_counts AS
    SELECT
        v.type as type_id,
        v."subType" as subtype_id,
        COUNT(DISTINCT v.id) AS total
    FROM dailyreport dr
    JOIN dailyreportrows drr 
      ON dr.id = drr.daily_report_id
    JOIN dailyreportequipmentrelations drer 
      ON drr.id = drer.daily_report_row_id
    JOIN vehicles v 
      ON drer.equipment_id = v.id
    WHERE v.is_active = TRUE
      AND dr.date >= (current_timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
      AND dr.date < ((current_timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires')::date + interval '1 day')
      AND EXISTS (
          SELECT 1 
          FROM vehicle_types_subtypes_to_process vtp
          WHERE vtp.type_id = v.type 
            AND COALESCE(vtp.subtype_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(v."subType", '00000000-0000-0000-0000-000000000000'::uuid)
      )
      AND (p_company_id IS NULL OR v.company_id = p_company_id)
    GROUP BY v.type, v."subType";

    -- 5️⃣ Unir resultados
    RETURN QUERY
    SELECT
        vt.type_id,
        vt.type_name,
        vt.subtype_id,
        vt.subtype_name,
        COALESCE(ac.total, 0) AS available_units,
        COALESCE(nac.total, 0) AS not_available_units,
        COALESCE(uc.total, 0) AS used_units,
        CASE
            WHEN COALESCE(ac.total, 0) > 0 THEN
                (COALESCE(uc.total, 0)::numeric / ac.total::numeric)
            ELSE
                0
        END AS usage_indicator
    FROM vehicle_types_subtypes_to_process vt
    LEFT JOIN available_counts ac 
        ON vt.type_id = ac.type_id 
        AND COALESCE(vt.subtype_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(ac.subtype_id, '00000000-0000-0000-0000-000000000000'::uuid)
    LEFT JOIN not_available_counts nac 
        ON vt.type_id = nac.type_id 
        AND COALESCE(vt.subtype_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(nac.subtype_id, '00000000-0000-0000-0000-000000000000'::uuid)
    LEFT JOIN used_counts uc 
        ON vt.type_id = uc.type_id 
        AND COALESCE(vt.subtype_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(uc.subtype_id, '00000000-0000-0000-0000-000000000000'::uuid);

    -- 6️⃣ Guardar snapshot si aplica
    IF save_to_table AND p_company_id IS NOT NULL THEN
        INSERT INTO public.daily_indicators (
            company_id,
            snapshot_date,
            metrics,
            source
        )
        SELECT
            p_company_id,
            (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date,
            JSON_AGG(
                JSON_BUILD_OBJECT(
                    'type_id', vt.type_id,
                    'type_name', vt.type_name,
                    'subtype_id', vt.subtype_id,
                    'subtype_name', vt.subtype_name,
                    'available_units', COALESCE(ac.total, 0),
                    'not_available_units', COALESCE(nac.total, 0),
                    'used_units', COALESCE(uc.total, 0),
                    'usage_indicator', CASE
                        WHEN COALESCE(ac.total, 0) > 0 THEN
                            (COALESCE(uc.total, 0)::numeric / ac.total::numeric)
                        ELSE
                            0
                    END
                )
            ),
            'get_vehicle_usage_indicator'::public.indicator_function
        FROM vehicle_types_subtypes_to_process vt
        LEFT JOIN available_counts ac 
            ON vt.type_id = ac.type_id 
            AND COALESCE(vt.subtype_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(ac.subtype_id, '00000000-0000-0000-0000-000000000000'::uuid)
        LEFT JOIN not_available_counts nac 
            ON vt.type_id = nac.type_id 
            AND COALESCE(vt.subtype_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(nac.subtype_id, '00000000-0000-0000-0000-000000000000'::uuid)
        LEFT JOIN used_counts uc 
            ON vt.type_id = uc.type_id 
            AND COALESCE(vt.subtype_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(uc.subtype_id, '00000000-0000-0000-0000-000000000000'::uuid)
        GROUP BY p_company_id;
    END IF;

    -- 🔚 Limpiar temporales
    DROP TABLE IF EXISTS vehicle_types_subtypes_to_process;
    DROP TABLE IF EXISTS available_counts;
    DROP TABLE IF EXISTS not_available_counts;
    DROP TABLE IF EXISTS used_counts;
END;
$function$;

-- function run_daily_indicators_for_all_companies (origen: prisma/migrations/20260819120100_add_daily_report_deviations_snapshot/migration.sql)
-- Task 4: portada desde objects.json (era huerfana: la llamaba el cron de Supabase). Llamador: job P5.
-- Va en kpis.sql (y no en daily-report.sql) porque llama a funciones de diagrams, daily-report y kpis:
-- en el orden de concatenacion del baseline todas existen antes. No depende de pg_cron ni pg_net: recorre `company`
-- y persiste cada indicador con save_to_table => true.
CREATE OR REPLACE FUNCTION public.run_daily_indicators_for_all_companies()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  company_record RECORD;
  v_today date := (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;
BEGIN
  FOR company_record IN SELECT id FROM company LOOP
    BEGIN
      PERFORM public.get_employee_usage_indicator(
        position_uuids => NULL::uuid[],
        save_to_table => true,
        p_company_id => company_record.id
      );

      PERFORM public.get_employee_diagram_count_by_day(
        p_day => EXTRACT(DAY FROM v_today)::integer,
        p_month => EXTRACT(MONTH FROM v_today)::integer,
        p_year => EXTRACT(YEAR FROM v_today)::integer,
        p_company_position_ids => NULL,
        save_to_table => true,
        p_company_id => company_record.id
      );

      PERFORM public.get_vehicle_usage_indicator(
        p_vehicle_type_ids => ARRAY[]::uuid[],
        p_company_id => company_record.id,
        save_to_table => true
      );

      PERFORM public.get_company_counts_indicator(
        p_company_id => company_record.id,
        save_to_table => true
      );

      PERFORM public.hr_get_absenteeism_summary(
        p_company_id => company_record.id,
        p_from => v_today,
        p_to => v_today,
        save_to_table => true
      );

      PERFORM public.hr_get_absenteeism_trend(
        p_company_id => company_record.id,
        p_from => v_today,
        p_to => v_today,
        save_to_table => true
      );

      PERFORM public.hr_get_current_absent_employees(
        p_company_id => company_record.id,
        p_date => v_today,
        save_to_table => true
      );

      PERFORM public.hr_get_daily_absence_timeseries(
        p_company_id => company_record.id,
        p_from => v_today,
        p_to => v_today,
        save_to_table => true
      );

      PERFORM public.hr_get_department_absence_reasons(
        p_company_id => company_record.id,
        p_date => v_today,
        save_to_table => true
      );

      PERFORM public.hr_get_department_absence_summary(
        p_company_id => company_record.id,
        p_date => v_today,
        save_to_table => true
      );

      PERFORM public.get_daily_report_deviations_indicator(
        p_company_id => company_record.id,
        p_date => v_today,
        save_to_table => true
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error al ejecutar indicadores para company_id %: %', company_record.id, SQLERRM;
    END;
  END LOOP;
END;
$function$;

-- ── prisma/sql/maintenance.sql ───────────────────────────────────────────────────────────────
-- Generado por scripts/sql/extract-sql-objects.ts — editar a mano SOLO en la revisión de Task 4
-- Dominio: maintenance — 11 objeto(s)
-- Revisado a mano en la Task 4 (P1): actor por app.user_id y company_id en el log de actividad.

-- ============================================================================
-- FUNCTIONS (4)
-- ============================================================================

-- function log_maintenance_order_activity (origen: prisma/migrations/20260901180000_fix_date_confirmed_activity_label/migration.sql)
CREATE OR REPLACE FUNCTION public.log_maintenance_order_activity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  -- Task 4: actor de la transaccion (SET LOCAL app.user_id, helper withActor) en lugar del uid del JWT
  v_actor uuid := public.app_current_user_id();
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO maintenance_activity_log (
      company_id,              -- Task 4: NOT NULL, heredado del pedido
      maintenance_order_id,
      maintenance_request_id,  -- NUEVO: También guardar la solicitud vinculada
      action_type,
      performed_by,
      previous_status,
      new_status,
      notes,
      rejection_reason,
      metadata
    ) VALUES (
      NEW.company_id,
      NEW.id,
      NEW.maintenance_request_id,  -- NUEVO: Incluir el ID de la solicitud
      -- action_type
      CASE NEW.status
        WHEN 'pending_scheduling' THEN
          CASE WHEN TG_OP = 'INSERT' THEN 'created'
               WHEN OLD.status = 'scheduled' THEN 'date_rejected'
               ELSE 'status_changed'
          END
        WHEN 'scheduled' THEN 'scheduled'
        WHEN 'date_confirmed' THEN 'date_confirmed'
        WHEN 'in_workshop' THEN 'workshop_entry'
        WHEN 'completed' THEN 'completed'
        WHEN 'rejected' THEN 'rejected'
        ELSE 'status_changed'
      END,
      -- performed_by
      COALESCE(
        CASE NEW.status
          WHEN 'pending_scheduling' THEN
            CASE WHEN TG_OP = 'INSERT' THEN v_actor
                 WHEN OLD.status = 'scheduled' THEN NEW.date_rejected_by
                 ELSE v_actor
            END
          WHEN 'scheduled' THEN NEW.scheduled_by
          WHEN 'date_confirmed' THEN NEW.date_approved_by
          WHEN 'in_workshop' THEN NEW.workshop_approved_by
          WHEN 'completed' THEN v_actor
          WHEN 'rejected' THEN NEW.rejected_by
          ELSE v_actor
        END,
        v_actor
      ),
      -- previous_status
      CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.status END,
      -- new_status
      NEW.status,
      -- notes
      CASE NEW.status
        WHEN 'pending_scheduling' THEN
          CASE WHEN TG_OP = 'INSERT' THEN 'Pedido creado'
               WHEN OLD.status = 'scheduled' THEN 'Fecha rechazada - requiere reprogramación'
               ELSE 'Cambio de estado'
          END
        WHEN 'scheduled' THEN 'Fecha programada'
        WHEN 'date_confirmed' THEN 'Fecha confirmada por taller'
        WHEN 'in_workshop' THEN 'Equipo ingresado al taller'
        WHEN 'completed' THEN 'Pedido completado'
        WHEN 'rejected' THEN 'Pedido rechazado'
        ELSE 'Cambio de estado'
      END,
      -- rejection_reason
      CASE 
        WHEN NEW.status = 'pending_scheduling' AND OLD.status = 'scheduled' 
          THEN NEW.date_rejection_reason
        WHEN NEW.status = 'rejected' 
          THEN NEW.rejection_reason
        ELSE NULL 
      END,
      -- metadata
      CASE NEW.status
        WHEN 'pending_scheduling' THEN
          CASE WHEN TG_OP = 'INSERT' THEN
            jsonb_build_object(
              'source', NEW.source,
              'equipment_id', NEW.equipment_id,
              'maintenance_request_id', NEW.maintenance_request_id
            )
          WHEN OLD.status = 'scheduled' THEN
            jsonb_build_object(
              'date_rejected_by', NEW.date_rejected_by,
              'date_rejected_at', NEW.date_rejected_at,
              'previous_scheduled_date', OLD.scheduled_date
            )
          ELSE '{}'::jsonb
          END
        WHEN 'scheduled' THEN
          jsonb_build_object(
            'scheduled_date', NEW.scheduled_date,
            'scheduled_by', NEW.scheduled_by,
            'scheduled_at', NEW.scheduled_at
          )
        WHEN 'date_confirmed' THEN
          jsonb_build_object(
            'scheduled_date', NEW.scheduled_date,
            'date_approved_by', NEW.date_approved_by,
            'date_approved_at', NEW.date_approved_at
          )
        WHEN 'in_workshop' THEN
          jsonb_build_object(
            'workshop_entry_date', NEW.workshop_entry_date,
            'workshop_approved_by', NEW.workshop_approved_by,
            'kilometer_at_entry', NEW.kilometer_at_entry
          )
        WHEN 'completed' THEN
          jsonb_build_object(
            'completed_at', NOW(),
            'total_duration_days', EXTRACT(DAY FROM (NOW() - NEW.created_at))
          )
        WHEN 'rejected' THEN
          jsonb_build_object(
            'rejected_by', NEW.rejected_by,
            'rejected_at', NEW.rejected_at,
            'rejection_reason', NEW.rejection_reason
          )
        ELSE 
          jsonb_build_object(
            'scheduled_date', NEW.scheduled_date,
            'kilometer_at_entry', NEW.kilometer_at_entry
          )
      END
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- function log_work_order_activity (origen: supabase/migrations/20260202113926_fixing-maintenance-flow.sql)
CREATE OR REPLACE FUNCTION public.log_work_order_activity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  -- Task 4: actor de la transaccion (SET LOCAL app.user_id, helper withActor) en lugar del uid del JWT
  v_actor uuid := public.app_current_user_id();
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO maintenance_activity_log (
      company_id,  -- Task 4: NOT NULL, heredado de la orden de trabajo
      work_order_id,
      action_type,
      performed_by,
      previous_status,
      new_status,
      notes,
      rejection_reason,
      metadata
    ) VALUES (
      NEW.company_id,
      NEW.id,
      -- action_type
      CASE NEW.status
        WHEN 'pending' THEN
          CASE WHEN TG_OP = 'INSERT' THEN 'work_order_created'
               ELSE 'status_changed'
          END
        WHEN 'in_progress' THEN
          CASE WHEN OLD.status = 'paused' THEN 'resumed'
               ELSE 'started'
          END
        WHEN 'paused' THEN 'paused'
        WHEN 'completed' THEN 'completed'
        WHEN 'cancelled' THEN 'cancelled'
        ELSE 'status_changed'
      END,
      -- performed_by
      COALESCE(
        CASE NEW.status
          WHEN 'pending' THEN NEW.created_by
          WHEN 'in_progress' THEN 
            CASE WHEN OLD.status = 'paused' THEN v_actor  -- resumed
                 ELSE NEW.started_by
            END
          WHEN 'paused' THEN NEW.paused_by
          WHEN 'completed' THEN NEW.completed_by
          WHEN 'cancelled' THEN NEW.cancelled_by
          ELSE v_actor
        END,
        v_actor
      ),
      -- previous_status
      CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.status::text END,
      -- new_status
      NEW.status::text,
      -- notes
      CASE NEW.status
        WHEN 'pending' THEN
          CASE WHEN TG_OP = 'INSERT' THEN 'Orden de trabajo creada'
               ELSE 'Cambio de estado'
          END
        WHEN 'in_progress' THEN
          CASE WHEN OLD.status = 'paused' THEN 'Trabajo reanudado'
               ELSE 'Trabajo iniciado'
          END
        WHEN 'paused' THEN COALESCE('Trabajo pausado: ' || NEW.pause_reason, 'Trabajo pausado')
        WHEN 'completed' THEN 'Orden de trabajo completada'
        WHEN 'cancelled' THEN 'Orden de trabajo cancelada'
        ELSE 'Cambio de estado'
      END,
      -- rejection_reason (usamos para cancellation_reason)
      CASE WHEN NEW.status = 'cancelled' THEN NEW.cancellation_reason ELSE NULL END,
      -- metadata
      CASE NEW.status
        WHEN 'pending' THEN
          jsonb_build_object(
            'order_number', NEW.order_number,
            'equipment_id', NEW.equipment_id,
            'workshop_id', NEW.workshop_id,
            'sector_id', NEW.sector_id,
            'priority', NEW.priority,
            'planned_start_date', NEW.planned_start_date,
            'planned_end_date', NEW.planned_end_date
          )
        WHEN 'in_progress' THEN
          jsonb_build_object(
            'started_by', NEW.started_by,
            'started_at', NEW.started_at,
            'actual_start_date', NEW.actual_start_date
          )
        WHEN 'paused' THEN
          jsonb_build_object(
            'paused_by', NEW.paused_by,
            'paused_at', NEW.paused_at,
            'pause_reason', NEW.pause_reason,
            'total_paused_time', NEW.total_paused_time
          )
        WHEN 'completed' THEN
          jsonb_build_object(
            'completed_by', NEW.completed_by,
            'completed_at', NEW.completed_at,
            'actual_end_date', NEW.actual_end_date,
            'total_paused_time', NEW.total_paused_time
          )
        WHEN 'cancelled' THEN
          jsonb_build_object(
            'cancelled_by', NEW.cancelled_by,
            'cancelled_at', NEW.cancelled_at,
            'cancellation_reason', NEW.cancellation_reason
          )
        ELSE '{}'::jsonb
      END
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- function update_work_order_item_repairs_updated_at (origen: supabase/migrations/20260202113926_fixing-maintenance-flow.sql)
CREATE OR REPLACE FUNCTION public.update_work_order_item_repairs_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- function update_work_orders_updated_at (origen: supabase/migrations/20260202113926_fixing-maintenance-flow.sql)
CREATE OR REPLACE FUNCTION public.update_work_orders_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

-- ============================================================================
-- TRIGGERS (7)
-- ============================================================================

-- trigger trigger_log_maintenance_order_activity ON maintenance_orders (origen: supabase/migrations/20260202113926_fixing-maintenance-flow.sql)
DROP TRIGGER IF EXISTS trigger_log_maintenance_order_activity ON public.maintenance_orders;
CREATE TRIGGER trigger_log_maintenance_order_activity AFTER INSERT OR UPDATE ON public.maintenance_orders FOR EACH ROW EXECUTE FUNCTION public.log_maintenance_order_activity();

-- trigger update_maintenance_orders_updated_at ON maintenance_orders (origen: supabase/migrations/20260117002627_adding-form-config.sql)
DROP TRIGGER IF EXISTS update_maintenance_orders_updated_at ON public.maintenance_orders;
CREATE TRIGGER update_maintenance_orders_updated_at BEFORE UPDATE ON public.maintenance_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- trigger update_maintenance_requests_updated_at ON maintenance_requests (origen: supabase/migrations/20260117002627_adding-form-config.sql)
DROP TRIGGER IF EXISTS update_maintenance_requests_updated_at ON public.maintenance_requests;
CREATE TRIGGER update_maintenance_requests_updated_at BEFORE UPDATE ON public.maintenance_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- trigger trigger_update_work_order_item_repairs_updated_at ON work_order_item_repairs (origen: supabase/migrations/20260127143252_maintenance-fix-2.sql)
DROP TRIGGER IF EXISTS trigger_update_work_order_item_repairs_updated_at ON public.work_order_item_repairs;
CREATE TRIGGER trigger_update_work_order_item_repairs_updated_at BEFORE UPDATE ON public.work_order_item_repairs FOR EACH ROW EXECUTE FUNCTION public.update_work_order_item_repairs_updated_at();

-- trigger trigger_work_order_items_updated_at ON work_order_items (origen: supabase/migrations/20260123202856_add_maintenance_flow_changes.sql)
DROP TRIGGER IF EXISTS trigger_work_order_items_updated_at ON public.work_order_items;
CREATE TRIGGER trigger_work_order_items_updated_at BEFORE UPDATE ON public.work_order_items FOR EACH ROW EXECUTE FUNCTION public.update_work_orders_updated_at();

-- trigger trigger_log_work_order_activity ON work_orders (origen: supabase/migrations/20260202113926_fixing-maintenance-flow.sql)
DROP TRIGGER IF EXISTS trigger_log_work_order_activity ON public.work_orders;
CREATE TRIGGER trigger_log_work_order_activity AFTER INSERT OR UPDATE ON public.work_orders FOR EACH ROW EXECUTE FUNCTION public.log_work_order_activity();

-- trigger trigger_work_orders_updated_at ON work_orders (origen: supabase/migrations/20260123202856_add_maintenance_flow_changes.sql)
DROP TRIGGER IF EXISTS trigger_work_orders_updated_at ON public.work_orders;
CREATE TRIGGER trigger_work_orders_updated_at BEFORE UPDATE ON public.work_orders FOR EACH ROW EXECUTE FUNCTION public.update_work_orders_updated_at();

