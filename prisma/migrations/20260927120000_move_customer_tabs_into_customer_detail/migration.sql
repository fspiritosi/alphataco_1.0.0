-- tsk-745 — Áreas, sectores y equipos del cliente dejan de ser pantallas sueltas del módulo
-- Comercial y pasan a ser pestañas de la ficha del cliente, que es de quien dependen.
--
-- El orden importa: PRIMERO se trasladan los permisos, DESPUÉS se borran las tabs viejas.
-- Borrar una tab arrastra sus `role_permissions` por CASCADE, así que hacerlo al revés le
-- sacaría el acceso a quien lo tenía. Hay un rol CUSTOM de empresa con permisos sobre las tres,
-- y los roles custom no se recrean por migración (se asignan a mano desde el editor): si se
-- pierden acá, se pierden.

-- 1) Trasladar los permisos de cada tab vieja a su equivalente en la ficha del cliente,
--    conservando la acción. `equipos-cliente` ya existía; las otras dos se crearon en la
--    migración anterior.
INSERT INTO role_permissions (role_id, tab_id, action_id)
SELECT rp.role_id, m.destino, rp.action_id
FROM role_permissions rp
JOIN (VALUES
  ('40000000-0000-0000-0000-000000000012'::uuid, '40000000-0000-0000-0000-000000000114'::uuid), -- areas     -> areas-cliente
  ('40000000-0000-0000-0000-000000000014'::uuid, '40000000-0000-0000-0000-000000000115'::uuid), -- sector    -> sectores-cliente
  ('40000000-0000-0000-0000-000000000013'::uuid, '40000000-0000-0000-0000-000000000113'::uuid)  -- equipment -> equipos-cliente
) AS m(origen, destino) ON m.origen = rp.tab_id
ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;

-- 2) Ahora sí, las tabs viejas. El CASCADE se lleva sus `role_permissions`, que ya fueron
--    copiados arriba.
DELETE FROM tabs WHERE id IN (
  '40000000-0000-0000-0000-000000000012',  -- comercial > comerce > areas
  '40000000-0000-0000-0000-000000000013',  -- comercial > comerce > equipment
  '40000000-0000-0000-0000-000000000014'   -- comercial > comerce > sector
);
