-- Ticket 505 — red de seguridad de los permisos del pre legajo + roles de sistema.
--
-- La migracion 20260727120200_add_pre_employees_permissions ya creo la tab `pre-legajos`,
-- la accion `approve` y los permisos de los 3 roles de acceso completo. Esta migracion:
--   1. Reafirma esos objetos de forma IDEMPOTENTE (no cambia nada donde ya existen; garantiza
--      el estado en cualquier ambiente nuevo o restaurado desde un backup viejo).
--   2. Suma los roles de SISTEMA (`roles.is_system = true`), que habian quedado afuera.
--
-- Los roles custom de la empresa (`roles.slug IS NULL`: RR.HH., Control Documental, etc.) NO
-- se cargan aca a proposito: se asignan a mano desde el editor de permisos.
--
-- A diferencia de la migracion original, el `tab_id` se resuelve por (module_id, slug) en vez
-- de hardcodearlo: `tabs` tiene UNIQUE (module_id, slug), asi que si por lo que sea la tab
-- quedo con otro UUID, los permisos igual apuntan a la fila correcta.

-- 1. Accion `approve` (idempotente)
INSERT INTO actions (id, slug, name, description)
VALUES ('c3d4e5f6-a7b8-4c9d-8e0f-1a2b3c4d5e6f', 'approve', 'Aprobar', 'Aprobar o rechazar un registro sujeto a autorizacion')
ON CONFLICT (slug) DO NOTHING;

-- 2. Tab `pre-legajos` bajo el modulo Empleados (idempotente por module_id + slug)
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id)
SELECT
  '20000000-0000-0000-0000-000000000007',
  '3c54a757-162c-4afc-8ea5-dca462f92e0c',
  'pre-legajos',
  'Pre Legajos',
  'Postulantes en proceso de ingreso, previos a la creacion del legajo',
  4,
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM tabs
  WHERE slug = 'pre-legajos'
    AND module_id = '3c54a757-162c-4afc-8ea5-dca462f92e0c'
);

-- 3. Gestion completa: los 3 roles de acceso completo + los roles de sistema con acceso tecnico total
INSERT INTO role_permissions (role_id, tab_id, action_id)
SELECT r.id, t.id, a.id
FROM roles r
CROSS JOIN tabs t
CROSS JOIN actions a
WHERE r.slug IN ('admin', 'administrador', 'full-access-provisional', 'super-admin', 'developer')
  AND t.slug = 'pre-legajos'
  AND t.module_id = '3c54a757-162c-4afc-8ea5-dca462f92e0c'
  AND a.slug IN ('view', 'create', 'update', 'approve')
ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;

-- 4. Solo lectura: `auditor` es por definicion un rol de solo lectura y `codecontrol-client`
--    es un cliente externo — ninguno de los dos decide altas ni aprueba ingresos.
INSERT INTO role_permissions (role_id, tab_id, action_id)
SELECT r.id, t.id, a.id
FROM roles r
CROSS JOIN tabs t
CROSS JOIN actions a
WHERE r.slug IN ('auditor', 'codecontrol-client')
  AND t.slug = 'pre-legajos'
  AND t.module_id = '3c54a757-162c-4afc-8ea5-dca462f92e0c'
  AND a.slug = 'view'
ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;
