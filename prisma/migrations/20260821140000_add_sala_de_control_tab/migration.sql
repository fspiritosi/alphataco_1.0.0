-- ============================================================================
-- Subtab "Sala de Control" dentro de Dashboard > Estadisticas (ticket 578)
--
-- Agrupa los graficos de gestion de pedidos del parte diario, que hasta ahora
-- vivian en la subtab Operaciones. En el entorno donde ya se aplico la
-- migracion del dashboard de desvios (20260819120200), esta misma fila existe
-- con el nombre "Desvíos": el ON CONFLICT la renombra en lugar de duplicarla,
-- y la tab pasa a contener los dos contenidos.
--
-- Padre: tab `estadisticas` (90000000-0000-0000-0000-000000000003)
-- Modulo: dashboard (91ed9ae4-6713-41ac-a87e-6b156e079948)
-- order_index 5: ultima de la fila, despues de kpis (4).
--
-- El slug se mantiene en `desvios` para no invalidar los permisos ya asignados
-- ni las URLs guardadas en el entorno donde la tab ya existe.
--
-- Solo se cargan los 3 roles de acceso completo. Los roles operativos de la
-- empresa (`roles.slug IS NULL`) se asignan a mano desde el editor de permisos:
-- que no aparezcan aca es lo esperado, no una omision. IMPORTANTE: los usuarios
-- que hoy ven los graficos de pedidos dentro de Operaciones necesitan permiso
-- sobre esta tab para seguir viendolos.
-- ============================================================================

INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
  (
    '90000000-0000-0000-0000-000000000034',
    '91ed9ae4-6713-41ac-a87e-6b156e079948',
    'desvios',
    'Sala de Control',
    'Gestión de pedidos y desvíos detectados al cierre del parte diario',
    5,
    '90000000-0000-0000-0000-000000000003'
  )
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

INSERT INTO role_permissions (role_id, tab_id, action_id)
SELECT r.id, t.id, a.id
FROM roles r
CROSS JOIN tabs t
CROSS JOIN actions a
WHERE r.slug IN ('admin', 'administrador', 'full-access-provisional')
  AND t.id = '90000000-0000-0000-0000-000000000034'
  AND a.slug = 'view'
ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;
