-- ============================================================================
-- Tab "Accesos Externos" dentro de Empresa > Usuarios (ticket 671)
--
-- Es la pantalla donde se crean, rotan y revocan las credenciales que usan los
-- sistemas externos para consultar la API de solo lectura.
--
-- Los permisos se cargan SOLO a los 3 roles de acceso completo (admin,
-- administrador, full-access-provisional). Es deliberado: emitir una credencial
-- de API es dar acceso a la nomina completa de la empresa, asi que la tab no se
-- asigna por migracion a los roles operativos. Si en algun momento hay que
-- delegarla, se hace a mano desde el editor de permisos.
-- ============================================================================

INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('10000000-0000-0000-0000-000000000144',
 'e0478383-1287-4b5e-a727-985baf867173',
 'accesos-externos',
 'Accesos Externos',
 'Credenciales de los sistemas externos que consultan la API de solo lectura',
 4,
 '10000000-0000-0000-0000-000000000014')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO role_permissions (role_id, tab_id, action_id)
SELECT r.id, '10000000-0000-0000-0000-000000000144', a.id
FROM roles r, actions a
WHERE r.slug IN ('admin', 'administrador', 'full-access-provisional')
  AND a.slug IN ('view', 'create', 'update', 'delete')
ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;
