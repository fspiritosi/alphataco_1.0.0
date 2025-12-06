-- =====================================================
-- CREAR ROL OWNER Y ASIGNAR TODOS LOS PERMISOS
-- =====================================================
-- Este script crea el rol OWNER con permisos completos a todo el sistema

-- 1. Crear el rol OWNER
INSERT INTO roles (name, slug, description, color, is_system, is_active)
VALUES (
  'OWNER',
  'owner',
  'Propietario de la empresa con acceso completo a todo el sistema',
  '#DC2626',
  true,
  true
)
ON CONFLICT (slug) DO UPDATE 
SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  color = EXCLUDED.color,
  is_system = EXCLUDED.is_system,
  is_active = EXCLUDED.is_active;

-- 2. Asignar TODOS los permisos al rol OWNER
-- Esto asigna todas las combinaciones de tabs × actions
INSERT INTO role_permissions (role_id, tab_id, action_id)
SELECT 
  r.id as role_id,
  t.id as tab_id,
  a.id as action_id
FROM roles r
CROSS JOIN tabs t
CROSS JOIN actions a
WHERE r.slug = 'owner'
ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;

