-- ============================================================================
-- API de solo lectura para sistemas externos (ticket 671)
--
-- QUE RESUELVE
-- El cliente pide consultar desde un sistema externo la nomina de empleados,
-- la de vehiculos y la base de clientes/sectores/areas, con credenciales
-- propias "para tener identificadas estas consultas". Hoy el proyecto no tiene
-- NINGUN mecanismo de autenticacion de API entrante: todo se resuelve con la
-- sesion de Supabase (cookies), que un sistema externo no tiene.
--
-- QUE AGREGA
--   1. external_api_clients     : una credencial por sistema externo.
--   2. external_api_access_logs : el registro de cada consulta.
--
-- SOBRE EL SECRETO
-- El secreto se genera con 256 bits de entropia y se guarda SOLO como hash
-- scrypt con salt (columna `secret_hash`, formato autodescriptivo
-- scrypt$N$r$p$salt$hash para poder subir el costo mas adelante sin invalidar
-- los hashes viejos). En claro se muestra una unica vez, al crearlo.
-- `secret_prefix` guarda los primeros caracteres para poder identificar la
-- credencial en pantalla sin volver a exponerla.
-- NO se sigue el patron de `password_reset_tokens`, que guarda su token en
-- texto plano.
--
-- SOBRE EL LOG
-- Registra tambien los intentos fallidos (`attempted_client_id` guarda el
-- usuario que llego en el header aunque no exista), que es como se detecta a
-- alguien probando credenciales. `endpoint` es el nombre logico del recurso y
-- no la URL, para que el historial siga siendo legible si la ruta cambia.
-- ============================================================================

CREATE TABLE IF NOT EXISTS "public"."external_api_clients" (
    "id"            UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id"    UUID NOT NULL,
    "name"          TEXT NOT NULL,
    "client_id"     TEXT NOT NULL,
    "secret_hash"   TEXT NOT NULL,
    "secret_prefix" TEXT NOT NULL,
    "is_active"     BOOLEAN NOT NULL DEFAULT true,
    "revoked_at"    TIMESTAMPTZ(6),
    "last_used_at"  TIMESTAMPTZ(6),
    "notes"         TEXT,
    "created_at"    TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "created_by"    UUID,
    "revoked_by"    UUID,

    CONSTRAINT "external_api_clients_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."external_api_access_logs" (
    "id"                     BIGSERIAL NOT NULL,
    "external_api_client_id" UUID,
    "attempted_client_id"    TEXT,
    "endpoint"               TEXT NOT NULL,
    "method"                 TEXT NOT NULL DEFAULT 'GET',
    "path"                   TEXT NOT NULL,
    "query_params"           JSONB,
    "status_code"            INTEGER NOT NULL,
    "ip_address"             TEXT,
    "user_agent"             TEXT,
    "response_time_ms"       INTEGER,
    "error_message"          TEXT,
    "created_at"             TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    CONSTRAINT "external_api_access_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "external_api_clients_client_id_key"
    ON "public"."external_api_clients"("client_id");

CREATE INDEX IF NOT EXISTS "idx_external_api_clients_company"
    ON "public"."external_api_clients"("company_id");

-- El listado del panel ordena por fecha de consulta de cada credencial
CREATE INDEX IF NOT EXISTS "idx_external_api_access_logs_client_date"
    ON "public"."external_api_access_logs"("external_api_client_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_external_api_access_logs_created_at"
    ON "public"."external_api_access_logs"("created_at");

ALTER TABLE "public"."external_api_clients"
    ADD CONSTRAINT "external_api_clients_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "public"."company"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."external_api_clients"
    ADD CONSTRAINT "external_api_clients_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "public"."profile"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."external_api_clients"
    ADD CONSTRAINT "external_api_clients_revoked_by_fkey"
    FOREIGN KEY ("revoked_by") REFERENCES "public"."profile"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."external_api_access_logs"
    ADD CONSTRAINT "external_api_access_logs_external_api_client_id_fkey"
    FOREIGN KEY ("external_api_client_id") REFERENCES "public"."external_api_clients"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- RLS: las dos tablas se leen y escriben exclusivamente desde el servidor
-- (route handlers y server actions con Prisma). Se habilita RLS sin politicas
-- para que ningun cliente pueda tocarlas con la anon key.
ALTER TABLE "public"."external_api_clients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."external_api_access_logs" ENABLE ROW LEVEL SECURITY;
