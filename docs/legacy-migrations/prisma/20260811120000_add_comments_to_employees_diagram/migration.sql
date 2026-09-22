-- Ticket 543: comentario opcional en las novedades de diagrama.
-- Aditivo: columna nullable, ningun dato existente se modifica.
ALTER TABLE "public"."employees_diagram" ADD COLUMN IF NOT EXISTS "comments" text;

COMMENT ON COLUMN "public"."employees_diagram"."comments" IS
  'Comentario opcional de la novedad, cargado desde Empleados > Diagramas > Cargar Diagrama. Se guarda por dia.';
