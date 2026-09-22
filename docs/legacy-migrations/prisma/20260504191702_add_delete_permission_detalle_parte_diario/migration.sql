-- Agrega la accion 'delete' al tab 'detalle-parte-diario' para los 3 roles
-- de acceso completo (admin, administrador, full-access-provisional).
-- Sin esto, el boton de eliminar fila del parte diario nunca se renderiza
-- porque checkPermissionServer('operaciones','detalle-parte-diario','delete')
-- siempre retorna false.

INSERT INTO role_permissions (role_id, tab_id, action_id)
SELECT r.id,
       (SELECT id FROM tabs WHERE slug = 'detalle-parte-diario'),
       (SELECT id FROM actions WHERE slug = 'delete')
FROM roles r
WHERE r.slug IN ('admin', 'administrador', 'full-access-provisional')
ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;
