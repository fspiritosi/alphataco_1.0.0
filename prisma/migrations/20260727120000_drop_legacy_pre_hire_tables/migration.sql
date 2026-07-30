-- Ticket 505 — limpieza previa al pre legajo definitivo.
--
-- La base de DEV quedo con un experimento de "pre hire" (tablas `employee_pre_hires`,
-- `employee_pre_hire_documents`, `employee_pre_hire_status_history`, el enum
-- `employee_pre_hire_status` y la columna `document_types.enabled_for_pre_hire`) que se
-- aplico directamente contra la base, sin migracion ni codigo en el repositorio.
-- Ese modelo quedo descartado: la implementacion definitiva usa `pre_employees` /
-- `documents_pre_employees` (ver la migracion siguiente).
--
-- En PRODUCCION ninguno de estos objetos existe, por lo que esta migracion es un no-op
-- en el deploy. Todos los DROP usan IF EXISTS para ser idempotentes.

DROP TABLE IF EXISTS "public"."employee_pre_hire_documents";
DROP TABLE IF EXISTS "public"."employee_pre_hire_status_history";
DROP TABLE IF EXISTS "public"."employee_pre_hires";

DROP SEQUENCE IF EXISTS "public"."employee_pre_hire_number_seq";

DROP TYPE IF EXISTS "public"."employee_pre_hire_status";

ALTER TABLE "public"."document_types" DROP COLUMN IF EXISTS "enabled_for_pre_hire";
