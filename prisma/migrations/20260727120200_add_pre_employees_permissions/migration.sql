-- Ticket 505 — permisos del pre legajo.
--
-- Crea la accion `approve` (aprobar/rechazar un pre legajo) y la tab `pre-legajos` dentro del
-- modulo Empleados. La aprobacion es un permiso PROPIO, separado de crear/editar: RRHH carga y
-- edita con `update`, gerencia decide con `approve`.
--
-- Limpieza previa: la base de DEV quedo con una tab `pre-legajos` de UUID aleatorio, insertada
-- por el experimento descartado (ver 20260727120000_drop_legacy_pre_hire_tables). Se elimina
-- para recrearla con el UUID de la convencion del modulo (20000000-...-0007). En PRODUCCION esa
-- tab no existe, por lo que el bloque de limpieza es un no-op.

-- 1. Limpieza de la tab residual del experimento (cualquier `pre-legajos` que no use el UUID de la convencion)
DELETE FROM role_permissions
WHERE tab_id IN (
  SELECT id FROM tabs
  WHERE slug = 'pre-legajos'
    AND module_id = '3c54a757-162c-4afc-8ea5-dca462f92e0c'
    AND id <> '20000000-0000-0000-0000-000000000007'
);

DELETE FROM user_permissions
WHERE tab_id IN (
  SELECT id FROM tabs
  WHERE slug = 'pre-legajos'
    AND module_id = '3c54a757-162c-4afc-8ea5-dca462f92e0c'
    AND id <> '20000000-0000-0000-0000-000000000007'
);

DELETE FROM tabs
WHERE slug = 'pre-legajos'
  AND module_id = '3c54a757-162c-4afc-8ea5-dca462f92e0c'
  AND id <> '20000000-0000-0000-0000-000000000007';

-- 2. Accion `approve`
INSERT INTO actions (id, slug, name, description)
VALUES ('c3d4e5f6-a7b8-4c9d-8e0f-1a2b3c4d5e6f', 'approve', 'Aprobar', 'Aprobar o rechazar un registro sujeto a autorizacion')
ON CONFLICT (slug) DO NOTHING;

-- 3. Tab `pre-legajos` bajo el modulo Empleados
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id)
VALUES (
  '20000000-0000-0000-0000-000000000007',
  '3c54a757-162c-4afc-8ea5-dca462f92e0c',
  'pre-legajos',
  'Pre Legajos',
  'Postulantes en proceso de ingreso, previos a la creacion del legajo',
  4,
  NULL
)
ON CONFLICT (id) DO NOTHING;

-- 4. Permisos para los tres roles de acceso completo
INSERT INTO role_permissions (role_id, tab_id, action_id)
SELECT r.id, t.id, a.id
FROM roles r, tabs t, actions a
WHERE r.slug IN ('admin', 'administrador', 'full-access-provisional')
  AND t.id = '20000000-0000-0000-0000-000000000007'
  AND a.slug IN ('view', 'create', 'update', 'approve')
ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;
