-- ============================================================================
-- Deuda técnica Fase 2 (tasks 2.1 / 2.2): tabs del circuito legacy de reparaciones
--
-- Se eliminó del código el circuito repair_solicitudes/repairlogs (tabs
-- "Solicitudes"/"Solicitudes Activas" y "Nueva Solicitud" con sus subtabs
-- "Carga Individual"/"Carga Múltiple", tanto en el módulo Equipos como en
-- Mantenimiento) y la tab "Órdenes de Trabajo (Legacy)" de Taller, que no tenía
-- UI desde que se borró OrdenesTrabajo. Ninguna de estas tabs figura ya en
-- src/features/Permissions/permissions-map.ts, así que se borran sus filas de
-- tabs y los permisos (de rol y de usuario) que apuntaban a ellas.
--
-- Orden: primero permisos, después subtabs (nivel 3) y por último las tabs
-- padre. tabs.parent_tab_id es ON DELETE CASCADE, pero se listan explícitas
-- para que la migración sea legible y no dependa de la cascada.
--
-- UUIDs (módulo / tab):
--   30000000-0000-0000-0000-000000000041  equipos / type_of_repairs / created_solicitudes
--   30000000-0000-0000-0000-000000000043  equipos / type_of_repairs / type_of_repair_new_entry
--   30000000-0000-0000-0000-000000000431      └ carga-individual
--   30000000-0000-0000-0000-000000000432      └ carga-multiple
--   60000000-0000-0000-0000-000000000011  mantenimiento / created_solicitudes
--   60000000-0000-0000-0000-000000000013  mantenimiento / type_of_repair_new_entry
--   60000000-0000-0000-0000-000000000042  mantenimiento / maint_taller / ordenes_trabajo
--   60000000-0000-0000-0000-000000000060  mantenimiento / maint_operaciones / repair_solicitudes ("Peticiones de
--                                          Mantenimiento") — tab huérfana del mismo circuito legacy: existe en BD
--                                          (supabase/seed.sql:7457) pero nunca estuvo en permissions-map.ts.
-- ============================================================================

DELETE FROM public.role_permissions
WHERE tab_id IN (
  '30000000-0000-0000-0000-000000000431',
  '30000000-0000-0000-0000-000000000432',
  '30000000-0000-0000-0000-000000000041',
  '30000000-0000-0000-0000-000000000043',
  '60000000-0000-0000-0000-000000000011',
  '60000000-0000-0000-0000-000000000013',
  '60000000-0000-0000-0000-000000000042',
  '60000000-0000-0000-0000-000000000060'
);

DELETE FROM public.user_permissions
WHERE tab_id IN (
  '30000000-0000-0000-0000-000000000431',
  '30000000-0000-0000-0000-000000000432',
  '30000000-0000-0000-0000-000000000041',
  '30000000-0000-0000-0000-000000000043',
  '60000000-0000-0000-0000-000000000011',
  '60000000-0000-0000-0000-000000000013',
  '60000000-0000-0000-0000-000000000042',
  '60000000-0000-0000-0000-000000000060'
);

-- Subtabs de nivel 3 (hijas de type_of_repair_new_entry en Equipos, y
-- repair_solicitudes -hoja huérfana- hija de maint_operaciones en Mantenimiento)
DELETE FROM public.tabs
WHERE id IN (
  '30000000-0000-0000-0000-000000000431',
  '30000000-0000-0000-0000-000000000432',
  '60000000-0000-0000-0000-000000000060'
);

-- Tabs padre
DELETE FROM public.tabs
WHERE id IN (
  '30000000-0000-0000-0000-000000000041',
  '30000000-0000-0000-0000-000000000043',
  '60000000-0000-0000-0000-000000000011',
  '60000000-0000-0000-0000-000000000013',
  '60000000-0000-0000-0000-000000000042'
);
