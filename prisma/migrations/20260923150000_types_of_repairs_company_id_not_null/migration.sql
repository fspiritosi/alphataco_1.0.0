-- Cada empresa tiene su propio catálogo de tipos de reparación: no hay catálogo global.
-- Los 6 filtros de la app comparan `company_id` por igualdad estricta, así que una fila con
-- `company_id IS NULL` era invisible en todas las pantallas, incluida la que las administra.
-- Base vacía por decisión de producto: no hay backfill.
ALTER TABLE "types_of_repairs" ALTER COLUMN "company_id" SET NOT NULL;
