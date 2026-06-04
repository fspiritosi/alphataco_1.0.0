-- Agrega la accion 'delete' a la tab 'preparte' (gestor de pedidos) para los roles de acceso completo.
-- Ticket #40: permitir eliminar un pedido en estado pendiente desde el gestor de pedidos.
INSERT INTO role_permissions (role_id, tab_id, action_id)
SELECT r.id,
       (SELECT id FROM tabs WHERE slug = 'preparte'),
       (SELECT id FROM actions WHERE slug = 'delete')
FROM roles r
WHERE r.slug IN ('admin', 'administrador', 'full-access-provisional')
ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;
