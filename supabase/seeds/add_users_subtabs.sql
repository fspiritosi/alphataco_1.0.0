-- Agregar subtabs de Usuarios en el módulo Empresa
-- Estas subtabs permiten gestionar usuarios y roles dentro de la empresa

-- Subtab: Usuarios (lista de usuarios empleados)
INSERT INTO tabs (
  id,
  module_id,
  parent_tab_id,
  slug,
  name,
  description,
  order_index,
  is_active
) VALUES (
  '10000000-0000-0000-0000-000000000141',
  'e0478383-1287-4b5e-a727-985baf867173', -- empresa module_id
  '10000000-0000-0000-0000-000000000014', -- users tab_id (parent)
  'usuarios-empleados',
  'Usuarios',
  'Lista de usuarios empleados de la empresa',
  1,
  true
) ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  order_index = EXCLUDED.order_index;

-- Subtab: Gestión de Roles
INSERT INTO tabs (
  id,
  module_id,
  parent_tab_id,
  slug,
  name,
  description,
  order_index,
  is_active
) VALUES (
  '10000000-0000-0000-0000-000000000142',
  'e0478383-1287-4b5e-a727-985baf867173', -- empresa module_id
  '10000000-0000-0000-0000-000000000014', -- users tab_id (parent)
  'gestion-roles',
  'Gestión de Roles',
  'Gestión de roles y permisos de usuarios',
  2,
  true
) ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  order_index = EXCLUDED.order_index;

-- Verificar que las tabs se crearon correctamente
SELECT 
  t.id,
  t.slug,
  t.name,
  t.parent_tab_id,
  pt.slug as parent_slug,
  m.slug as module_slug
FROM tabs t
LEFT JOIN tabs pt ON t.parent_tab_id = pt.id
JOIN modules m ON t.module_id = m.id
WHERE t.id IN (
  '10000000-0000-0000-0000-000000000141',
  '10000000-0000-0000-0000-000000000142'
)
ORDER BY t.order_index;
