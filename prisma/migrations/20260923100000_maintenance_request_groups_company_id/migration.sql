-- `maintenance_request_groups` era la última tabla de catálogo de mantenimiento sin
-- `company_id`. Eso traía dos problemas distintos:
--
-- 1. Perímetro. Sin columna propia, la pertenencia del grupo se deducía de sus relaciones
--    (`assertGroupInActiveCompany` en TiposReparaciones/actions/maintenanceGroupActions.ts).
--    Un grupo recién creado no tiene ninguna, y crear un grupo sin tipos es un camino
--    normal de uso, así que durante esa ventana CUALQUIER empresa podía renombrarlo,
--    colgarle sus propios tipos o desactivarlo. Al desaparecer RLS, esa deducción era todo
--    el perímetro que había.
--
-- 2. Multi-empresa. `name` era `UNIQUE` GLOBAL: dos empresas no podían tener un grupo con
--    el mismo nombre ("Motor", "Frenos"). Pasa a ser único por empresa.
--
-- `NOT NULL` sin default y sin backfill: la base arranca vacía por decisión de producto
-- (no se migran los datos de Grupo Horizonte) y nada siembra esta tabla — ni
-- `scripts/seed-company.ts` ni `prisma/sql/*.sql` la tocan. Si alguna BD ya tuviera filas,
-- este ALTER falla a propósito en vez de inventarles una empresa.

DROP INDEX "maintenance_request_groups_name_key";

ALTER TABLE "maintenance_request_groups" ADD COLUMN "company_id" UUID NOT NULL;

CREATE INDEX "maintenance_request_groups_company_id_idx" ON "maintenance_request_groups"("company_id");

CREATE UNIQUE INDEX "maintenance_request_groups_company_id_name_key" ON "maintenance_request_groups"("company_id", "name");

ALTER TABLE "maintenance_request_groups"
  ADD CONSTRAINT "maintenance_request_groups_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
