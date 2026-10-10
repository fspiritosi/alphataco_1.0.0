-- Equipos deja de montar "Documentos de Equipos" y "Mantenimiento": las mismas pantallas se
-- abren desde Documentacion, Mantenimiento y Configuracion > Mantenimiento. Sus tabs de permisos
-- quedan sin pantalla y se borran.
--
-- Antes de borrar, cada permiso ya otorgado (por rol o por usuario) se copia a la tab que monta
-- la MISMA pantalla en el modulo que queda, limitado a las acciones que esa tab admite. Asi nadie
-- pierde un acceso que hoy tiene. Tipos de Reparacion y Grupos son el caso que mas importa: su
-- formulario de alta/edicion leia `equipos:type_of_repair` / `equipos:maintenance_groups` aun
-- montado en Configuracion, y ahora lee los de Configuracion.

CREATE TEMP TABLE equipment_tab_moves (from_tab uuid, to_tab uuid, actions text[]);
INSERT INTO equipment_tab_moves VALUES
  -- equipos:documentos-de-equipos -> documentacion:documentos-de-equipos
  ('30000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', ARRAY['view', 'create', 'view_private', 'upload_private']),
  -- equipos:docs-equipos-permanentes -> documentacion:docs-equipos-permanentes
  ('30000000-0000-0000-0000-000000000021', '60000000-0000-0000-0000-000000000004', ARRAY['view', 'update']),
  -- equipos:docs-equipos-mensuales -> documentacion:docs-equipos-mensuales
  ('30000000-0000-0000-0000-000000000022', '60000000-0000-0000-0000-000000000005', ARRAY['view', 'update']),
  -- equipos:type_of_repair -> configuracion:type_of_repair
  ('30000000-0000-0000-0000-000000000042', '60000000-0000-0000-0000-000000000012', ARRAY['view', 'create', 'update']),
  -- equipos:maintenance_groups -> configuracion:maintenance_groups
  ('30000000-0000-0000-0000-000000000044', '60000000-0000-0000-0000-000000000014', ARRAY['view', 'create', 'update']),
  -- equipos:equipments_with_deviations -> mantenimiento:equipments_with_deviations
  ('60000000-0000-0000-0000-000000000019', '60000000-0000-0000-0000-000000000015', ARRAY['view']);

-- Solo los destinos que existen en esta BD (en una BD vacia el seed todavia no corrio).
DELETE FROM equipment_tab_moves m WHERE NOT EXISTS (SELECT 1 FROM tabs t WHERE t.id = m.to_tab);

INSERT INTO role_permissions (role_id, tab_id, action_id)
SELECT rp.role_id, m.to_tab, rp.action_id
FROM role_permissions rp
JOIN equipment_tab_moves m ON m.from_tab = rp.tab_id
JOIN actions a ON a.id = rp.action_id AND a.slug = ANY (m.actions)
ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;

-- `is_granted` viaja tal cual: un permiso de usuario tambien puede ser una denegacion.
INSERT INTO user_permissions (user_id, tab_id, action_id, company_id, is_granted, assigned_by)
SELECT up.user_id, m.to_tab, up.action_id, up.company_id, up.is_granted, up.assigned_by
FROM user_permissions up
JOIN equipment_tab_moves m ON m.from_tab = up.tab_id
JOIN actions a ON a.id = up.action_id AND a.slug = ANY (m.actions)
ON CONFLICT (user_id, tab_id, action_id, company_id) DO NOTHING;

-- Las subtabs caen por `parent_tab_id ON DELETE CASCADE`, y sus role/user_permissions por la FK
-- de `tab_id`. Se listan igual para que el borrado no dependa de la jerarquia cargada.
DELETE FROM tabs
WHERE id IN (
  '30000000-0000-0000-0000-000000000002', -- documentos-de-equipos
  '30000000-0000-0000-0000-000000000021', -- docs-equipos-permanentes
  '30000000-0000-0000-0000-000000000022', -- docs-equipos-mensuales
  '30000000-0000-0000-0000-000000000004', -- type_of_repairs
  '30000000-0000-0000-0000-000000000042', -- type_of_repair
  '30000000-0000-0000-0000-000000000044', -- maintenance_groups
  '60000000-0000-0000-0000-000000000019'  -- equipments_with_deviations
);

DROP TABLE equipment_tab_moves;
