-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "auth";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "storage";

-- CreateEnum
CREATE TYPE "auth"."aal_level" AS ENUM ('aal1', 'aal2', 'aal3');

-- CreateEnum
CREATE TYPE "auth"."code_challenge_method" AS ENUM ('s256', 'plain');

-- CreateEnum
CREATE TYPE "auth"."factor_status" AS ENUM ('unverified', 'verified');

-- CreateEnum
CREATE TYPE "auth"."factor_type" AS ENUM ('totp', 'webauthn', 'phone');

-- CreateEnum
CREATE TYPE "auth"."oauth_authorization_status" AS ENUM ('pending', 'approved', 'denied', 'expired');

-- CreateEnum
CREATE TYPE "auth"."oauth_client_type" AS ENUM ('public', 'confidential');

-- CreateEnum
CREATE TYPE "auth"."oauth_registration_type" AS ENUM ('dynamic', 'manual');

-- CreateEnum
CREATE TYPE "auth"."oauth_response_type" AS ENUM ('code');

-- CreateEnum
CREATE TYPE "auth"."one_time_token_type" AS ENUM ('confirmation_token', 'reauthentication_token', 'recovery_token', 'email_change_token_new', 'email_change_token_current', 'phone_change_token');

-- CreateEnum
CREATE TYPE "public"."affiliate_status_enum" AS ENUM ('Dentro de convenio', 'Fuera de convenio');

-- CreateEnum
CREATE TYPE "public"."condition_enum" AS ENUM ('operativo', 'no operativo', 'en reparacion', 'operativo condicionado', 'en preparacion');

-- CreateEnum
CREATE TYPE "public"."contract_type_enum" AS ENUM ('Leasing', 'Alquiler', 'Prendado');

-- CreateEnum
CREATE TYPE "public"."contract_type_vehicles_enum" AS ENUM ('Leasing', 'Alquiler', 'Propio', 'Prendado');

-- CreateEnum
CREATE TYPE "public"."cost_type_enum" AS ENUM ('Directo', 'Indirecto');

-- CreateEnum
CREATE TYPE "public"."currency_enum" AS ENUM ('USD', 'EUR', 'GBP', 'ARS');

-- CreateEnum
CREATE TYPE "public"."daily_report_header_status_new" AS ENUM ('abierto', 'cerrado', 'cerrado_completo', 'cerrado_incompleto');

-- CreateEnum
CREATE TYPE "public"."daily_report_status" AS ENUM ('pendiente', 'sin_recursos_asignados', 'ejecutado', 'reprogramado', 'cancelado', '.', '..', 'en_certificacion');

-- CreateEnum
CREATE TYPE "public"."daily_report_type_enum" AS ENUM ('mensual', 'adicional', 'adicional_permanente');

-- CreateEnum
CREATE TYPE "public"."document_applies" AS ENUM ('Persona', 'Equipos', 'Empresa');

-- CreateEnum
CREATE TYPE "public"."document_type_enum" AS ENUM ('DNI', 'LE', 'LC', 'PASAPORTE');

-- CreateEnum
CREATE TYPE "public"."employee_daily_report_role" AS ENUM ('chofer_dia', 'chofer_noche', 'ayudante_dia', 'ayudante_noche');

-- CreateEnum
CREATE TYPE "public"."gender_enum" AS ENUM ('Masculino', 'Femenino', 'No Declarado');

-- CreateEnum
CREATE TYPE "public"."indicator_function" AS ENUM ('get_vehicle_usage_indicator', 'get_employee_usage_indicator', 'get_employee_diagram_count_by_day', 'get_company_counts_indicator', 'hr_get_absenteeism_summary', 'hr_get_absenteeism_trend', 'hr_get_current_absent_employees', 'hr_get_daily_absence_timeseries', 'hr_get_department_absence_reasons', 'hr_get_department_absence_summary');

-- CreateEnum
CREATE TYPE "public"."level_of_education_enum" AS ENUM ('Primario', 'Secundario', 'Terciario', 'Universitario', 'PosGrado');

-- CreateEnum
CREATE TYPE "public"."marital_status_enum" AS ENUM ('Casado', 'Soltero', 'Divorciado', 'Viudo', 'Separado', 'Union de hecho');

-- CreateEnum
CREATE TYPE "public"."modulos" AS ENUM ('empresa', 'empleados', 'equipos', 'documentación', 'mantenimiento', 'dashboard', 'ayuda', 'operaciones', 'formularios');

-- CreateEnum
CREATE TYPE "public"."nationality_enum" AS ENUM ('Argentina', 'Extranjero');

-- CreateEnum
CREATE TYPE "public"."notification_categories" AS ENUM ('vencimiento', 'noticia', 'advertencia', 'aprobado', 'rechazado');

-- CreateEnum
CREATE TYPE "public"."preparte_status" AS ENUM ('pendiente', 'cancelado', 'reprogramado', 'rechazado', 'vencido', 'confirmado');

-- CreateEnum
CREATE TYPE "public"."reason_for_termination_enum" AS ENUM ('Despido sin causa', 'Renuncia', 'Despido con causa', 'Acuerdo de partes', 'Fin de contrato', 'Fallecimiento');

-- CreateEnum
CREATE TYPE "public"."repair_state" AS ENUM ('Pendiente', 'Esperando repuestos', 'En reparación', 'Finalizado', 'Rechazado', 'Cancelado', 'Programado');

-- CreateEnum
CREATE TYPE "public"."roles_enum" AS ENUM ('Externo', 'Auditor');

-- CreateEnum
CREATE TYPE "public"."state" AS ENUM ('presentado', 'rechazado', 'aprobado', 'vencido', 'pendiente');

-- CreateEnum
CREATE TYPE "public"."status_type" AS ENUM ('Avalado', 'No avalado', 'Incompleto', 'Completo', 'Completo con doc vencida');

-- CreateEnum
CREATE TYPE "public"."termination_reason_enum" AS ENUM ('venta', 'destrucción total', 'devolución', 'otro');

-- CreateEnum
CREATE TYPE "public"."type_equipment" AS ENUM ('Perforador', 'Perforador Spudder', 'Work over', 'Fractura', 'Coiled Tubing');

-- CreateEnum
CREATE TYPE "public"."type_of_contract_enum" AS ENUM ('Período de prueba', 'A tiempo indeterminado', 'Plazo fijo');

-- CreateEnum
CREATE TYPE "public"."type_of_maintenance_ENUM" AS ENUM ('Correctivo', 'Preventivo', 'Otro');

-- CreateEnum
CREATE TYPE "public"."work_order_item_status" AS ENUM ('pending', 'in_progress', 'completed', 'cancelled', 'pending_approval', 'reassignment_requested', 'rejected');

-- CreateEnum
CREATE TYPE "public"."work_order_priority" AS ENUM ('urgent', 'high', 'medium', 'low');

-- CreateEnum
CREATE TYPE "public"."work_order_status" AS ENUM ('pending', 'in_progress', 'paused', 'completed', 'completed_partial', 'cancelled');

-- CreateEnum
CREATE TYPE "public"."workshop_type" AS ENUM ('interno', 'externo');

-- CreateEnum
CREATE TYPE "storage"."buckettype" AS ENUM ('STANDARD', 'ANALYTICS', 'VECTOR');

-- CreateTable
CREATE TABLE "auth"."audit_log_entries" (
    "instance_id" UUID,
    "id" UUID NOT NULL,
    "payload" JSON,
    "created_at" TIMESTAMPTZ(6),
    "ip_address" VARCHAR(64) NOT NULL DEFAULT '',

    CONSTRAINT "audit_log_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."custom_oauth_providers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider_type" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "client_secret" TEXT NOT NULL,
    "acceptable_client_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pkce_enabled" BOOLEAN NOT NULL DEFAULT true,
    "attribute_mapping" JSONB NOT NULL DEFAULT '{}',
    "authorization_params" JSONB NOT NULL DEFAULT '{}',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "email_optional" BOOLEAN NOT NULL DEFAULT false,
    "issuer" TEXT,
    "discovery_url" TEXT,
    "skip_nonce_check" BOOLEAN NOT NULL DEFAULT false,
    "cached_discovery" JSONB,
    "discovery_cached_at" TIMESTAMPTZ(6),
    "authorization_url" TEXT,
    "token_url" TEXT,
    "userinfo_url" TEXT,
    "jwks_uri" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_oauth_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."flow_state" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "auth_code" TEXT,
    "code_challenge_method" "auth"."code_challenge_method",
    "code_challenge" TEXT,
    "provider_type" TEXT NOT NULL,
    "provider_access_token" TEXT,
    "provider_refresh_token" TEXT,
    "created_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6),
    "authentication_method" TEXT NOT NULL,
    "auth_code_issued_at" TIMESTAMPTZ(6),
    "invite_token" TEXT,
    "referrer" TEXT,
    "oauth_client_state_id" UUID,
    "linking_target_id" UUID,
    "email_optional" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "flow_state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."identities" (
    "provider_id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "identity_data" JSONB NOT NULL,
    "provider" TEXT NOT NULL,
    "last_sign_in_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6),
    "email" TEXT DEFAULT lower((identity_data ->> 'email'::text)),
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),

    CONSTRAINT "identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."instances" (
    "id" UUID NOT NULL,
    "uuid" UUID,
    "raw_base_config" TEXT,
    "created_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."mfa_amr_claims" (
    "session_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "authentication_method" TEXT NOT NULL,
    "id" UUID NOT NULL,

    CONSTRAINT "amr_id_pk" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."mfa_challenges" (
    "id" UUID NOT NULL,
    "factor_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "verified_at" TIMESTAMPTZ(6),
    "ip_address" INET NOT NULL,
    "otp_code" TEXT,
    "web_authn_session_data" JSONB,

    CONSTRAINT "mfa_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."mfa_factors" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "friendly_name" TEXT,
    "factor_type" "auth"."factor_type" NOT NULL,
    "status" "auth"."factor_status" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "secret" TEXT,
    "phone" TEXT,
    "last_challenged_at" TIMESTAMPTZ(6),
    "web_authn_credential" JSONB,
    "web_authn_aaguid" UUID,
    "last_webauthn_challenge_data" JSONB,

    CONSTRAINT "mfa_factors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."oauth_authorizations" (
    "id" UUID NOT NULL,
    "authorization_id" TEXT NOT NULL,
    "client_id" UUID NOT NULL,
    "user_id" UUID,
    "redirect_uri" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "state" TEXT,
    "resource" TEXT,
    "code_challenge" TEXT,
    "code_challenge_method" "auth"."code_challenge_method",
    "response_type" "auth"."oauth_response_type" NOT NULL DEFAULT 'code',
    "status" "auth"."oauth_authorization_status" NOT NULL DEFAULT 'pending',
    "authorization_code" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() + '00:03:00'::interval),
    "approved_at" TIMESTAMPTZ(6),
    "nonce" TEXT,

    CONSTRAINT "oauth_authorizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."oauth_client_states" (
    "id" UUID NOT NULL,
    "provider_type" TEXT NOT NULL,
    "code_verifier" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "oauth_client_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."oauth_clients" (
    "id" UUID NOT NULL,
    "client_secret_hash" TEXT,
    "registration_type" "auth"."oauth_registration_type" NOT NULL,
    "redirect_uris" TEXT NOT NULL,
    "grant_types" TEXT NOT NULL,
    "client_name" TEXT,
    "client_uri" TEXT,
    "logo_uri" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),
    "client_type" "auth"."oauth_client_type" NOT NULL DEFAULT 'confidential',
    "token_endpoint_auth_method" TEXT NOT NULL,

    CONSTRAINT "oauth_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."oauth_consents" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "scopes" TEXT NOT NULL,
    "granted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(6),

    CONSTRAINT "oauth_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."one_time_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_type" "auth"."one_time_token_type" NOT NULL,
    "token_hash" TEXT NOT NULL,
    "relates_to" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "one_time_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."refresh_tokens" (
    "instance_id" UUID,
    "id" BIGSERIAL NOT NULL,
    "token" VARCHAR(255),
    "user_id" VARCHAR(255),
    "revoked" BOOLEAN,
    "created_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6),
    "parent" VARCHAR(255),
    "session_id" UUID,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."saml_providers" (
    "id" UUID NOT NULL,
    "sso_provider_id" UUID NOT NULL,
    "entity_id" TEXT NOT NULL,
    "metadata_xml" TEXT NOT NULL,
    "metadata_url" TEXT,
    "attribute_mapping" JSONB,
    "created_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6),
    "name_id_format" TEXT,

    CONSTRAINT "saml_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."saml_relay_states" (
    "id" UUID NOT NULL,
    "sso_provider_id" UUID NOT NULL,
    "request_id" TEXT NOT NULL,
    "for_email" TEXT,
    "redirect_to" TEXT,
    "created_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6),
    "flow_state_id" UUID,

    CONSTRAINT "saml_relay_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."schema_migrations" (
    "version" VARCHAR(255) NOT NULL,

    CONSTRAINT "schema_migrations_pkey" PRIMARY KEY ("version")
);

-- CreateTable
CREATE TABLE "auth"."sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6),
    "factor_id" UUID,
    "aal" "auth"."aal_level",
    "not_after" TIMESTAMPTZ(6),
    "refreshed_at" TIMESTAMP(6),
    "user_agent" TEXT,
    "ip" INET,
    "tag" TEXT,
    "oauth_client_id" UUID,
    "refresh_token_hmac_key" TEXT,
    "refresh_token_counter" BIGINT,
    "scopes" TEXT,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."sso_domains" (
    "id" UUID NOT NULL,
    "sso_provider_id" UUID NOT NULL,
    "domain" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "sso_domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."sso_providers" (
    "id" UUID NOT NULL,
    "resource_id" TEXT,
    "created_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6),
    "disabled" BOOLEAN,

    CONSTRAINT "sso_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."users" (
    "instance_id" UUID,
    "id" UUID NOT NULL,
    "aud" VARCHAR(255),
    "role" VARCHAR(255),
    "email" VARCHAR(255),
    "encrypted_password" VARCHAR(255),
    "email_confirmed_at" TIMESTAMPTZ(6),
    "invited_at" TIMESTAMPTZ(6),
    "confirmation_token" VARCHAR(255),
    "confirmation_sent_at" TIMESTAMPTZ(6),
    "recovery_token" VARCHAR(255),
    "recovery_sent_at" TIMESTAMPTZ(6),
    "email_change_token_new" VARCHAR(255),
    "email_change" VARCHAR(255),
    "email_change_sent_at" TIMESTAMPTZ(6),
    "last_sign_in_at" TIMESTAMPTZ(6),
    "raw_app_meta_data" JSONB,
    "raw_user_meta_data" JSONB,
    "is_super_admin" BOOLEAN,
    "created_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6),
    "phone" TEXT,
    "phone_confirmed_at" TIMESTAMPTZ(6),
    "phone_change" TEXT DEFAULT '',
    "phone_change_token" VARCHAR(255) DEFAULT '',
    "phone_change_sent_at" TIMESTAMPTZ(6),
    "confirmed_at" TIMESTAMPTZ(6) DEFAULT LEAST(email_confirmed_at, phone_confirmed_at),
    "email_change_token_current" VARCHAR(255) DEFAULT '',
    "email_change_confirm_status" SMALLINT DEFAULT 0,
    "banned_until" TIMESTAMPTZ(6),
    "reauthentication_token" VARCHAR(255) DEFAULT '',
    "reauthentication_sent_at" TIMESTAMPTZ(6),
    "is_sso_user" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),
    "is_anonymous" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."actions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."aptitudes_tecnicas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nombre" TEXT NOT NULL,
    "is_active" BOOLEAN DEFAULT true,

    CONSTRAINT "aptitudes_tecnicas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."aptitudes_tecnicas_puestos" (
    "aptitud_id" UUID NOT NULL,
    "puesto_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aptitudes_tecnicas_puestos_pkey" PRIMARY KEY ("aptitud_id","puesto_id")
);

-- CreateTable
CREATE TABLE "public"."area_province" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "area_id" UUID NOT NULL,
    "province_id" BIGINT NOT NULL,

    CONSTRAINT "area_province_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."areas_cliente" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nombre" TEXT NOT NULL,
    "descripcion_corta" TEXT,
    "customer_id" UUID NOT NULL,

    CONSTRAINT "areas_cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."assing_customer" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customer_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "equipment_id" UUID NOT NULL,

    CONSTRAINT "assing_customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."brand_vehicles" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "company_id" UUID,

    CONSTRAINT "brand_vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."category" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "covenant_id" UUID,
    "name" TEXT,
    "is_active" BOOLEAN DEFAULT true,

    CONSTRAINT "category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."category_employee" (
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category_id" UUID,
    "emplyee_id" UUID,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),

    CONSTRAINT "category_employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."checklist_answer_repairs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "checklist_answer_id" UUID NOT NULL,
    "repair_solicitud_id" UUID NOT NULL,
    "item_code" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checklist_answer_repairs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."checklist_answers" (
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
    "customer_id" UUID DEFAULT 
CASE
    WHEN (((answer_data ->> 'customer_id'::text) IS NOT NULL) AND ((answer_data ->> 'customer_id'::text) <> 'null'::text)) THEN ((answer_data ->> 'customer_id'::text))::uuid
    ELSE NULL::uuid
END,
    "horometro" DECIMAL DEFAULT 
CASE
    WHEN (((answer_data ->> 'horometro'::text) IS NOT NULL) AND ((answer_data ->> 'horometro'::text) <> ''::text) AND ((answer_data ->> 'horometro'::text) ~ '^[0-9]+(\.[0-9]+)?$'::text)) THEN ((answer_data ->> 'horometro'::text))::numeric
    ELSE NULL::numeric
END,
    "kilometraje" DECIMAL DEFAULT 
CASE
    WHEN (((answer_data ->> 'kilometraje'::text) IS NOT NULL) AND ((answer_data ->> 'kilometraje'::text) <> ''::text) AND ((answer_data ->> 'kilometraje'::text) ~ '^[0-9]+(\.[0-9]+)?$'::text)) THEN ((answer_data ->> 'kilometraje'::text))::numeric
    ELSE NULL::numeric
END,

    CONSTRAINT "checklist_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."checklist_deviations" (
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

    CONSTRAINT "checklist_deviations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."checklist_items" (
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
CREATE TABLE "public"."checklist_sections" (
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
CREATE TABLE "public"."checklist_template_items" (
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
CREATE TABLE "public"."checklist_template_sections" (
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
CREATE TABLE "public"."checklist_template_sub_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "template_id" UUID NOT NULL,
    "sub_type_id" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checklist_template_sub_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."checklist_template_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "template_id" UUID NOT NULL,
    "type_id" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checklist_template_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."checklist_templates" (
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
CREATE TABLE "public"."cities" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "province_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "citys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."companies_employees" (
    "employee_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID,

    CONSTRAINT "companies_employees_pkey1" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."company" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
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
CREATE TABLE "public"."company_positions" (
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT,
    "is_active" BOOLEAN,
    "hierarchical_position_id" UUID[],
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),

    CONSTRAINT "company_position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."contacts" (
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
CREATE TABLE "public"."contractor_employee" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "employee_id" UUID,
    "contractor_id" UUID,

    CONSTRAINT "contractor_employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."contractor_equipment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "equipment_id" UUID,
    "contractor_id" UUID,

    CONSTRAINT "contractor_equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."contractor_other_equipment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "equipment_id" UUID NOT NULL,
    "contractor_id" UUID NOT NULL,

    CONSTRAINT "contractor_other_equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."contractors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,

    CONSTRAINT "contractor-companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."cost_center" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN DEFAULT true,

    CONSTRAINT "cost_center_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."countries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."covenant" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT,
    "company_id" UUID NOT NULL,
    "is_active" BOOLEAN DEFAULT true,
    "guild_id" UUID NOT NULL,

    CONSTRAINT "covenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."custom_form" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "company_id" UUID NOT NULL,
    "form" JSONB NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "custom_form_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."customer_services" (
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
CREATE TABLE "public"."customers" (
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
CREATE TABLE "public"."daily_indicators" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "snapshot_date" DATE NOT NULL,
    "metrics" JSONB NOT NULL DEFAULT '{}',
    "source" "public"."indicator_function" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kpi_daily_indicators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."dailyreport" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "creation_date" DATE DEFAULT CURRENT_DATE,
    "date" DATE NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "company_id" UUID NOT NULL,
    "is_active" BOOLEAN DEFAULT true,
    "status" "public"."daily_report_header_status_new" NOT NULL DEFAULT 'abierto',

    CONSTRAINT "dailyreport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."dailyreport_customer_equipment_relations" (
    "daily_report_row_id" UUID NOT NULL,
    "customer_equipment_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),

    CONSTRAINT "dailyreport_customer_equipment_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."dailyreportemployeerelations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "daily_report_row_id" UUID,
    "employee_id" UUID,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "role" "public"."employee_daily_report_role",

    CONSTRAINT "dailyreportemployeerelations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."dailyreportequipmentrelations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "daily_report_row_id" UUID,
    "equipment_id" UUID,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "other_equipment_id" UUID,

    CONSTRAINT "dailyreportequipmentrelations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."dailyreportrows" (
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
    "status" "public"."daily_report_status" NOT NULL DEFAULT 'pendiente',
    "working_day" TEXT,
    "document_path" TEXT,
    "sector_service_id" UUID,
    "areas_service_id" UUID,
    "remit_number" TEXT,
    "cancel_reason" TEXT,
    "type_service" "public"."daily_report_type_enum",
    "completed_day" BOOLEAN,
    "completed_night" BOOLEAN,
    "preparte_id" UUID,
    "last_comercial_edit_at" TIMESTAMP(6),

    CONSTRAINT "dailyreportrows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."dailyreportrows_history" (
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
CREATE TABLE "public"."diagram_type" (
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
CREATE TABLE "public"."diagrams_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prev_date" TIMESTAMPTZ(6) NOT NULL,
    "description" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "prev_state" TEXT NOT NULL,
    "modified_by" UUID DEFAULT auth.uid(),
    "employee_id" UUID NOT NULL,
    "diagram_id" UUID NOT NULL,

    CONSTRAINT "diagrams_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."document_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "applies" "public"."document_applies" NOT NULL,
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
    "conditions" JSONB[],
    "equipment_type" VARCHAR(20),

    CONSTRAINT "document_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."documents_company" (
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_document_types" UUID,
    "validity" TEXT,
    "state" "public"."state" NOT NULL DEFAULT 'pendiente',
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
CREATE TABLE "public"."documents_contracts" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
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
CREATE TABLE "public"."documents_employees" (
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_document_types" UUID,
    "validity" TIMESTAMPTZ(6),
    "state" "public"."state" NOT NULL DEFAULT 'pendiente',
    "is_active" BOOLEAN DEFAULT true,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "applies" UUID,
    "deny_reason" TEXT,
    "document_path" TEXT,
    "period" TEXT,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."documents_employees_logs" (
    "id" SERIAL NOT NULL,
    "documents_employees_id" UUID NOT NULL,
    "modified_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_employees_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."documents_equipment" (
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_document_types" UUID,
    "applies" UUID,
    "validity" TIMESTAMPTZ(6),
    "state" "public"."state" DEFAULT 'pendiente',
    "is_active" BOOLEAN DEFAULT true,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "deny_reason" TEXT,
    "document_path" TEXT,
    "period" TEXT,

    CONSTRAINT "documents_equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."documents_equipment_logs" (
    "id" SERIAL NOT NULL,
    "documents_equipment_id" UUID NOT NULL,
    "modified_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_equipment_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."empleado_aptitudes" (
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
CREATE TABLE "public"."employees" (
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "picture" TEXT,
    "nationality" "public"."nationality_enum",
    "lastname" TEXT NOT NULL,
    "firstname" TEXT NOT NULL,
    "cuil" TEXT NOT NULL,
    "document_type" "public"."document_type_enum",
    "document_number" TEXT NOT NULL,
    "birthplace" UUID NOT NULL,
    "gender" "public"."gender_enum",
    "marital_status" "public"."marital_status_enum",
    "level_of_education" "public"."level_of_education_enum",
    "street" TEXT NOT NULL,
    "street_number" TEXT NOT NULL,
    "province" BIGINT NOT NULL,
    "postal_code" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "file" TEXT NOT NULL,
    "normal_hours" TEXT,
    "date_of_admission" DATE NOT NULL,
    "affiliate_status" "public"."affiliate_status_enum",
    "city" BIGINT,
    "hierarchical_position" UUID,
    "workflow_diagram" UUID,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "allocated_to" UUID[],
    "company_id" UUID,
    "is_active" BOOLEAN DEFAULT true,
    "reason_for_termination" "public"."reason_for_termination_enum",
    "termination_date" DATE,
    "status" "public"."status_type" DEFAULT 'Incompleto',
    "category_id" UUID,
    "covenants_id" UUID,
    "guild_id" UUID,
    "cost_center_id" UUID,
    "born_date" TEXT,
    "company_position" UUID,
    "type_of_contract" UUID,
    "cost_type" "public"."cost_type_enum",
    "workshop_sector_id" UUID,
    "full_name" TEXT DEFAULT ((COALESCE(lastname, ''::text) || ' '::text) || COALESCE(firstname, ''::text)),

    CONSTRAINT "companies_employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."employees_diagram" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "employee_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "diagram_type" UUID NOT NULL DEFAULT gen_random_uuid(),
    "day" DECIMAL NOT NULL,
    "month" DECIMAL NOT NULL,
    "year" DECIMAL NOT NULL,
    "is_active" BOOLEAN,

    CONSTRAINT "employees_diagram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."equipment_owner_contract_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "equipment_owner_id" UUID NOT NULL,
    "contract_type" "public"."contract_type_enum" NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipment_owner_contract_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."equipment_owners" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "cuit" TEXT NOT NULL,
    "contract_type" "public"."contract_type_enum" NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "company_id" UUID,
    "is_active" BOOLEAN DEFAULT true,

    CONSTRAINT "equipment_owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."equipos_clientes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "type" "public"."type_equipment" NOT NULL,
    "customer_id" UUID NOT NULL,

    CONSTRAINT "equipos_clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."form_answers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "form_id" UUID NOT NULL,
    "answer" JSON NOT NULL,

    CONSTRAINT "form_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."guild" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT,
    "company_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "guild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."handle_errors" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "menssage" TEXT NOT NULL,
    "path" TEXT NOT NULL,

    CONSTRAINT "handle_errors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."hierarchy" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN DEFAULT true,

    CONSTRAINT "hierarchy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."hired_modules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "company_id" UUID,
    "module_id" UUID,
    "due_to" DATE DEFAULT (CURRENT_DATE + '1 mon'::interval),

    CONSTRAINT "hired_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."industry_type" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT,
    "is_active" BOOLEAN DEFAULT true,

    CONSTRAINT "industry_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."kpi_revisions" (
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
CREATE TABLE "public"."kpis" (
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
CREATE TABLE "public"."maintenance_activity_log" (
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

    CONSTRAINT "maintenance_activity_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."maintenance_group_type_of_repairs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "group_id" UUID,

    CONSTRAINT "maintenance_group_type_of_repairs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."maintenance_order_item_repair_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "maintenance_order_item_id" UUID NOT NULL,
    "repair_type_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_order_item_repair_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."maintenance_order_items" (
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
    "workshop_chief_comment" TEXT,
    "workshop_chief_comment_by" UUID,

    CONSTRAINT "maintenance_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."maintenance_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "maintenance_request_id" UUID,
    "equipment_id" UUID NOT NULL,
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

    CONSTRAINT "maintenance_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."maintenance_request_groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_request_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."maintenance_request_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "maintenance_request_id" UUID NOT NULL,
    "checklist_deviation_id" UUID NOT NULL,
    "repair_type_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rejection_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "driver_comment" TEXT,
    "validator_comment" TEXT,
    "driver_comment_by" UUID,
    "supervisor_comment" TEXT,
    "supervisor_comment_by" UUID,
    "validator_comment_by" UUID,

    CONSTRAINT "maintenance_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."maintenance_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "checklist_answer_id" UUID,
    "equipment_id" UUID NOT NULL,
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

    CONSTRAINT "maintenance_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."measure_units" (
    "id" SERIAL NOT NULL,
    "unit" VARCHAR(50) NOT NULL,
    "simbol" VARCHAR(10) NOT NULL,
    "tipo" VARCHAR(20) NOT NULL,

    CONSTRAINT "measure_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."model_vehicles" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT,
    "brand" BIGINT,
    "is_active" BOOLEAN DEFAULT true,

    CONSTRAINT "model_vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."modules" (
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
CREATE TABLE "public"."notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT,
    "description" TEXT,
    "category" "public"."notification_categories",
    "company_id" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "document_id" UUID,
    "reference" TEXT,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."other_equipment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "type_id" UUID NOT NULL,
    "sub_type_id" UUID,
    "brand_id" INTEGER,
    "model_id" INTEGER,
    "serial_number" TEXT,
    "year" TEXT,
    "condition" "public"."condition_enum",
    "status" "public"."status_type",
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "intern_number" TEXT,
    "pictures" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "horometer" DECIMAL,
    "blueprints" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "manufacturer_plate" TEXT,
    "composition" TEXT,
    "invoice_number" TEXT,
    "initial_value" DECIMAL,
    "currency" "public"."currency_enum",
    "purchase_date" DATE,
    "cost_type" "public"."cost_type_enum",
    "cost_center_id" UUID,
    "sector" UUID,
    "linked_vehicle_id" UUID,
    "owner_id" UUID,
    "reason_for_termination" "public"."termination_reason_enum",
    "termination_date" DATE,
    "user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "other_equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."other_equipment_certifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "equipment_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "expiration_date" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "other_equipment_certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."password_reset_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_id" UUID,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMPTZ(6) NOT NULL,
    "used" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."preparte" (
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
    "status" "public"."preparte_status",
    "preparteImage" TEXT,
    "confirmed_by" TEXT,
    "subject_to_availability" BOOLEAN DEFAULT false,

    CONSTRAINT "preparte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."preparte_change_logs" (
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
CREATE TABLE "public"."profile" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "credential_id" UUID,
    "email" TEXT,
    "avatar" TEXT,
    "fullname" TEXT,
    "role" TEXT DEFAULT 'User',
    "modulos" "public"."modulos"[],
    "employee_id" UUID,

    CONSTRAINT "profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."provinces" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,

    CONSTRAINT "provinces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."remito_documents" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "remit_id" UUID NOT NULL,
    "document_path" TEXT NOT NULL,
    "document_name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "remito_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."remitos" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "daily_report_row_id" UUID NOT NULL,
    "remit_number" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "is_linked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "remitos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."repair_solicitudes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reparation_type" UUID NOT NULL,
    "equipment_id" UUID NOT NULL,
    "state" "public"."repair_state" NOT NULL,
    "user_description" TEXT,
    "mechanic_description" TEXT,
    "end_date" DATE,
    "user_id" UUID,
    "mechanic_id" UUID,
    "mechanic_images" TEXT[],
    "user_images" TEXT[],
    "employee_id" UUID,
    "kilometer" TEXT,
    "scheduled" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "repair_solicitudes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."repairlogs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT,
    "description" TEXT,
    "repair_id" UUID,
    "kilometer" TEXT,
    "modified_by_employee" UUID,
    "modified_by_user" UUID,

    CONSTRAINT "reparirlogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."role_permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "role_id" BIGINT NOT NULL,
    "tab_id" UUID NOT NULL,
    "action_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."roles" (
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
CREATE TABLE "public"."sector_customer" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sector_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT timezone('utc'::text, now()),

    CONSTRAINT "sector_customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sector_repair_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workshop_sector_id" UUID NOT NULL,
    "repair_type_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sector_repair_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sectors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "descripcion_corta" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT timezone('utc'::text, now()),

    CONSTRAINT "sectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."service_areas" (
    "service_id" UUID NOT NULL,
    "area_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),

    CONSTRAINT "service_areas_pkey" PRIMARY KEY ("service_id","area_id","id")
);

-- CreateTable
CREATE TABLE "public"."service_items" (
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
CREATE TABLE "public"."service_sectors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "service_id" UUID NOT NULL,
    "sector_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_sectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."share_company_users" (
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "profile_id" UUID DEFAULT gen_random_uuid(),
    "company_id" UUID DEFAULT gen_random_uuid(),
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID,
    "modules" "public"."modulos"[],

    CONSTRAINT "share_company_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sub_type" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN DEFAULT true,
    "company_id" UUID,
    "type" UUID,

    CONSTRAINT "sub_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sub_type_compatible_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sub_type_id" UUID NOT NULL,
    "compatible_item_id" UUID NOT NULL,
    "item_type" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sub_type_compatible_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tabs" (
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
CREATE TABLE "public"."type" (
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
CREATE TABLE "public"."type_hitch_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type_id" UUID NOT NULL,
    "compatible_type_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "type_hitch_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."type_operative" (
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),

    CONSTRAINT "type_operative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."types_of_contract" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN DEFAULT true,

    CONSTRAINT "types_of_contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."types_of_repairs" (
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "criticity" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "company_id" UUID,
    "type_of_maintenance" "public"."type_of_maintenance_ENUM",
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "multi_equipment" BOOLEAN NOT NULL DEFAULT false,
    "qr_close" BOOLEAN NOT NULL DEFAULT false,
    "autorizable" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "types_of_repairs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."types_of_vehicles" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT,
    "is_active" BOOLEAN DEFAULT true,

    CONSTRAINT "types_of_vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_permissions" (
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
CREATE TABLE "public"."user_roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "role_id" BIGINT NOT NULL,
    "assigned_by" UUID,
    "assigned_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_table_preferences" (
    "user_id" TEXT NOT NULL,
    "preferences" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_table_preferences_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "public"."vehicles" (
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "picture" TEXT,
    "type_of_vehicle" BIGINT NOT NULL,
    "domain" TEXT,
    "chassis" TEXT,
    "engine" TEXT NOT NULL,
    "serie" TEXT,
    "intern_number" TEXT,
    "year" TEXT NOT NULL,
    "brand" BIGINT,
    "model" BIGINT,
    "is_active" BOOLEAN DEFAULT true,
    "termination_date" DATE,
    "reason_for_termination" "public"."termination_reason_enum",
    "user_id" UUID DEFAULT auth.uid(),
    "company_id" UUID,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" UUID NOT NULL,
    "status" "public"."status_type" DEFAULT 'Incompleto',
    "allocated_to" UUID[],
    "condition" "public"."condition_enum" DEFAULT 'operativo',
    "kilometer" TEXT DEFAULT '0',
    "cost_center_id" UUID,
    "type_operative_id" UUID,
    "subType" UUID,
    "owner_id" UUID,
    "type_of_contract" "public"."contract_type_vehicles_enum",
    "contract_expiration_date" DATE,
    "contract_start_date" DATE,
    "contract_number" TEXT,
    "currency" "public"."currency_enum",
    "price" DECIMAL(15,2),
    "cost_type" "public"."cost_type_enum",
    "sector" UUID,
    "engine_hours" TEXT DEFAULT '0',

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."work_diagram" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN DEFAULT true,
    "active_working_days" DECIMAL,
    "inactive_novelty" UUID,
    "inactive_working_days" DECIMAL,

    CONSTRAINT "work-diagram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."work_diagram_active_novelties" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "work_diagram_id" UUID NOT NULL,
    "diagram_type_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_diagram_active_novelties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."work_order_item_repairs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "work_order_item_id" UUID NOT NULL,
    "repair_type_id" UUID NOT NULL,
    "status" "public"."work_order_item_status" NOT NULL DEFAULT 'pending',
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

    CONSTRAINT "work_order_item_repairs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."work_order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "work_order_id" UUID NOT NULL,
    "maintenance_order_item_id" UUID NOT NULL,
    "status" "public"."work_order_item_status" NOT NULL DEFAULT 'pending',
    "technician_notes" TEXT,
    "completed_at" TIMESTAMPTZ(6),
    "completed_by" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."work_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_number" TEXT NOT NULL,
    "sequence_number" INTEGER NOT NULL,
    "company_id" UUID NOT NULL,
    "equipment_id" UUID NOT NULL,
    "workshop_id" UUID NOT NULL,
    "sector_id" UUID,
    "status" "public"."work_order_status" NOT NULL DEFAULT 'pending',
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
    "priority" "public"."work_order_priority" NOT NULL DEFAULT 'medium',
    "total_paused_time" interval DEFAULT '00:00:00'::interval,

    CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."workshop_sectors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "workshop_id" UUID NOT NULL,
    "max_capacity" INTEGER,

    CONSTRAINT "workshop_sectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."workshops" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" BIGINT,
    "province" BIGINT,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "type" "public"."workshop_type" NOT NULL DEFAULT 'interno',
    "provider_name" TEXT,
    "provider_phone" TEXT,
    "provider_email" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "company_id" UUID NOT NULL,

    CONSTRAINT "workshops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storage"."buckets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "owner" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "public" BOOLEAN DEFAULT false,
    "avif_autodetection" BOOLEAN DEFAULT false,
    "file_size_limit" BIGINT,
    "allowed_mime_types" TEXT[],
    "owner_id" TEXT,
    "type" "storage"."buckettype" NOT NULL DEFAULT 'STANDARD',

    CONSTRAINT "buckets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storage"."buckets_analytics" (
    "name" TEXT NOT NULL,
    "type" "storage"."buckettype" NOT NULL DEFAULT 'ANALYTICS',
    "format" TEXT NOT NULL DEFAULT 'ICEBERG',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "buckets_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storage"."buckets_vectors" (
    "id" TEXT NOT NULL,
    "type" "storage"."buckettype" NOT NULL DEFAULT 'VECTOR',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "buckets_vectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storage"."migrations" (
    "id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "hash" VARCHAR(40) NOT NULL,
    "executed_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "migrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storage"."objects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "bucket_id" TEXT,
    "name" TEXT,
    "owner" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "last_accessed_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "path_tokens" TEXT[] DEFAULT string_to_array(name, '/'::text),
    "version" TEXT,
    "owner_id" TEXT,
    "user_metadata" JSONB,

    CONSTRAINT "objects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storage"."s3_multipart_uploads" (
    "id" TEXT NOT NULL,
    "in_progress_size" BIGINT NOT NULL DEFAULT 0,
    "upload_signature" TEXT NOT NULL,
    "bucket_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "owner_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_metadata" JSONB,

    CONSTRAINT "s3_multipart_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storage"."s3_multipart_uploads_parts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "upload_id" TEXT NOT NULL,
    "size" BIGINT NOT NULL DEFAULT 0,
    "part_number" INTEGER NOT NULL,
    "bucket_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "etag" TEXT NOT NULL,
    "owner_id" TEXT,
    "version" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "s3_multipart_uploads_parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storage"."vector_indexes" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "bucket_id" TEXT NOT NULL,
    "data_type" TEXT NOT NULL,
    "dimension" INTEGER NOT NULL,
    "distance_metric" TEXT NOT NULL,
    "metadata_configuration" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vector_indexes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_instance_id_idx" ON "auth"."audit_log_entries"("instance_id" ASC);

-- CreateIndex
CREATE INDEX "custom_oauth_providers_created_at_idx" ON "auth"."custom_oauth_providers"("created_at" ASC);

-- CreateIndex
CREATE INDEX "custom_oauth_providers_enabled_idx" ON "auth"."custom_oauth_providers"("enabled" ASC);

-- CreateIndex
CREATE INDEX "custom_oauth_providers_identifier_idx" ON "auth"."custom_oauth_providers"("identifier" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "custom_oauth_providers_identifier_key" ON "auth"."custom_oauth_providers"("identifier" ASC);

-- CreateIndex
CREATE INDEX "custom_oauth_providers_provider_type_idx" ON "auth"."custom_oauth_providers"("provider_type" ASC);

-- CreateIndex
CREATE INDEX "flow_state_created_at_idx" ON "auth"."flow_state"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_auth_code" ON "auth"."flow_state"("auth_code" ASC);

-- CreateIndex
CREATE INDEX "idx_user_id_auth_method" ON "auth"."flow_state"("user_id" ASC, "authentication_method" ASC);

-- CreateIndex
CREATE INDEX "identities_email_idx" ON "auth"."identities"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "identities_provider_id_provider_unique" ON "auth"."identities"("provider_id" ASC, "provider" ASC);

-- CreateIndex
CREATE INDEX "identities_user_id_idx" ON "auth"."identities"("user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "mfa_amr_claims_session_id_authentication_method_pkey" ON "auth"."mfa_amr_claims"("session_id" ASC, "authentication_method" ASC);

-- CreateIndex
CREATE INDEX "mfa_challenge_created_at_idx" ON "auth"."mfa_challenges"("created_at" DESC);

-- CreateIndex
CREATE INDEX "factor_id_created_at_idx" ON "auth"."mfa_factors"("user_id" ASC, "created_at" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "mfa_factors_last_challenged_at_key" ON "auth"."mfa_factors"("last_challenged_at" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "mfa_factors_user_friendly_name_unique" ON "auth"."mfa_factors"("friendly_name" ASC, "user_id" ASC) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);

-- CreateIndex
CREATE INDEX "mfa_factors_user_id_idx" ON "auth"."mfa_factors"("user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "unique_phone_factor_per_user" ON "auth"."mfa_factors"("user_id" ASC, "phone" ASC);

-- CreateIndex
CREATE INDEX "oauth_auth_pending_exp_idx" ON "auth"."oauth_authorizations"("expires_at" ASC) WHERE (status = 'pending'::auth.oauth_authorization_status);

-- CreateIndex
CREATE UNIQUE INDEX "oauth_authorizations_authorization_code_key" ON "auth"."oauth_authorizations"("authorization_code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "oauth_authorizations_authorization_id_key" ON "auth"."oauth_authorizations"("authorization_id" ASC);

-- CreateIndex
CREATE INDEX "idx_oauth_client_states_created_at" ON "auth"."oauth_client_states"("created_at" ASC);

-- CreateIndex
CREATE INDEX "oauth_clients_deleted_at_idx" ON "auth"."oauth_clients"("deleted_at" ASC);

-- CreateIndex
CREATE INDEX "oauth_consents_active_client_idx" ON "auth"."oauth_consents"("client_id" ASC) WHERE (revoked_at IS NULL);

-- CreateIndex
CREATE INDEX "oauth_consents_active_user_client_idx" ON "auth"."oauth_consents"("user_id" ASC, "client_id" ASC) WHERE (revoked_at IS NULL);

-- CreateIndex
CREATE UNIQUE INDEX "oauth_consents_user_client_unique" ON "auth"."oauth_consents"("user_id" ASC, "client_id" ASC);

-- CreateIndex
CREATE INDEX "oauth_consents_user_order_idx" ON "auth"."oauth_consents"("user_id" ASC, "granted_at" DESC);

-- CreateIndex
CREATE INDEX "one_time_tokens_relates_to_hash_idx" ON "auth"."one_time_tokens" USING HASH ("relates_to" ASC);

-- CreateIndex
CREATE INDEX "one_time_tokens_token_hash_hash_idx" ON "auth"."one_time_tokens" USING HASH ("token_hash" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "one_time_tokens_user_id_token_type_key" ON "auth"."one_time_tokens"("user_id" ASC, "token_type" ASC);

-- CreateIndex
CREATE INDEX "refresh_tokens_instance_id_idx" ON "auth"."refresh_tokens"("instance_id" ASC);

-- CreateIndex
CREATE INDEX "refresh_tokens_instance_id_user_id_idx" ON "auth"."refresh_tokens"("instance_id" ASC, "user_id" ASC);

-- CreateIndex
CREATE INDEX "refresh_tokens_parent_idx" ON "auth"."refresh_tokens"("parent" ASC);

-- CreateIndex
CREATE INDEX "refresh_tokens_session_id_revoked_idx" ON "auth"."refresh_tokens"("session_id" ASC, "revoked" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_unique" ON "auth"."refresh_tokens"("token" ASC);

-- CreateIndex
CREATE INDEX "refresh_tokens_updated_at_idx" ON "auth"."refresh_tokens"("updated_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "saml_providers_entity_id_key" ON "auth"."saml_providers"("entity_id" ASC);

-- CreateIndex
CREATE INDEX "saml_providers_sso_provider_id_idx" ON "auth"."saml_providers"("sso_provider_id" ASC);

-- CreateIndex
CREATE INDEX "saml_relay_states_created_at_idx" ON "auth"."saml_relay_states"("created_at" DESC);

-- CreateIndex
CREATE INDEX "saml_relay_states_for_email_idx" ON "auth"."saml_relay_states"("for_email" ASC);

-- CreateIndex
CREATE INDEX "saml_relay_states_sso_provider_id_idx" ON "auth"."saml_relay_states"("sso_provider_id" ASC);

-- CreateIndex
CREATE INDEX "sessions_not_after_idx" ON "auth"."sessions"("not_after" DESC);

-- CreateIndex
CREATE INDEX "sessions_oauth_client_id_idx" ON "auth"."sessions"("oauth_client_id" ASC);

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "auth"."sessions"("user_id" ASC);

-- CreateIndex
CREATE INDEX "user_id_created_at_idx" ON "auth"."sessions"("user_id" ASC, "created_at" ASC);

-- CreateIndex
CREATE INDEX "sso_domains_sso_provider_id_idx" ON "auth"."sso_domains"("sso_provider_id" ASC);

-- CreateIndex
CREATE INDEX "sso_providers_resource_id_pattern_idx" ON "auth"."sso_providers"("resource_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "confirmation_token_idx" ON "auth"."users"("confirmation_token" ASC) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);

-- CreateIndex
CREATE UNIQUE INDEX "email_change_token_current_idx" ON "auth"."users"("email_change_token_current" ASC) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);

-- CreateIndex
CREATE UNIQUE INDEX "email_change_token_new_idx" ON "auth"."users"("email_change_token_new" ASC) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);

-- CreateIndex
CREATE UNIQUE INDEX "reauthentication_token_idx" ON "auth"."users"("reauthentication_token" ASC) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);

-- CreateIndex
CREATE UNIQUE INDEX "recovery_token_idx" ON "auth"."users"("recovery_token" ASC) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_partial_key" ON "auth"."users"("email" ASC) WHERE (is_sso_user = false);

-- CreateIndex
CREATE INDEX "users_instance_id_idx" ON "auth"."users"("instance_id" ASC);

-- CreateIndex
CREATE INDEX "users_is_anonymous_idx" ON "auth"."users"("is_anonymous" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "auth"."users"("phone" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "actions_slug_key" ON "public"."actions"("slug" ASC);

-- CreateIndex
CREATE INDEX "idx_aptitudes_tecnicas_puestos_puesto_id" ON "public"."aptitudes_tecnicas_puestos"("puesto_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "area_province_id_key" ON "public"."area_province"("id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "brand_vehicles_name_key" ON "public"."brand_vehicles"("name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "category_employee_created_at_key" ON "public"."category_employee"("created_at" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "checklist_answer_repairs_checklist_answer_id_repair_solicit_key" ON "public"."checklist_answer_repairs"("checklist_answer_id" ASC, "repair_solicitud_id" ASC, "item_code" ASC);

-- CreateIndex
CREATE INDEX "idx_checklist_answer_repairs_answer" ON "public"."checklist_answer_repairs"("checklist_answer_id" ASC);

-- CreateIndex
CREATE INDEX "idx_checklist_answer_repairs_repair" ON "public"."checklist_answer_repairs"("repair_solicitud_id" ASC);

-- CreateIndex
CREATE INDEX "idx_checklist_answers_created" ON "public"."checklist_answers"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_checklist_answers_equipment" ON "public"."checklist_answers"("equipment_id" ASC);

-- CreateIndex
CREATE INDEX "idx_checklist_answers_template" ON "public"."checklist_answers"("template_id" ASC);

-- CreateIndex
CREATE INDEX "idx_checklist_deviations_checklist_answer_id" ON "public"."checklist_deviations"("checklist_answer_id" ASC);

-- CreateIndex
CREATE INDEX "idx_checklist_deviations_equipment_id" ON "public"."checklist_deviations"("equipment_id" ASC);

-- CreateIndex
CREATE INDEX "idx_checklist_deviations_pending" ON "public"."checklist_deviations"("equipment_id" ASC) WHERE (equipment_id IS NOT NULL);

-- CreateIndex
CREATE UNIQUE INDEX "checklist_items_section_id_code_key" ON "public"."checklist_items"("section_id" ASC, "code" ASC);

-- CreateIndex
CREATE INDEX "idx_checklist_items_code" ON "public"."checklist_items"("code" ASC);

-- CreateIndex
CREATE INDEX "idx_checklist_items_section" ON "public"."checklist_items"("section_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "checklist_sections_code_key" ON "public"."checklist_sections"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "checklist_template_items_template_id_section_id_code_key" ON "public"."checklist_template_items"("template_id" ASC, "section_id" ASC, "code" ASC);

-- CreateIndex
CREATE INDEX "idx_checklist_template_items_section" ON "public"."checklist_template_items"("section_id" ASC);

-- CreateIndex
CREATE INDEX "idx_checklist_template_items_template" ON "public"."checklist_template_items"("template_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "checklist_template_sections_template_id_code_key" ON "public"."checklist_template_sections"("template_id" ASC, "code" ASC);

-- CreateIndex
CREATE INDEX "idx_checklist_template_sections_template" ON "public"."checklist_template_sections"("template_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "checklist_template_sub_types_template_id_sub_type_id_key" ON "public"."checklist_template_sub_types"("template_id" ASC, "sub_type_id" ASC);

-- CreateIndex
CREATE INDEX "idx_checklist_template_sub_types_sub_type" ON "public"."checklist_template_sub_types"("sub_type_id" ASC);

-- CreateIndex
CREATE INDEX "idx_checklist_template_sub_types_template" ON "public"."checklist_template_sub_types"("template_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "checklist_template_types_template_id_type_id_key" ON "public"."checklist_template_types"("template_id" ASC, "type_id" ASC);

-- CreateIndex
CREATE INDEX "idx_checklist_template_types_template" ON "public"."checklist_template_types"("template_id" ASC);

-- CreateIndex
CREATE INDEX "idx_checklist_template_types_type" ON "public"."checklist_template_types"("type_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "checklist_templates_company_id_code_key" ON "public"."checklist_templates"("company_id" ASC, "code" ASC);

-- CreateIndex
CREATE INDEX "idx_checklist_templates_code" ON "public"."checklist_templates"("code" ASC);

-- CreateIndex
CREATE INDEX "idx_checklist_templates_company" ON "public"."checklist_templates"("company_id" ASC);

-- CreateIndex
CREATE INDEX "cities_province_id_idx" ON "public"."cities"("province_id" ASC);

-- CreateIndex
CREATE INDEX "companies_employees_company_id_idx" ON "public"."companies_employees"("company_id" ASC);

-- CreateIndex
CREATE INDEX "companies_employees_employee_id_idx" ON "public"."companies_employees"("employee_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "company_compay_cuit_key" ON "public"."company"("company_cuit" ASC);

-- CreateIndex
CREATE INDEX "company_owner_id_idx" ON "public"."company"("owner_id" ASC);

-- CreateIndex
CREATE INDEX "contractor_employee_employee_id_idx" ON "public"."contractor_employee"("employee_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "unique_contractor_employee" ON "public"."contractor_employee"("employee_id" ASC, "contractor_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "contractor_equipment_employee_id_contractor_id_key" ON "public"."contractor_equipment"("equipment_id" ASC, "contractor_id" ASC);

-- CreateIndex
CREATE INDEX "contractor_equipment_equipment_id_idx" ON "public"."contractor_equipment"("equipment_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "contractor_other_equipment_equipment_id_contractor_id_key" ON "public"."contractor_other_equipment"("equipment_id" ASC, "contractor_id" ASC);

-- CreateIndex
CREATE INDEX "idx_contractor_other_equipment_contractor" ON "public"."contractor_other_equipment"("contractor_id" ASC);

-- CreateIndex
CREATE INDEX "idx_contractor_other_equipment_equipment" ON "public"."contractor_other_equipment"("equipment_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "cost_center_name_key" ON "public"."cost_center"("name" ASC);

-- CreateIndex
CREATE INDEX "customers_company_id_idx" ON "public"."customers"("company_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "customers_cuit_key" ON "public"."customers"("cuit" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "daily_indicators_company_id_snapshot_date_source_uidx" ON "public"."daily_indicators"("company_id" ASC, "snapshot_date" ASC, "source" ASC);

-- CreateIndex
CREATE INDEX "idx_kpi_daily_indicators_company_date" ON "public"."daily_indicators"("company_id" ASC, "snapshot_date" ASC);

-- CreateIndex
CREATE INDEX "idx_kpi_daily_indicators_source" ON "public"."daily_indicators"("source" ASC);

-- CreateIndex
CREATE INDEX "dailyreport_date_idx" ON "public"."dailyreport"("date" ASC);

-- CreateIndex
CREATE INDEX "dailyreport_customer_equipment_relation_daily_report_row_id_idx" ON "public"."dailyreport_customer_equipment_relations"("daily_report_row_id" ASC);

-- CreateIndex
CREATE INDEX "idx_dailyreportemployeerelations_row_id" ON "public"."dailyreportemployeerelations"("daily_report_row_id" ASC);

-- CreateIndex
CREATE INDEX "idx_daily_equip_rel_other_equipment" ON "public"."dailyreportequipmentrelations"("other_equipment_id" ASC) WHERE (other_equipment_id IS NOT NULL);

-- CreateIndex
CREATE INDEX "idx_dailyreportequipmentrelations_row_id" ON "public"."dailyreportequipmentrelations"("daily_report_row_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "dailyreportrows_preparte_id_key" ON "public"."dailyreportrows"("preparte_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "dailyreportrows_remit_number_key" ON "public"."dailyreportrows"("remit_number" ASC);

-- CreateIndex
CREATE INDEX "idx_dailyreportrows_daily_report_id" ON "public"."dailyreportrows"("daily_report_id" ASC);

-- CreateIndex
CREATE INDEX "idx_dailyreportrows_history_related" ON "public"."dailyreportrows_history"("related_table" ASC, "related_id" ASC) WHERE (related_table IS NOT NULL);

-- CreateIndex
CREATE INDEX "idx_dailyreportrows_history_row_id" ON "public"."dailyreportrows_history"("daily_report_row_id" ASC);

-- CreateIndex
CREATE INDEX "document_types_is_active_idx" ON "public"."document_types"("is_active" ASC);

-- CreateIndex
CREATE INDEX "document_types_is_it_montlhy_idx" ON "public"."document_types"("is_it_montlhy" ASC);

-- CreateIndex
CREATE INDEX "idx_document_types_equipment_type" ON "public"."document_types"("equipment_type" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "documents_company_document_path_key" ON "public"."documents_company"("document_path" ASC);

-- CreateIndex
CREATE INDEX "idx_documents_contract_id" ON "public"."documents_contracts"("contract_id" ASC);

-- CreateIndex
CREATE INDEX "idx_documents_name" ON "public"."documents_contracts"("name" ASC);

-- CreateIndex
CREATE INDEX "idx_documents_type" ON "public"."documents_contracts"("type" ASC);

-- CreateIndex
CREATE INDEX "documents_employees_applies_idx" ON "public"."documents_employees"("applies" ASC);

-- CreateIndex
CREATE INDEX "documents_employees_created_at_idx" ON "public"."documents_employees"("created_at" ASC);

-- CreateIndex
CREATE INDEX "documents_employees_id_document_types_idx" ON "public"."documents_employees"("id_document_types" ASC);

-- CreateIndex
CREATE INDEX "documents_employees_validity_idx" ON "public"."documents_employees"("validity" ASC);

-- CreateIndex
CREATE INDEX "documents_employees_logs_documents_employees_id_idx" ON "public"."documents_employees_logs"("documents_employees_id" ASC);

-- CreateIndex
CREATE INDEX "documents_equipment_created_at_idx" ON "public"."documents_equipment"("created_at" ASC);

-- CreateIndex
CREATE INDEX "documents_equipment_id_document_types_idx" ON "public"."documents_equipment"("id_document_types" ASC);

-- CreateIndex
CREATE INDEX "documents_equipment_logs_documents_equipment_id_idx" ON "public"."documents_equipment_logs"("documents_equipment_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "empleado_aptitudes_empleado_id_aptitud_id_key" ON "public"."empleado_aptitudes"("empleado_id" ASC, "aptitud_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "companies_employees_cuil_key" ON "public"."employees"("cuil" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "companies_employees_document_number_key" ON "public"."employees"("document_number" ASC);

-- CreateIndex
CREATE INDEX "employees_is_active_idx" ON "public"."employees"("is_active" ASC);

-- CreateIndex
CREATE INDEX "employees_lastname_idx" ON "public"."employees"("lastname" ASC);

-- CreateIndex
CREATE INDEX "idx_employees_type_of_contract" ON "public"."employees"("type_of_contract" ASC);

-- CreateIndex
CREATE INDEX "idx_employees_workshop_sector_id" ON "public"."employees"("workshop_sector_id" ASC);

-- CreateIndex
CREATE INDEX "employees_diagram_employee_id_idx" ON "public"."employees_diagram"("employee_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "unique_employee_year_month_day" ON "public"."employees_diagram"("employee_id" ASC, "year" ASC, "month" ASC, "day" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "equipment_owner_contract_type_equipment_owner_id_contract_t_key" ON "public"."equipment_owner_contract_types"("equipment_owner_id" ASC, "contract_type" ASC);

-- CreateIndex
CREATE INDEX "idx_equipment_owner_contract_types_owner" ON "public"."equipment_owner_contract_types"("equipment_owner_id" ASC);

-- CreateIndex
CREATE INDEX "equipos_clientes_customer_id_idx" ON "public"."equipos_clientes"("customer_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "industry_type_type_key" ON "public"."industry_type"("name" ASC);

-- CreateIndex
CREATE INDEX "idx_kpi_revisions_changed_by" ON "public"."kpi_revisions"("changed_by" ASC);

-- CreateIndex
CREATE INDEX "idx_kpi_revisions_is_active" ON "public"."kpi_revisions"("is_active" ASC);

-- CreateIndex
CREATE INDEX "idx_kpi_revisions_kpi_id" ON "public"."kpi_revisions"("kpi_id" ASC);

-- CreateIndex
CREATE INDEX "idx_kpis_company_id" ON "public"."kpis"("company_id" ASC);

-- CreateIndex
CREATE INDEX "idx_kpis_is_active" ON "public"."kpis"("is_active" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "kpis_company_id_code_key" ON "public"."kpis"("company_id" ASC, "code" ASC);

-- CreateIndex
CREATE INDEX "idx_activity_log_order" ON "public"."maintenance_activity_log"("maintenance_order_id" ASC) WHERE (maintenance_order_id IS NOT NULL);

-- CreateIndex
CREATE INDEX "idx_activity_log_performed_at" ON "public"."maintenance_activity_log"("performed_at" DESC);

-- CreateIndex
CREATE INDEX "idx_activity_log_request" ON "public"."maintenance_activity_log"("maintenance_request_id" ASC) WHERE (maintenance_request_id IS NOT NULL);

-- CreateIndex
CREATE INDEX "idx_activity_log_work_order" ON "public"."maintenance_activity_log"("work_order_id" ASC) WHERE (work_order_id IS NOT NULL);

-- CreateIndex
CREATE INDEX "idx_moi_repair_types_item" ON "public"."maintenance_order_item_repair_types"("maintenance_order_item_id" ASC);

-- CreateIndex
CREATE INDEX "idx_moi_repair_types_type" ON "public"."maintenance_order_item_repair_types"("repair_type_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_order_item_repair_maintenance_order_item_id_rep_key" ON "public"."maintenance_order_item_repair_types"("maintenance_order_item_id" ASC, "repair_type_id" ASC);

-- CreateIndex
CREATE INDEX "idx_maintenance_order_items_order" ON "public"."maintenance_order_items"("maintenance_order_id" ASC);

-- CreateIndex
CREATE INDEX "idx_maintenance_order_items_request_item" ON "public"."maintenance_order_items"("maintenance_request_item_id" ASC);

-- CreateIndex
CREATE INDEX "idx_moi_assigned_sector" ON "public"."maintenance_order_items"("assigned_sector_id" ASC);

-- CreateIndex
CREATE INDEX "idx_moi_assigned_workshop" ON "public"."maintenance_order_items"("assigned_workshop_id" ASC);

-- CreateIndex
CREATE INDEX "idx_moi_planned_dates" ON "public"."maintenance_order_items"("planned_start_date" ASC, "planned_end_date" ASC);

-- CreateIndex
CREATE INDEX "idx_moi_work_order" ON "public"."maintenance_order_items"("work_order_id" ASC);

-- CreateIndex
CREATE INDEX "idx_maintenance_orders_equipment" ON "public"."maintenance_orders"("equipment_id" ASC);

-- CreateIndex
CREATE INDEX "idx_maintenance_orders_order_number" ON "public"."maintenance_orders"("order_number" ASC);

-- CreateIndex
CREATE INDEX "idx_maintenance_orders_request" ON "public"."maintenance_orders"("maintenance_request_id" ASC);

-- CreateIndex
CREATE INDEX "idx_maintenance_orders_scheduled_date" ON "public"."maintenance_orders"("scheduled_date" ASC);

-- CreateIndex
CREATE INDEX "idx_maintenance_orders_status" ON "public"."maintenance_orders"("status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_request_groups_name_key" ON "public"."maintenance_request_groups"("name" ASC);

-- CreateIndex
CREATE INDEX "idx_maintenance_request_items_deviation" ON "public"."maintenance_request_items"("checklist_deviation_id" ASC);

-- CreateIndex
CREATE INDEX "idx_maintenance_request_items_request" ON "public"."maintenance_request_items"("maintenance_request_id" ASC);

-- CreateIndex
CREATE INDEX "idx_maintenance_request_items_status" ON "public"."maintenance_request_items"("status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_request_items_maintenance_request_id_checklist__key" ON "public"."maintenance_request_items"("maintenance_request_id" ASC, "checklist_deviation_id" ASC);

-- CreateIndex
CREATE INDEX "idx_maintenance_requests_checklist" ON "public"."maintenance_requests"("checklist_answer_id" ASC);

-- CreateIndex
CREATE INDEX "idx_maintenance_requests_equipment" ON "public"."maintenance_requests"("equipment_id" ASC);

-- CreateIndex
CREATE INDEX "idx_maintenance_requests_status" ON "public"."maintenance_requests"("status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "modules_slug_key" ON "public"."modules"("slug" ASC);

-- CreateIndex
CREATE INDEX "idx_other_equipment_company_id" ON "public"."other_equipment"("company_id" ASC);

-- CreateIndex
CREATE INDEX "idx_other_equipment_is_active" ON "public"."other_equipment"("is_active" ASC);

-- CreateIndex
CREATE INDEX "idx_other_equipment_linked_vehicle" ON "public"."other_equipment"("linked_vehicle_id" ASC);

-- CreateIndex
CREATE INDEX "idx_other_equipment_type_id" ON "public"."other_equipment"("type_id" ASC);

-- CreateIndex
CREATE INDEX "idx_other_equipment_certifications_equipment" ON "public"."other_equipment_certifications"("equipment_id" ASC);

-- CreateIndex
CREATE INDEX "idx_password_reset_tokens_active" ON "public"."password_reset_tokens"("profile_id" ASC, "used" ASC) WHERE (NOT used);

-- CreateIndex
CREATE INDEX "idx_password_reset_tokens_expires" ON "public"."password_reset_tokens"("expires" ASC);

-- CreateIndex
CREATE INDEX "idx_password_reset_tokens_token" ON "public"."password_reset_tokens"("token" ASC);

-- CreateIndex
CREATE INDEX "idx_preparte_cliente" ON "public"."preparte"("cliente_id" ASC);

-- CreateIndex
CREATE INDEX "idx_preparte_cliente_id" ON "public"."preparte"("cliente_id" ASC);

-- CreateIndex
CREATE INDEX "idx_preparte_contrato_id" ON "public"."preparte"("contrato_id" ASC);

-- CreateIndex
CREATE INDEX "idx_preparte_created_at" ON "public"."preparte"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_preparte_fecha_ejecucion" ON "public"."preparte"("executionDate" ASC);

-- CreateIndex
CREATE INDEX "idx_preparte_numero_pedido" ON "public"."preparte"("numero_pedido" ASC);

-- CreateIndex
CREATE INDEX "idx_preparte_status" ON "public"."preparte"("status" ASC);

-- CreateIndex
CREATE INDEX "preparte_created_at_idx" ON "public"."preparte"("created_at" ASC);

-- CreateIndex
CREATE INDEX "idx_preparte_change_logs_changed_at" ON "public"."preparte_change_logs"("changed_at" DESC);

-- CreateIndex
CREATE INDEX "idx_preparte_change_logs_changed_by" ON "public"."preparte_change_logs"("changed_by" ASC);

-- CreateIndex
CREATE INDEX "idx_preparte_change_logs_field_name" ON "public"."preparte_change_logs"("field_name" ASC);

-- CreateIndex
CREATE INDEX "idx_preparte_change_logs_preparte_id" ON "public"."preparte_change_logs"("preparte_id" ASC);

-- CreateIndex
CREATE INDEX "idx_profile_employee_id" ON "public"."profile"("employee_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "profile_credentialId_key" ON "public"."profile"("credential_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "profile_email_key" ON "public"."profile"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "provinces_id_key" ON "public"."provinces"("id" ASC);

-- CreateIndex
CREATE INDEX "idx_remito_documents_remit_id" ON "public"."remito_documents"("remit_id" ASC);

-- CreateIndex
CREATE INDEX "idx_remitos_daily_report_row_id" ON "public"."remitos"("daily_report_row_id" ASC);

-- CreateIndex
CREATE INDEX "idx_remitos_is_linked" ON "public"."remitos"("is_linked" ASC);

-- CreateIndex
CREATE INDEX "repair_solicitudes_created_at_idx" ON "public"."repair_solicitudes"("created_at" ASC);

-- CreateIndex
CREATE INDEX "repairlogs_repair_id_idx" ON "public"."repairlogs"("repair_id" ASC);

-- CreateIndex
CREATE INDEX "idx_role_permissions_role_id" ON "public"."role_permissions"("role_id" ASC);

-- CreateIndex
CREATE INDEX "idx_role_permissions_tab_id" ON "public"."role_permissions"("tab_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_id_tab_id_action_id_key" ON "public"."role_permissions"("role_id" ASC, "tab_id" ASC, "action_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "public"."roles"("name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "roles_slug_key" ON "public"."roles"("slug" ASC);

-- CreateIndex
CREATE INDEX "sector_customer_customer_id_idx" ON "public"."sector_customer"("customer_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sector_customer_sector_id_customer_id_key" ON "public"."sector_customer"("sector_id" ASC, "customer_id" ASC);

-- CreateIndex
CREATE INDEX "idx_sector_repair_types_repair" ON "public"."sector_repair_types"("repair_type_id" ASC);

-- CreateIndex
CREATE INDEX "idx_sector_repair_types_sector" ON "public"."sector_repair_types"("workshop_sector_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sector_repair_types_workshop_sector_id_repair_type_id_key" ON "public"."sector_repair_types"("workshop_sector_id" ASC, "repair_type_id" ASC);

-- CreateIndex
CREATE INDEX "idx_service_areas_area_id" ON "public"."service_areas"("area_id" ASC);

-- CreateIndex
CREATE INDEX "idx_service_areas_service_area" ON "public"."service_areas"("service_id" ASC, "area_id" ASC);

-- CreateIndex
CREATE INDEX "idx_service_areas_service_id" ON "public"."service_areas"("service_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "service_areas_id_key" ON "public"."service_areas"("id" ASC);

-- CreateIndex
CREATE INDEX "service_areas_service_id_idx" ON "public"."service_areas"("service_id" ASC);

-- CreateIndex
CREATE INDEX "service_items_customer_service_id_idx" ON "public"."service_items"("customer_service_id" ASC);

-- CreateIndex
CREATE INDEX "idx_service_sectors_sector_id" ON "public"."service_sectors"("sector_id" ASC);

-- CreateIndex
CREATE INDEX "idx_service_sectors_service_id" ON "public"."service_sectors"("service_id" ASC);

-- CreateIndex
CREATE INDEX "idx_service_sectors_service_sector" ON "public"."service_sectors"("service_id" ASC, "sector_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "service_sectors_unique" ON "public"."service_sectors"("service_id" ASC, "sector_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "share_company_users_id2_key" ON "public"."share_company_users"("id" ASC);

-- CreateIndex
CREATE INDEX "share_company_users_profile_id_idx" ON "public"."share_company_users"("profile_id" ASC);

-- CreateIndex
CREATE INDEX "idx_sub_type_compatible_items_compatible_item_id" ON "public"."sub_type_compatible_items"("compatible_item_id" ASC);

-- CreateIndex
CREATE INDEX "idx_sub_type_compatible_items_sub_type_id" ON "public"."sub_type_compatible_items"("sub_type_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sub_type_compatible_items_unique" ON "public"."sub_type_compatible_items"("sub_type_id" ASC, "compatible_item_id" ASC, "item_type" ASC);

-- CreateIndex
CREATE INDEX "idx_tabs_module_id" ON "public"."tabs"("module_id" ASC);

-- CreateIndex
CREATE INDEX "idx_tabs_parent_tab_id" ON "public"."tabs"("parent_tab_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "tabs_module_id_slug_key" ON "public"."tabs"("module_id" ASC, "slug" ASC);

-- CreateIndex
CREATE INDEX "idx_type_applies_to" ON "public"."type"("applies_to" ASC);

-- CreateIndex
CREATE INDEX "idx_type_hitch_types_compatible_type_id" ON "public"."type_hitch_types"("compatible_type_id" ASC);

-- CreateIndex
CREATE INDEX "idx_type_hitch_types_type_id" ON "public"."type_hitch_types"("type_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "type_hitch_types_type_id_compatible_type_id_key" ON "public"."type_hitch_types"("type_id" ASC, "compatible_type_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "type_operative_name_key" ON "public"."type_operative"("name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "types_of_contract_name_key" ON "public"."types_of_contract"("name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "types_of_repairs_id-2_key" ON "public"."types_of_repairs"("id" ASC);

-- CreateIndex
CREATE INDEX "idx_user_permissions_tab_id" ON "public"."user_permissions"("tab_id" ASC);

-- CreateIndex
CREATE INDEX "idx_user_permissions_user_id" ON "public"."user_permissions"("user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "user_permissions_user_id_tab_id_action_id_key" ON "public"."user_permissions"("user_id" ASC, "tab_id" ASC, "action_id" ASC);

-- CreateIndex
CREATE INDEX "idx_user_roles_role_id" ON "public"."user_roles"("role_id" ASC);

-- CreateIndex
CREATE INDEX "idx_user_roles_user_id" ON "public"."user_roles"("user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_id_key" ON "public"."user_roles"("user_id" ASC, "role_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_domain_key" ON "public"."vehicles"("domain" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_id2_key" ON "public"."vehicles"("id" ASC);

-- CreateIndex
CREATE INDEX "vehicles_is_active_idx" ON "public"."vehicles"("is_active" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "work_diagram_active_novelties_unique" ON "public"."work_diagram_active_novelties"("work_diagram_id" ASC, "diagram_type_id" ASC);

-- CreateIndex
CREATE INDEX "idx_work_order_item_repairs_status" ON "public"."work_order_item_repairs"("status" ASC);

-- CreateIndex
CREATE INDEX "idx_work_order_item_repairs_work_order_item_id" ON "public"."work_order_item_repairs"("work_order_item_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "unique_work_order_item_repair" ON "public"."work_order_item_repairs"("work_order_item_id" ASC, "repair_type_id" ASC);

-- CreateIndex
CREATE INDEX "idx_work_order_items_maintenance_item" ON "public"."work_order_items"("maintenance_order_item_id" ASC);

-- CreateIndex
CREATE INDEX "idx_work_order_items_status" ON "public"."work_order_items"("status" ASC);

-- CreateIndex
CREATE INDEX "idx_work_order_items_work_order" ON "public"."work_order_items"("work_order_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "unique_maintenance_item_per_active_work_order" ON "public"."work_order_items"("maintenance_order_item_id" ASC, "work_order_id" ASC);

-- CreateIndex
CREATE INDEX "idx_work_orders_company" ON "public"."work_orders"("company_id" ASC);

-- CreateIndex
CREATE INDEX "idx_work_orders_dates" ON "public"."work_orders"("planned_start_date" ASC, "planned_end_date" ASC);

-- CreateIndex
CREATE INDEX "idx_work_orders_equipment" ON "public"."work_orders"("equipment_id" ASC);

-- CreateIndex
CREATE INDEX "idx_work_orders_sector" ON "public"."work_orders"("sector_id" ASC);

-- CreateIndex
CREATE INDEX "idx_work_orders_sequence" ON "public"."work_orders"("sequence_number" DESC);

-- CreateIndex
CREATE INDEX "idx_work_orders_status" ON "public"."work_orders"("status" ASC);

-- CreateIndex
CREATE INDEX "idx_work_orders_workshop" ON "public"."work_orders"("workshop_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "work_orders_order_number_key" ON "public"."work_orders"("order_number" ASC);

-- CreateIndex
CREATE INDEX "idx_workshop_sectors_is_active" ON "public"."workshop_sectors"("is_active" ASC);

-- CreateIndex
CREATE INDEX "idx_workshop_sectors_workshop_id" ON "public"."workshop_sectors"("workshop_id" ASC);

-- CreateIndex
CREATE INDEX "idx_workshops_company_id" ON "public"."workshops"("company_id" ASC);

-- CreateIndex
CREATE INDEX "idx_workshops_is_active" ON "public"."workshops"("is_active" ASC);

-- CreateIndex
CREATE INDEX "idx_workshops_type" ON "public"."workshops"("type" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "bname" ON "storage"."buckets"("name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "buckets_analytics_unique_name_idx" ON "storage"."buckets_analytics"("name" ASC) WHERE (deleted_at IS NULL);

-- CreateIndex
CREATE UNIQUE INDEX "migrations_name_key" ON "storage"."migrations"("name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "bucketid_objname" ON "storage"."objects"("bucket_id" ASC, "name" ASC);

-- CreateIndex
CREATE INDEX "idx_objects_bucket_id_name" ON "storage"."objects"("bucket_id" ASC, "name" ASC);

-- CreateIndex
CREATE INDEX "name_prefix_search" ON "storage"."objects"("name" ASC);

-- CreateIndex
CREATE INDEX "idx_multipart_uploads_list" ON "storage"."s3_multipart_uploads"("bucket_id" ASC, "key" ASC, "created_at" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "vector_indexes_name_bucket_id_idx" ON "storage"."vector_indexes"("name" ASC, "bucket_id" ASC);

-- AddForeignKey
ALTER TABLE "auth"."identities" ADD CONSTRAINT "identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth"."mfa_amr_claims" ADD CONSTRAINT "mfa_amr_claims_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "auth"."sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth"."mfa_challenges" ADD CONSTRAINT "mfa_challenges_auth_factor_id_fkey" FOREIGN KEY ("factor_id") REFERENCES "auth"."mfa_factors"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth"."mfa_factors" ADD CONSTRAINT "mfa_factors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth"."oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "auth"."oauth_clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth"."oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth"."oauth_consents" ADD CONSTRAINT "oauth_consents_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "auth"."oauth_clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth"."oauth_consents" ADD CONSTRAINT "oauth_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth"."one_time_tokens" ADD CONSTRAINT "one_time_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "auth"."sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth"."saml_providers" ADD CONSTRAINT "saml_providers_sso_provider_id_fkey" FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth"."saml_relay_states" ADD CONSTRAINT "saml_relay_states_flow_state_id_fkey" FOREIGN KEY ("flow_state_id") REFERENCES "auth"."flow_state"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth"."saml_relay_states" ADD CONSTRAINT "saml_relay_states_sso_provider_id_fkey" FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth"."sessions" ADD CONSTRAINT "sessions_oauth_client_id_fkey" FOREIGN KEY ("oauth_client_id") REFERENCES "auth"."oauth_clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth"."sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth"."sso_domains" ADD CONSTRAINT "sso_domains_sso_provider_id_fkey" FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."aptitudes_tecnicas_puestos" ADD CONSTRAINT "aptitudes_tecnicas_puestos_aptitud_id_fkey" FOREIGN KEY ("aptitud_id") REFERENCES "public"."aptitudes_tecnicas"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."aptitudes_tecnicas_puestos" ADD CONSTRAINT "aptitudes_tecnicas_puestos_puesto_id_fkey" FOREIGN KEY ("puesto_id") REFERENCES "public"."company_positions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."area_province" ADD CONSTRAINT "area_province_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "public"."areas_cliente"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."area_province" ADD CONSTRAINT "area_province_province_id_fkey" FOREIGN KEY ("province_id") REFERENCES "public"."provinces"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."areas_cliente" ADD CONSTRAINT "areas_cliente_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."assing_customer" ADD CONSTRAINT "public_assing_customer_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."assing_customer" ADD CONSTRAINT "public_assing_customer_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "public"."vehicles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."brand_vehicles" ADD CONSTRAINT "brand_vehicles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."category" ADD CONSTRAINT "category_covenant_id_fkey" FOREIGN KEY ("covenant_id") REFERENCES "public"."covenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."category_employee" ADD CONSTRAINT "public_covenant_category_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."category_employee" ADD CONSTRAINT "public_covenant_employee_emplyee_id_fkey" FOREIGN KEY ("emplyee_id") REFERENCES "public"."employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."checklist_answer_repairs" ADD CONSTRAINT "checklist_answer_repairs_checklist_answer_id_fkey" FOREIGN KEY ("checklist_answer_id") REFERENCES "public"."checklist_answers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."checklist_answer_repairs" ADD CONSTRAINT "checklist_answer_repairs_repair_solicitud_id_fkey" FOREIGN KEY ("repair_solicitud_id") REFERENCES "public"."repair_solicitudes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."checklist_answers" ADD CONSTRAINT "checklist_answers_chofer_employee_id_fkey" FOREIGN KEY ("chofer_employee_id") REFERENCES "public"."employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."checklist_answers" ADD CONSTRAINT "checklist_answers_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."checklist_answers" ADD CONSTRAINT "checklist_answers_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "public"."vehicles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."checklist_answers" ADD CONSTRAINT "checklist_answers_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."checklist_templates"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."checklist_answers" ADD CONSTRAINT "checklist_answers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."checklist_answers" ADD CONSTRAINT "checklist_answers_ut_checklist_answer_id_fkey" FOREIGN KEY ("ut_checklist_answer_id") REFERENCES "public"."checklist_answers"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."checklist_deviations" ADD CONSTRAINT "checklist_deviations_checklist_answer_id_fkey" FOREIGN KEY ("checklist_answer_id") REFERENCES "public"."checklist_answers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."checklist_deviations" ADD CONSTRAINT "checklist_deviations_created_by_employee_id_fkey" FOREIGN KEY ("created_by_employee_id") REFERENCES "public"."employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."checklist_deviations" ADD CONSTRAINT "checklist_deviations_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."checklist_deviations" ADD CONSTRAINT "checklist_deviations_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "public"."vehicles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."checklist_items" ADD CONSTRAINT "checklist_items_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."checklist_sections"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."checklist_template_items" ADD CONSTRAINT "checklist_template_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."checklist_items"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."checklist_template_items" ADD CONSTRAINT "checklist_template_items_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."checklist_template_sections"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."checklist_template_items" ADD CONSTRAINT "checklist_template_items_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."checklist_templates"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."checklist_template_sections" ADD CONSTRAINT "checklist_template_sections_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."checklist_sections"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."checklist_template_sections" ADD CONSTRAINT "checklist_template_sections_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."checklist_templates"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."checklist_template_sub_types" ADD CONSTRAINT "checklist_template_sub_types_sub_type_id_fkey" FOREIGN KEY ("sub_type_id") REFERENCES "public"."sub_type"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."checklist_template_sub_types" ADD CONSTRAINT "checklist_template_sub_types_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."checklist_templates"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."checklist_template_types" ADD CONSTRAINT "checklist_template_types_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."checklist_templates"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."checklist_template_types" ADD CONSTRAINT "checklist_template_types_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "public"."type"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."checklist_templates" ADD CONSTRAINT "checklist_templates_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."cities" ADD CONSTRAINT "cities_province_id_fkey" FOREIGN KEY ("province_id") REFERENCES "public"."provinces"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."companies_employees" ADD CONSTRAINT "companies_employees_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."companies_employees" ADD CONSTRAINT "companies_employees_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."company" ADD CONSTRAINT "company_city_fkey" FOREIGN KEY ("city") REFERENCES "public"."cities"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."company" ADD CONSTRAINT "company_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."company" ADD CONSTRAINT "company_province_id_fkey" FOREIGN KEY ("province_id") REFERENCES "public"."provinces"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."contacts" ADD CONSTRAINT "contacts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."contacts" ADD CONSTRAINT "public_contacts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."contractor_employee" ADD CONSTRAINT "contractor_employee_contractor_id_fkey" FOREIGN KEY ("contractor_id") REFERENCES "public"."customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."contractor_employee" ADD CONSTRAINT "contractor_employee_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."contractor_equipment" ADD CONSTRAINT "contractor_equipment_contractor_id_fkey" FOREIGN KEY ("contractor_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."contractor_equipment" ADD CONSTRAINT "contractor_equipment_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "public"."vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."contractor_other_equipment" ADD CONSTRAINT "contractor_other_equipment_contractor_id_fkey" FOREIGN KEY ("contractor_id") REFERENCES "public"."customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."contractor_other_equipment" ADD CONSTRAINT "contractor_other_equipment_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "public"."other_equipment"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."covenant" ADD CONSTRAINT "covenant_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."covenant" ADD CONSTRAINT "covenant_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "public"."guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."custom_form" ADD CONSTRAINT "custom_form_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."customer_services" ADD CONSTRAINT "customer_services_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."customer_services" ADD CONSTRAINT "public_customer_services_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."customer_services" ADD CONSTRAINT "public_customer_services_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."customers" ADD CONSTRAINT "customers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."daily_indicators" ADD CONSTRAINT "kpi_daily_indicators_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."dailyreport" ADD CONSTRAINT "public_dailyreport_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."dailyreport_customer_equipment_relations" ADD CONSTRAINT "dailyreport_customer_equipment_relat_customer_equipment_id_fkey" FOREIGN KEY ("customer_equipment_id") REFERENCES "public"."equipos_clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dailyreport_customer_equipment_relations" ADD CONSTRAINT "dailyreport_customer_equipment_relatio_daily_report_row_id_fkey" FOREIGN KEY ("daily_report_row_id") REFERENCES "public"."dailyreportrows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dailyreportemployeerelations" ADD CONSTRAINT "dailyreportemployeerelations_daily_report_row_id_fkey" FOREIGN KEY ("daily_report_row_id") REFERENCES "public"."dailyreportrows"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."dailyreportemployeerelations" ADD CONSTRAINT "dailyreportemployeerelations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."dailyreportequipmentrelations" ADD CONSTRAINT "dailyreportequipmentrelations_daily_report_row_id_fkey" FOREIGN KEY ("daily_report_row_id") REFERENCES "public"."dailyreportrows"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."dailyreportequipmentrelations" ADD CONSTRAINT "dailyreportequipmentrelations_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "public"."vehicles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."dailyreportequipmentrelations" ADD CONSTRAINT "dailyreportequipmentrelations_other_equipment_id_fkey" FOREIGN KEY ("other_equipment_id") REFERENCES "public"."other_equipment"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."dailyreportrows" ADD CONSTRAINT "dailyreportrows_areas_service_id_fkey" FOREIGN KEY ("areas_service_id") REFERENCES "public"."service_areas"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dailyreportrows" ADD CONSTRAINT "dailyreportrows_daily_report_id_fkey" FOREIGN KEY ("daily_report_id") REFERENCES "public"."dailyreport"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."dailyreportrows" ADD CONSTRAINT "dailyreportrows_preparte_id_fkey" FOREIGN KEY ("preparte_id") REFERENCES "public"."preparte"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dailyreportrows" ADD CONSTRAINT "dailyreportrows_sector_service_id_fkey" FOREIGN KEY ("sector_service_id") REFERENCES "public"."service_sectors"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dailyreportrows" ADD CONSTRAINT "dailyreportrows_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."customer_services"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dailyreportrows" ADD CONSTRAINT "public_dailyreportrows_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."dailyreportrows" ADD CONSTRAINT "public_dailyreportrows_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."service_items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."dailyreportrows_history" ADD CONSTRAINT "dailyreportrows_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."dailyreportrows_history" ADD CONSTRAINT "dailyreportrows_history_daily_report_row_id_fkey" FOREIGN KEY ("daily_report_row_id") REFERENCES "public"."dailyreportrows"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."diagram_type" ADD CONSTRAINT "public_diagram_type_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."diagrams_logs" ADD CONSTRAINT "diagrams_logs_diagram_id_fkey" FOREIGN KEY ("diagram_id") REFERENCES "public"."diagram_type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."diagrams_logs" ADD CONSTRAINT "diagrams_logs_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."diagrams_logs" ADD CONSTRAINT "diagrams_logs_modified_by_fkey" FOREIGN KEY ("modified_by") REFERENCES "public"."profile"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."document_types" ADD CONSTRAINT "document_types_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."documents_company" ADD CONSTRAINT "documents_company_applies_fkey" FOREIGN KEY ("applies") REFERENCES "public"."company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."documents_company" ADD CONSTRAINT "documents_company_id_document_types_fkey" FOREIGN KEY ("id_document_types") REFERENCES "public"."document_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."documents_company" ADD CONSTRAINT "documents_company_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."documents_employees" ADD CONSTRAINT "documents_employees_applies_fkey" FOREIGN KEY ("applies") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."documents_employees" ADD CONSTRAINT "documents_employees_id_document_types_fkey" FOREIGN KEY ("id_document_types") REFERENCES "public"."document_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."documents_employees" ADD CONSTRAINT "documents_employees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."documents_employees_logs" ADD CONSTRAINT "public_documents_employees_logs_documents_employees_id_fkey" FOREIGN KEY ("documents_employees_id") REFERENCES "public"."documents_employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."documents_equipment" ADD CONSTRAINT "documents_equipment_applies_fkey" FOREIGN KEY ("applies") REFERENCES "public"."vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."documents_equipment" ADD CONSTRAINT "documents_equipment_id_document_types_fkey" FOREIGN KEY ("id_document_types") REFERENCES "public"."document_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."documents_equipment" ADD CONSTRAINT "documents_equipment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."documents_equipment_logs" ADD CONSTRAINT "public_documents_equipment_logs_documents_equipment_id_fkey" FOREIGN KEY ("documents_equipment_id") REFERENCES "public"."documents_equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."empleado_aptitudes" ADD CONSTRAINT "empleado_aptitudes_aptitud_id_fkey" FOREIGN KEY ("aptitud_id") REFERENCES "public"."aptitudes_tecnicas"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."empleado_aptitudes" ADD CONSTRAINT "empleado_aptitudes_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_birthplace_fkey" FOREIGN KEY ("birthplace") REFERENCES "public"."countries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_city_fkey" FOREIGN KEY ("city") REFERENCES "public"."cities"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_company_position_fkey" FOREIGN KEY ("company_position") REFERENCES "public"."company_positions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "public"."cost_center"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_covenants_id_fkey" FOREIGN KEY ("covenants_id") REFERENCES "public"."covenant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "public"."guild"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_hierarchical_position_fkey" FOREIGN KEY ("hierarchical_position") REFERENCES "public"."hierarchy"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_province_fkey" FOREIGN KEY ("province") REFERENCES "public"."provinces"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_type_of_contract_fkey" FOREIGN KEY ("type_of_contract") REFERENCES "public"."types_of_contract"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_workflow_diagram_fkey" FOREIGN KEY ("workflow_diagram") REFERENCES "public"."work_diagram"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_workshop_sector_id_fkey" FOREIGN KEY ("workshop_sector_id") REFERENCES "public"."workshop_sectors"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."employees_diagram" ADD CONSTRAINT "employees_diagram_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."employees_diagram" ADD CONSTRAINT "public_employees_diagram_diagram_type_fkey" FOREIGN KEY ("diagram_type") REFERENCES "public"."diagram_type"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."equipment_owner_contract_types" ADD CONSTRAINT "equipment_owner_contract_types_equipment_owner_id_fkey" FOREIGN KEY ("equipment_owner_id") REFERENCES "public"."equipment_owners"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."equipment_owners" ADD CONSTRAINT "equipment_owners_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."equipos_clientes" ADD CONSTRAINT "equipos_clientes_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."form_answers" ADD CONSTRAINT "form_answers_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "public"."custom_form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."guild" ADD CONSTRAINT "public_guild_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."hired_modules" ADD CONSTRAINT "hired_modules_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."hired_modules" ADD CONSTRAINT "hired_modules_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."kpi_revisions" ADD CONSTRAINT "kpi_revisions_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "auth"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."kpi_revisions" ADD CONSTRAINT "kpi_revisions_kpi_id_fkey" FOREIGN KEY ("kpi_id") REFERENCES "public"."kpis"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."kpis" ADD CONSTRAINT "kpis_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."maintenance_activity_log" ADD CONSTRAINT "maintenance_activity_log_maintenance_order_id_fkey" FOREIGN KEY ("maintenance_order_id") REFERENCES "public"."maintenance_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."maintenance_activity_log" ADD CONSTRAINT "maintenance_activity_log_maintenance_request_id_fkey" FOREIGN KEY ("maintenance_request_id") REFERENCES "public"."maintenance_requests"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."maintenance_activity_log" ADD CONSTRAINT "maintenance_activity_log_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "public"."profile"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."maintenance_activity_log" ADD CONSTRAINT "maintenance_activity_log_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."maintenance_group_type_of_repairs" ADD CONSTRAINT "maintenance_group_type_of_repairs_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."maintenance_request_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."maintenance_group_type_of_repairs" ADD CONSTRAINT "maintenance_group_type_of_repairs_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "public"."types_of_repairs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."maintenance_order_item_repair_types" ADD CONSTRAINT "maintenance_order_item_repair_ty_maintenance_order_item_id_fkey" FOREIGN KEY ("maintenance_order_item_id") REFERENCES "public"."maintenance_order_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."maintenance_order_item_repair_types" ADD CONSTRAINT "maintenance_order_item_repair_types_repair_type_id_fkey" FOREIGN KEY ("repair_type_id") REFERENCES "public"."types_of_repairs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."maintenance_order_items" ADD CONSTRAINT "maintenance_order_items_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."maintenance_order_items" ADD CONSTRAINT "maintenance_order_items_assigned_sector_id_fkey" FOREIGN KEY ("assigned_sector_id") REFERENCES "public"."workshop_sectors"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."maintenance_order_items" ADD CONSTRAINT "maintenance_order_items_assigned_workshop_id_fkey" FOREIGN KEY ("assigned_workshop_id") REFERENCES "public"."workshops"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."maintenance_order_items" ADD CONSTRAINT "maintenance_order_items_maintenance_order_id_fkey" FOREIGN KEY ("maintenance_order_id") REFERENCES "public"."maintenance_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."maintenance_order_items" ADD CONSTRAINT "maintenance_order_items_maintenance_request_item_id_fkey" FOREIGN KEY ("maintenance_request_item_id") REFERENCES "public"."maintenance_request_items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."maintenance_order_items" ADD CONSTRAINT "maintenance_order_items_rejected_by_fkey" FOREIGN KEY ("rejected_by") REFERENCES "public"."profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."maintenance_order_items" ADD CONSTRAINT "maintenance_order_items_repair_type_id_fkey" FOREIGN KEY ("repair_type_id") REFERENCES "public"."types_of_repairs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."maintenance_order_items" ADD CONSTRAINT "maintenance_order_items_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."maintenance_order_items" ADD CONSTRAINT "maintenance_order_items_workshop_chief_comment_by_fkey" FOREIGN KEY ("workshop_chief_comment_by") REFERENCES "public"."profile"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."maintenance_orders" ADD CONSTRAINT "maintenance_orders_date_approved_by_fkey" FOREIGN KEY ("date_approved_by") REFERENCES "public"."profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."maintenance_orders" ADD CONSTRAINT "maintenance_orders_date_rejected_by_fkey" FOREIGN KEY ("date_rejected_by") REFERENCES "public"."profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."maintenance_orders" ADD CONSTRAINT "maintenance_orders_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "public"."vehicles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."maintenance_orders" ADD CONSTRAINT "maintenance_orders_maintenance_request_id_fkey" FOREIGN KEY ("maintenance_request_id") REFERENCES "public"."maintenance_requests"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."maintenance_orders" ADD CONSTRAINT "maintenance_orders_operations_validated_by_fkey" FOREIGN KEY ("operations_validated_by") REFERENCES "auth"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."maintenance_orders" ADD CONSTRAINT "maintenance_orders_rejected_by_fkey" FOREIGN KEY ("rejected_by") REFERENCES "public"."profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."maintenance_orders" ADD CONSTRAINT "maintenance_orders_scheduled_by_fkey" FOREIGN KEY ("scheduled_by") REFERENCES "public"."profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."maintenance_orders" ADD CONSTRAINT "maintenance_orders_workshop_approved_by_fkey" FOREIGN KEY ("workshop_approved_by") REFERENCES "public"."profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."maintenance_request_items" ADD CONSTRAINT "maintenance_request_items_checklist_deviation_id_fkey" FOREIGN KEY ("checklist_deviation_id") REFERENCES "public"."checklist_deviations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."maintenance_request_items" ADD CONSTRAINT "maintenance_request_items_driver_comment_by_fkey" FOREIGN KEY ("driver_comment_by") REFERENCES "public"."profile"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."maintenance_request_items" ADD CONSTRAINT "maintenance_request_items_maintenance_request_id_fkey" FOREIGN KEY ("maintenance_request_id") REFERENCES "public"."maintenance_requests"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."maintenance_request_items" ADD CONSTRAINT "maintenance_request_items_repair_type_id_fkey" FOREIGN KEY ("repair_type_id") REFERENCES "public"."types_of_repairs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."maintenance_request_items" ADD CONSTRAINT "maintenance_request_items_supervisor_comment_by_fkey" FOREIGN KEY ("supervisor_comment_by") REFERENCES "public"."profile"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."maintenance_request_items" ADD CONSTRAINT "maintenance_request_items_validator_comment_by_fkey" FOREIGN KEY ("validator_comment_by") REFERENCES "public"."profile"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."maintenance_requests" ADD CONSTRAINT "maintenance_requests_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."maintenance_requests" ADD CONSTRAINT "maintenance_requests_checklist_answer_id_fkey" FOREIGN KEY ("checklist_answer_id") REFERENCES "public"."checklist_answers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."maintenance_requests" ADD CONSTRAINT "maintenance_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."maintenance_requests" ADD CONSTRAINT "maintenance_requests_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "public"."vehicles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."maintenance_requests" ADD CONSTRAINT "maintenance_requests_rejected_by_fkey" FOREIGN KEY ("rejected_by") REFERENCES "public"."profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."maintenance_requests" ADD CONSTRAINT "maintenance_requests_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "public"."profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."maintenance_requests" ADD CONSTRAINT "maintenance_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."model_vehicles" ADD CONSTRAINT "public_model_vehicles_brand_fkey" FOREIGN KEY ("brand") REFERENCES "public"."brand_vehicles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "public_notifications_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."other_equipment" ADD CONSTRAINT "other_equipment_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brand_vehicles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."other_equipment" ADD CONSTRAINT "other_equipment_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."other_equipment" ADD CONSTRAINT "other_equipment_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "public"."cost_center"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."other_equipment" ADD CONSTRAINT "other_equipment_linked_vehicle_id_fkey" FOREIGN KEY ("linked_vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."other_equipment" ADD CONSTRAINT "other_equipment_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "public"."model_vehicles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."other_equipment" ADD CONSTRAINT "other_equipment_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."equipment_owners"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."other_equipment" ADD CONSTRAINT "other_equipment_sector_fkey" FOREIGN KEY ("sector") REFERENCES "public"."hierarchy"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."other_equipment" ADD CONSTRAINT "other_equipment_sub_type_id_fkey" FOREIGN KEY ("sub_type_id") REFERENCES "public"."sub_type"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."other_equipment" ADD CONSTRAINT "other_equipment_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "public"."type"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."other_equipment" ADD CONSTRAINT "other_equipment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."other_equipment_certifications" ADD CONSTRAINT "other_equipment_certifications_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "public"."other_equipment"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."preparte" ADD CONSTRAINT "preparte_areas_service_id_fkey" FOREIGN KEY ("areas_service_id") REFERENCES "public"."service_areas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."preparte" ADD CONSTRAINT "preparte_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."customers"("id") ON DELETE SET DEFAULT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."preparte" ADD CONSTRAINT "preparte_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."preparte" ADD CONSTRAINT "preparte_contrato_id_fkey" FOREIGN KEY ("contrato_id") REFERENCES "public"."customer_services"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."preparte" ADD CONSTRAINT "preparte_equipos_cliente_fkey" FOREIGN KEY ("equipos_cliente") REFERENCES "public"."equipos_clientes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."preparte" ADD CONSTRAINT "preparte_item_fkey" FOREIGN KEY ("item") REFERENCES "public"."service_items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."preparte" ADD CONSTRAINT "preparte_reprogram_fkey" FOREIGN KEY ("reprogram") REFERENCES "public"."preparte"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."preparte" ADD CONSTRAINT "preparte_sector_service_id_fkey" FOREIGN KEY ("sector_service_id") REFERENCES "public"."service_sectors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."preparte_change_logs" ADD CONSTRAINT "fk_preparte_change_logs_profile" FOREIGN KEY ("changed_by") REFERENCES "public"."profile"("credential_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."preparte_change_logs" ADD CONSTRAINT "preparte_change_logs_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."profile"("credential_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."preparte_change_logs" ADD CONSTRAINT "preparte_change_logs_preparte_id_fkey" FOREIGN KEY ("preparte_id") REFERENCES "public"."preparte"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."profile" ADD CONSTRAINT "profile_credential_id_fkey" FOREIGN KEY ("credential_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."profile" ADD CONSTRAINT "profile_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."profile" ADD CONSTRAINT "profile_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."profile" ADD CONSTRAINT "profile_role_fkey" FOREIGN KEY ("role") REFERENCES "public"."roles"("name") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."remito_documents" ADD CONSTRAINT "remito_documents_remit_id_fkey" FOREIGN KEY ("remit_id") REFERENCES "public"."remitos"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."remitos" ADD CONSTRAINT "remitos_daily_report_row_id_fkey" FOREIGN KEY ("daily_report_row_id") REFERENCES "public"."dailyreportrows"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."repair_solicitudes" ADD CONSTRAINT "repair_solicitudes_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."repair_solicitudes" ADD CONSTRAINT "repair_solicitudes_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "public"."vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."repair_solicitudes" ADD CONSTRAINT "repair_solicitudes_mechanic_id_fkey" FOREIGN KEY ("mechanic_id") REFERENCES "public"."profile"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "public"."repair_solicitudes" ADD CONSTRAINT "repair_solicitudes_reparation_type_fkey" FOREIGN KEY ("reparation_type") REFERENCES "public"."types_of_repairs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."repair_solicitudes" ADD CONSTRAINT "repair_solicitudes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."repairlogs" ADD CONSTRAINT "repairlogs_modified_by_employee_fkey" FOREIGN KEY ("modified_by_employee") REFERENCES "public"."employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."repairlogs" ADD CONSTRAINT "repairlogs_modified_by_user_fkey" FOREIGN KEY ("modified_by_user") REFERENCES "public"."profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."repairlogs" ADD CONSTRAINT "reparirlogs_repair_id_fkey" FOREIGN KEY ("repair_id") REFERENCES "public"."repair_solicitudes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."role_permissions" ADD CONSTRAINT "role_permissions_action_id_fkey" FOREIGN KEY ("action_id") REFERENCES "public"."actions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."role_permissions" ADD CONSTRAINT "role_permissions_tab_id_fkey" FOREIGN KEY ("tab_id") REFERENCES "public"."tabs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."sector_customer" ADD CONSTRAINT "sector_customer_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."sector_customer" ADD CONSTRAINT "sector_customer_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "public"."sectors"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."sector_repair_types" ADD CONSTRAINT "sector_repair_types_repair_type_id_fkey" FOREIGN KEY ("repair_type_id") REFERENCES "public"."types_of_repairs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."sector_repair_types" ADD CONSTRAINT "sector_repair_types_workshop_sector_id_fkey" FOREIGN KEY ("workshop_sector_id") REFERENCES "public"."workshop_sectors"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."service_areas" ADD CONSTRAINT "service_areas_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "public"."areas_cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_areas" ADD CONSTRAINT "service_areas_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."customer_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_items" ADD CONSTRAINT "public_service_items_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."service_items" ADD CONSTRAINT "public_service_items_item_measure_units_fkey" FOREIGN KEY ("item_measure_units") REFERENCES "public"."measure_units"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."service_items" ADD CONSTRAINT "service_items_customer_service_id_fkey" FOREIGN KEY ("customer_service_id") REFERENCES "public"."customer_services"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."service_sectors" ADD CONSTRAINT "service_sectors_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "public"."sectors"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."service_sectors" ADD CONSTRAINT "service_sectors_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."customer_services"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."share_company_users" ADD CONSTRAINT "public_share_company_users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."share_company_users" ADD CONSTRAINT "public_share_company_users_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."share_company_users" ADD CONSTRAINT "share_company_users_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sub_type" ADD CONSTRAINT "sub_type_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sub_type" ADD CONSTRAINT "sub_type_type_fkey" FOREIGN KEY ("type") REFERENCES "public"."type"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."sub_type_compatible_items" ADD CONSTRAINT "sub_type_compatible_items_sub_type_id_fkey" FOREIGN KEY ("sub_type_id") REFERENCES "public"."sub_type"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."tabs" ADD CONSTRAINT "tabs_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."tabs" ADD CONSTRAINT "tabs_parent_tab_id_fkey" FOREIGN KEY ("parent_tab_id") REFERENCES "public"."tabs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."type" ADD CONSTRAINT "type_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."type_hitch_types" ADD CONSTRAINT "type_hitch_types_compatible_type_id_fkey" FOREIGN KEY ("compatible_type_id") REFERENCES "public"."type"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."type_hitch_types" ADD CONSTRAINT "type_hitch_types_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "public"."type"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."types_of_repairs" ADD CONSTRAINT "types_of_repairs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_permissions" ADD CONSTRAINT "user_permissions_action_id_fkey" FOREIGN KEY ("action_id") REFERENCES "public"."actions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."user_permissions" ADD CONSTRAINT "user_permissions_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "auth"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."user_permissions" ADD CONSTRAINT "user_permissions_tab_id_fkey" FOREIGN KEY ("tab_id") REFERENCES "public"."tabs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."user_permissions" ADD CONSTRAINT "user_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."user_roles" ADD CONSTRAINT "user_roles_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "auth"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."vehicles" ADD CONSTRAINT "public_vehicles_model_fkey" FOREIGN KEY ("model") REFERENCES "public"."model_vehicles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."vehicles" ADD CONSTRAINT "public_vehicles_type_fkey" FOREIGN KEY ("type") REFERENCES "public"."type"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."vehicles" ADD CONSTRAINT "vehicles_brand_fkey" FOREIGN KEY ("brand") REFERENCES "public"."brand_vehicles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."vehicles" ADD CONSTRAINT "vehicles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vehicles" ADD CONSTRAINT "vehicles_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "public"."cost_center"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vehicles" ADD CONSTRAINT "vehicles_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."equipment_owners"("id") ON DELETE SET DEFAULT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vehicles" ADD CONSTRAINT "vehicles_sector_fkey" FOREIGN KEY ("sector") REFERENCES "public"."hierarchy"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."vehicles" ADD CONSTRAINT "vehicles_subType_fkey" FOREIGN KEY ("subType") REFERENCES "public"."sub_type"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."vehicles" ADD CONSTRAINT "vehicles_type_of_vehicle_fkey" FOREIGN KEY ("type_of_vehicle") REFERENCES "public"."types_of_vehicles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."vehicles" ADD CONSTRAINT "vehicles_type_operative_id_fkey" FOREIGN KEY ("type_operative_id") REFERENCES "public"."type_operative"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vehicles" ADD CONSTRAINT "vehicles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."work_diagram" ADD CONSTRAINT "work-diagram_inactive_novelty_fkey" FOREIGN KEY ("inactive_novelty") REFERENCES "public"."diagram_type"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."work_diagram_active_novelties" ADD CONSTRAINT "work_diagram_active_novelties_diagram_type_id_fkey" FOREIGN KEY ("diagram_type_id") REFERENCES "public"."diagram_type"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."work_diagram_active_novelties" ADD CONSTRAINT "work_diagram_active_novelties_work_diagram_id_fkey" FOREIGN KEY ("work_diagram_id") REFERENCES "public"."work_diagram"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."work_order_item_repairs" ADD CONSTRAINT "work_order_item_repairs_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "public"."profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."work_order_item_repairs" ADD CONSTRAINT "work_order_item_repairs_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."work_order_item_repairs" ADD CONSTRAINT "work_order_item_repairs_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "public"."profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."work_order_item_repairs" ADD CONSTRAINT "work_order_item_repairs_original_sector_id_fkey" FOREIGN KEY ("original_sector_id") REFERENCES "public"."workshop_sectors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."work_order_item_repairs" ADD CONSTRAINT "work_order_item_repairs_repair_type_id_fkey" FOREIGN KEY ("repair_type_id") REFERENCES "public"."types_of_repairs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."work_order_item_repairs" ADD CONSTRAINT "work_order_item_repairs_technician_notes_by_fkey" FOREIGN KEY ("technician_notes_by") REFERENCES "public"."profile"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."work_order_item_repairs" ADD CONSTRAINT "work_order_item_repairs_work_order_item_id_fkey" FOREIGN KEY ("work_order_item_id") REFERENCES "public"."work_order_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."work_order_items" ADD CONSTRAINT "work_order_items_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "public"."profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."work_order_items" ADD CONSTRAINT "work_order_items_maintenance_order_item_id_fkey" FOREIGN KEY ("maintenance_order_item_id") REFERENCES "public"."maintenance_order_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."work_order_items" ADD CONSTRAINT "work_order_items_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."work_orders" ADD CONSTRAINT "work_orders_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "public"."profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."work_orders" ADD CONSTRAINT "work_orders_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."work_orders" ADD CONSTRAINT "work_orders_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "public"."profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."work_orders" ADD CONSTRAINT "work_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."work_orders" ADD CONSTRAINT "work_orders_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "public"."vehicles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."work_orders" ADD CONSTRAINT "work_orders_paused_by_fkey" FOREIGN KEY ("paused_by") REFERENCES "public"."profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."work_orders" ADD CONSTRAINT "work_orders_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "public"."workshop_sectors"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."work_orders" ADD CONSTRAINT "work_orders_started_by_fkey" FOREIGN KEY ("started_by") REFERENCES "public"."profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."work_orders" ADD CONSTRAINT "work_orders_workshop_id_fkey" FOREIGN KEY ("workshop_id") REFERENCES "public"."workshops"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."workshop_sectors" ADD CONSTRAINT "workshop_sectors_workshop_id_fkey" FOREIGN KEY ("workshop_id") REFERENCES "public"."workshops"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."workshops" ADD CONSTRAINT "workshops_city_fkey" FOREIGN KEY ("city") REFERENCES "public"."cities"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."workshops" ADD CONSTRAINT "workshops_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."workshops" ADD CONSTRAINT "workshops_province_fkey" FOREIGN KEY ("province") REFERENCES "public"."provinces"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "storage"."objects" ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "storage"."s3_multipart_uploads" ADD CONSTRAINT "s3_multipart_uploads_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "storage"."s3_multipart_uploads_parts" ADD CONSTRAINT "s3_multipart_uploads_parts_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "storage"."s3_multipart_uploads_parts" ADD CONSTRAINT "s3_multipart_uploads_parts_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "storage"."s3_multipart_uploads"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "storage"."vector_indexes" ADD CONSTRAINT "vector_indexes_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets_vectors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

