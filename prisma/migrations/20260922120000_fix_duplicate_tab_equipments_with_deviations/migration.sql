-- Corrige el tabId duplicado de 'equipments_with_deviations': la entrada del módulo
-- 'equipos' (Permissions/permissions-map.ts) compartía el mismo tabId
-- ('60000000-0000-0000-0000-000000000015') que la entrada del módulo 'mantenimiento'.
-- El seed (scripts/seed-company.ts) hace upsert de `tabs` por `id`: como ambos módulos
-- se recorren con el mismo id, la fila procesada al final (mantenimiento) pisaba a la
-- de equipos, que nunca llegó a existir en BD. permissions-map.ts ahora le asigna a
-- 'equipos/type_of_repairs/equipments_with_deviations' un UUID propio
-- ('60000000-0000-0000-0000-000000000019'); esta migración crea esa fila (y sus
-- role_permissions) para las BDs ya desplegadas, donde el seed no vuelve a correr solo.

-- `modules`/`tabs`/`roles`/`actions` no son parte de `0_init`: los crea
-- `scripts/seed-company.ts` DESPUÉS de `prisma migrate deploy` (ver `npm run test:db`
-- y `docs/desarrollo/entornos.md`). En una BD nueva (sin seedear todavía) el módulo
-- 'equipos' y la tab 'type_of_repairs' aún no existen: el `WHERE EXISTS` deja el INSERT
-- como no-op en ese caso, y el seed crea la fila correcta (permissions-map.ts ya tiene
-- el tabId único). En una BD ya desplegada y seedeada, el INSERT sí corre.
INSERT INTO tabs (id, module_id, parent_tab_id, slug, name, description, order_index, is_active)
SELECT
  '60000000-0000-0000-0000-000000000019',
  '34d7f9e5-7c01-4def-9446-6b3f52d761a0', -- modules.slug = 'equipos'
  '30000000-0000-0000-0000-000000000004', -- tabs.slug = 'type_of_repairs' (equipos)
  'equipments_with_deviations',
  'Equipos con Desvíos',
  NULL,
  1,
  true
WHERE EXISTS (SELECT 1 FROM modules WHERE id = '34d7f9e5-7c01-4def-9446-6b3f52d761a0')
  AND EXISTS (SELECT 1 FROM tabs WHERE id = '30000000-0000-0000-0000-000000000004')
ON CONFLICT (id) DO NOTHING;

-- Los 3 roles de acceso total del sistema (ver CLAUDE.md, "Permisos: 3 roles de acceso
-- completo"). allowedActions de esta tab en permissions-map.ts = ['view'].
INSERT INTO role_permissions (role_id, tab_id, action_id)
SELECT r.id, '60000000-0000-0000-0000-000000000019', a.id
FROM roles r
CROSS JOIN actions a
WHERE r.slug IN ('admin', 'administrador', 'full-access-provisional')
  AND a.slug IN ('view')
ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;
