-- ============================================================================
-- Subtab "Desvios" dentro de Dashboard > Estadisticas (ticket 578)
--
-- Padre: tab `estadisticas` (90000000-0000-0000-0000-000000000003)
-- Modulo: dashboard (91ed9ae4-6713-41ac-a87e-6b156e079948)
-- order_index 5: va despues de kpis (4); las hermanas son operaciones (1),
-- rrhh (2), mantenimiento (3) y kpis (4).
--
-- Solo se cargan los 3 roles de acceso completo. Los roles operativos de la
-- empresa (`roles.slug IS NULL`) se asignan a mano desde el editor de permisos:
-- que no aparezcan aca es lo esperado, no una omision.
-- ============================================================================

INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
  (
    '90000000-0000-0000-0000-000000000034',
    '91ed9ae4-6713-41ac-a87e-6b156e079948',
    'desvios',
    'Desvíos',
    'Evolución en el tiempo de los desvíos detectados al cierre del parte diario',
    5,
    '90000000-0000-0000-0000-000000000003'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO role_permissions (role_id, tab_id, action_id)
SELECT r.id, t.id, a.id
FROM roles r
CROSS JOIN tabs t
CROSS JOIN actions a
WHERE r.slug IN ('admin', 'administrador', 'full-access-provisional')
  AND t.id = '90000000-0000-0000-0000-000000000034'
  AND a.slug = 'view'
ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;
