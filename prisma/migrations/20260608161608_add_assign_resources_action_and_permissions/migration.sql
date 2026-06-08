-- Acción especial "Asignar Recursos" para el detalle de parte diario.
-- Permite al rol Supervisor de Operaciones asignar personal y equipos a las
-- líneas del parte (parte activo o siguiente) sin poder modificar el resto de
-- los campos, eliminar líneas ni crear partes.

-- 1. Crear la acción (idempotente — slug es UNIQUE). Modelada como acción
--    especial, al estilo de 'upload_private' / 'view_private'.
INSERT INTO actions (slug, name, description)
VALUES (
  'assign_resources',
  'Asignar Recursos',
  'Permite asignar personal y equipos a las líneas del parte diario'
)
ON CONFLICT (slug) DO NOTHING;

-- 2. Permisos del rol "Supervisor de Operaciones" (id 20; slug NULL → se
--    referencia por nombre):
--      - detalle-parte-diario: view + assign_resources
--      - dailyreportstable:    view (para llegar al listado y abrir el detalle)
INSERT INTO role_permissions (role_id, tab_id, action_id)
SELECT r.id, t.id, a.id
FROM roles r
JOIN tabs t
  ON t.module_id = '5563157e-fc3e-470f-b90b-dadd7cc38417' -- Operaciones
 AND t.slug IN ('detalle-parte-diario', 'dailyreportstable')
JOIN actions a
  ON (t.slug = 'detalle-parte-diario' AND a.slug IN ('view', 'assign_resources'))
  OR (t.slug = 'dailyreportstable'    AND a.slug = 'view')
WHERE r.name = 'Supervisor de Operaciones'
ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;

-- 3. La acción assign_resources también para los roles de acceso total.
INSERT INTO role_permissions (role_id, tab_id, action_id)
SELECT r.id, t.id, a.id
FROM roles r
JOIN tabs t
  ON t.module_id = '5563157e-fc3e-470f-b90b-dadd7cc38417'
 AND t.slug = 'detalle-parte-diario'
JOIN actions a ON a.slug = 'assign_resources'
WHERE r.slug IN ('admin', 'administrador', 'full-access-provisional', 'super-admin')
ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;
