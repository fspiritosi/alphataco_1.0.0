-- =====================================================
-- DATOS INICIALES - SISTEMA DE PERMISOS
-- =====================================================

-- =====================================================
-- 1. INSERTAR ACCIONES CRUD
-- =====================================================
INSERT INTO actions (name, slug, description) VALUES
  ('Ver', 'view', 'Permiso para ver/leer información'),
  ('Crear', 'create', 'Permiso para crear nuevos registros'),
  ('Editar', 'update', 'Permiso para modificar registros existentes'),
  ('Eliminar', 'delete', 'Permiso para eliminar registros')
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- 2. INSERTAR MÓDULOS
-- =====================================================
INSERT INTO modules (name, slug, icon, description, order_index) VALUES
  ('Dashboard', 'dashboard', 'LayoutDashboard', 'Panel principal con métricas y estadísticas', 1),
  ('Usuarios', 'users', 'Users', 'Gestión de usuarios del sistema', 2),
  ('Productos', 'products', 'Package', 'Catálogo y gestión de productos', 3),
  ('Pedidos', 'orders', 'ShoppingCart', 'Gestión de pedidos y ventas', 4),
  ('Reportes', 'reports', 'BarChart', 'Reportes y análisis de datos', 5),
  ('Configuración', 'settings', 'Settings', 'Configuración del sistema', 6)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- 3. INSERTAR TABS POR MÓDULO
-- =====================================================

-- Tabs del módulo Dashboard
INSERT INTO tabs (module_id, name, slug, description, order_index)
SELECT id, 'Resumen', 'overview', 'Vista general del dashboard', 1
FROM modules WHERE slug = 'dashboard'
ON CONFLICT (module_id, slug) DO NOTHING;

INSERT INTO tabs (module_id, name, slug, description, order_index)
SELECT id, 'Métricas', 'metrics', 'Métricas y KPIs', 2
FROM modules WHERE slug = 'dashboard'
ON CONFLICT (module_id, slug) DO NOTHING;

-- Tabs del módulo Usuarios
INSERT INTO tabs (module_id, name, slug, description, order_index)
SELECT id, 'Lista', 'list', 'Lista de usuarios', 1
FROM modules WHERE slug = 'users'
ON CONFLICT (module_id, slug) DO NOTHING;

INSERT INTO tabs (module_id, name, slug, description, order_index)
SELECT id, 'Permisos', 'permissions', 'Gestión de permisos', 2
FROM modules WHERE slug = 'users'
ON CONFLICT (module_id, slug) DO NOTHING;

INSERT INTO tabs (module_id, name, slug, description, order_index)
SELECT id, 'Actividad', 'activity', 'Registro de actividad', 3
FROM modules WHERE slug = 'users'
ON CONFLICT (module_id, slug) DO NOTHING;

-- Tabs del módulo Productos
INSERT INTO tabs (module_id, name, slug, description, order_index)
SELECT id, 'Catálogo', 'catalog', 'Catálogo de productos', 1
FROM modules WHERE slug = 'products'
ON CONFLICT (module_id, slug) DO NOTHING;

INSERT INTO tabs (module_id, name, slug, description, order_index)
SELECT id, 'Inventario', 'inventory', 'Control de inventario', 2
FROM modules WHERE slug = 'products'
ON CONFLICT (module_id, slug) DO NOTHING;

INSERT INTO tabs (module_id, name, slug, description, order_index)
SELECT id, 'Categorías', 'categories', 'Gestión de categorías', 3
FROM modules WHERE slug = 'products'
ON CONFLICT (module_id, slug) DO NOTHING;

-- Tabs del módulo Pedidos
INSERT INTO tabs (module_id, name, slug, description, order_index)
SELECT id, 'Todos', 'all', 'Todos los pedidos', 1
FROM modules WHERE slug = 'orders'
ON CONFLICT (module_id, slug) DO NOTHING;

INSERT INTO tabs (module_id, name, slug, description, order_index)
SELECT id, 'Pendientes', 'pending', 'Pedidos pendientes', 2
FROM modules WHERE slug = 'orders'
ON CONFLICT (module_id, slug) DO NOTHING;

INSERT INTO tabs (module_id, name, slug, description, order_index)
SELECT id, 'Historial', 'history', 'Historial de pedidos', 3
FROM modules WHERE slug = 'orders'
ON CONFLICT (module_id, slug) DO NOTHING;

-- Tabs del módulo Reportes
INSERT INTO tabs (module_id, name, slug, description, order_index)
SELECT id, 'Ventas', 'sales', 'Reportes de ventas', 1
FROM modules WHERE slug = 'reports'
ON CONFLICT (module_id, slug) DO NOTHING;

INSERT INTO tabs (module_id, name, slug, description, order_index)
SELECT id, 'Financiero', 'financial', 'Reportes financieros', 2
FROM modules WHERE slug = 'reports'
ON CONFLICT (module_id, slug) DO NOTHING;

-- Tabs del módulo Configuración
INSERT INTO tabs (module_id, name, slug, description, order_index)
SELECT id, 'General', 'general', 'Configuración general', 1
FROM modules WHERE slug = 'settings'
ON CONFLICT (module_id, slug) DO NOTHING;

INSERT INTO tabs (module_id, name, slug, description, order_index)
SELECT id, 'Seguridad', 'security', 'Configuración de seguridad', 2
FROM modules WHERE slug = 'settings'
ON CONFLICT (module_id, slug) DO NOTHING;

-- =====================================================
-- 4. INSERTAR ROLES PREDEFINIDOS
-- =====================================================
INSERT INTO roles (name, slug, description, color, is_system) VALUES
  ('Administrador', 'admin', 'Acceso completo a todo el sistema', 'red', true),
  ('Editor', 'editor', 'Puede crear y editar contenido', 'blue', true),
  ('Visor', 'viewer', 'Solo puede ver información', 'green', true),
  ('Soporte', 'support', 'Acceso a usuarios y pedidos', 'purple', true)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- 5. ASIGNAR PERMISOS AL ROL ADMINISTRADOR (todos)
-- =====================================================
INSERT INTO role_permissions (role_id, tab_id, action_id)
SELECT 
  r.id as role_id,
  t.id as tab_id,
  a.id as action_id
FROM roles r
CROSS JOIN tabs t
CROSS JOIN actions a
WHERE r.slug = 'admin'
ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;

-- =====================================================
-- 6. ASIGNAR PERMISOS AL ROL EDITOR
-- =====================================================
-- Editor: Ver, Crear y Editar en productos, pedidos y dashboard
INSERT INTO role_permissions (role_id, tab_id, action_id)
SELECT 
  r.id as role_id,
  t.id as tab_id,
  a.id as action_id
FROM roles r
CROSS JOIN tabs t
CROSS JOIN actions a
JOIN modules m ON t.module_id = m.id
WHERE r.slug = 'editor'
  AND m.slug IN ('dashboard', 'products', 'orders')
  AND a.slug IN ('view', 'create', 'update')
ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;

-- =====================================================
-- 7. ASIGNAR PERMISOS AL ROL VISOR
-- =====================================================
-- Visor: Solo ver en todos los módulos
INSERT INTO role_permissions (role_id, tab_id, action_id)
SELECT 
  r.id as role_id,
  t.id as tab_id,
  a.id as action_id
FROM roles r
CROSS JOIN tabs t
CROSS JOIN actions a
WHERE r.slug = 'viewer'
  AND a.slug = 'view'
ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;

-- =====================================================
-- 8. ASIGNAR PERMISOS AL ROL SOPORTE
-- =====================================================
-- Soporte: Ver y editar usuarios y pedidos
INSERT INTO role_permissions (role_id, tab_id, action_id)
SELECT 
  r.id as role_id,
  t.id as tab_id,
  a.id as action_id
FROM roles r
CROSS JOIN tabs t
CROSS JOIN actions a
JOIN modules m ON t.module_id = m.id
WHERE r.slug = 'support'
  AND m.slug IN ('users', 'orders')
  AND a.slug IN ('view', 'update')
ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;
