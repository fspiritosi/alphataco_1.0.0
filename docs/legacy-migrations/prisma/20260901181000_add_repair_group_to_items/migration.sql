-- Reunion del 31/08/2026: al cargar un grupo de reparaciones se expanden N tareas
-- sueltas y despues no se distingue cuales vinieron de un grupo (ni de cual) y cuales
-- se cargaron a mano. Palabras del cliente: "no se si alguna fue agregada sin querer o
-- fue de algun tipo de reparacion particular... esta indicacion o agrupacion debe estar
-- presente en todo lugar donde se listen".
--
-- Se PERSISTE el grupo de origen en vez de derivarlo por la pivote
-- `maintenance_group_type_of_repairs`: un mismo tipo de reparacion puede pertenecer a
-- varios grupos, asi que derivarlo mostraria un origen ambiguo (potencialmente falso).
--
-- Nullable a proposito: los items cargados de a uno (tarea del listado o texto libre) no
-- tienen grupo, y los ya existentes tampoco. NULL = "no vino de un grupo".

ALTER TABLE maintenance_request_items
  ADD COLUMN IF NOT EXISTS maintenance_group_id uuid;

ALTER TABLE maintenance_order_items
  ADD COLUMN IF NOT EXISTS maintenance_group_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'maintenance_request_items_group_fkey'
  ) THEN
    ALTER TABLE maintenance_request_items
      ADD CONSTRAINT maintenance_request_items_group_fkey
      FOREIGN KEY (maintenance_group_id) REFERENCES maintenance_request_groups(id)
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'maintenance_order_items_group_fkey'
  ) THEN
    ALTER TABLE maintenance_order_items
      ADD CONSTRAINT maintenance_order_items_group_fkey
      FOREIGN KEY (maintenance_group_id) REFERENCES maintenance_request_groups(id)
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Indices: los listados filtran/agrupan por grupo para mostrar el origen
CREATE INDEX IF NOT EXISTS idx_maintenance_request_items_group
  ON maintenance_request_items (maintenance_group_id)
  WHERE maintenance_group_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_maintenance_order_items_group
  ON maintenance_order_items (maintenance_group_id)
  WHERE maintenance_group_id IS NOT NULL;
