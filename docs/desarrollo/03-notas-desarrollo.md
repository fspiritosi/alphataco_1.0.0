Mostrar el historico luego del KPI (historico de KPI)
Si el KPI vence no se muestra el grafico

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

---

-- =====================================================
-- ASIGNAR ROL OWNER A TODOS LOS OWNERS DE EMPRESAS EXISTENTES
-- =====================================================
-- Esta query asigna el rol OWNER a todos los usuarios que son owners
-- de empresas existentes en el sistema

DO $$
DECLARE
v_owner_role_id BIGINT;
v_inserted_count INTEGER := 0;
v_skipped_count INTEGER := 0;
BEGIN
-- Obtener el ID del rol OWNER
SELECT id INTO v_owner_role_id
FROM roles
WHERE slug = 'owner'
LIMIT 1;

-- Si no existe el rol OWNER, no hacer nada
IF v_owner_role_id IS NULL THEN
RAISE EXCEPTION 'Rol OWNER no encontrado. Ejecuta primero la migración para crear el rol.';
END IF;

-- Contar cuántos owners únicos ya tenían el rol antes de la asignación
SELECT COUNT(DISTINCT c.owner_id) INTO v_skipped_count
FROM company c
WHERE c.owner_id IS NOT NULL
AND EXISTS (
SELECT 1
FROM user_roles ur
WHERE ur.user_id = c.owner_id
AND ur.role_id = v_owner_role_id
);

-- Asignar el rol OWNER a todos los owners únicos que no lo tienen (una vez por usuario)
INSERT INTO user_roles (user_id, role_id)
SELECT DISTINCT c.owner_id, v_owner_role_id
FROM company c
WHERE c.owner_id IS NOT NULL
AND NOT EXISTS (
SELECT 1
FROM user_roles ur
WHERE ur.user_id = c.owner_id
AND ur.role_id = v_owner_role_id
);

-- Contar cuántos roles se asignaron
GET DIAGNOSTICS v_inserted_count = ROW_COUNT;

-- Asegurar acceso en share_company_users para todas las empresas
INSERT INTO share_company_users (company_id, profile_id)
SELECT c.id, c.owner_id
FROM company c
WHERE c.owner_id IS NOT NULL
AND NOT EXISTS (
SELECT 1
FROM share_company_users scu
WHERE scu.company_id = c.id
AND scu.profile_id = c.owner_id
);

-- Mostrar resumen
RAISE NOTICE 'Proceso completado:';
RAISE NOTICE ' - Roles asignados (nuevos): %', v_inserted_count;
RAISE NOTICE ' - Roles ya existentes (omitidos): %', v_skipped_count;
END $$;

-- =====================================================
-- INSERTAR SUBTABS DE KPIs
-- =====================================================
-- Este script agrega las subtabs de KPIs: indicadores y graficos
-- Módulo: empresa (module_id: e0478383-1287-4b5e-a727-985baf867173)
-- Tab padre: kpis (tab_id: 10000000-0000-0000-0000-000000000004)

-- Insertar subtabs de KPIs
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('10000000-0000-0000-0000-000000000041', 'e0478383-1287-4b5e-a727-985baf867173', 'indicadores', 'Indicadores', 'CRUD de indicadores KPI', 1, '10000000-0000-0000-0000-000000000004'),
('10000000-0000-0000-0000-000000000042', 'e0478383-1287-4b5e-a727-985baf867173', 'graficos', 'Gráficos', 'Gráficos de ejemplo de KPIs', 2, '10000000-0000-0000-0000-000000000004')
ON CONFLICT (id) DO UPDATE
SET
slug = EXCLUDED.slug,
name = EXCLUDED.name,
description = EXCLUDED.description,
order_index = EXCLUDED.order_index,
parent_tab_id = EXCLUDED.parent_tab_id;

-- =====================================================
-- ASIGNAR PERMISOS A LAS SUBTABS DE KPIs PARA EL ROL OWNER
-- =====================================================
-- Asignar todos los permisos (view, create, update) a la subtab "indicadores"
INSERT INTO role_permissions (role_id, tab_id, action_id)
SELECT
r.id as role_id,
t.id as tab_id,
a.id as action_id
FROM roles r
CROSS JOIN tabs t
CROSS JOIN actions a
WHERE r.slug = 'owner'
AND t.slug = 'indicadores'
AND t.parent_tab_id = '10000000-0000-0000-0000-000000000004'
AND a.slug IN ('view', 'create', 'update')
ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;

-- Asignar permiso de view a la subtab "graficos"
INSERT INTO role_permissions (role_id, tab_id, action_id)
SELECT
r.id as role_id,
t.id as tab_id,
a.id as action_id
FROM roles r
CROSS JOIN tabs t
CROSS JOIN actions a
WHERE r.slug = 'owner'
AND t.slug = 'graficos'
AND t.parent_tab_id = '10000000-0000-0000-0000-000000000004'
AND a.slug = 'view'
ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;

-- =====================================================
-- ELIMINAR SUBTABS DE KPIs (si es necesario)
-- =====================================================
-- Para eliminar las subtabs de KPIs, primero eliminar los permisos asociados
-- DELETE FROM role_permissions
-- WHERE tab_id IN (
-- '10000000-0000-0000-0000-000000000041',
-- '10000000-0000-0000-0000-000000000042'
-- );

-- Luego eliminar las tabs
-- DELETE FROM tabs
-- WHERE id IN (
-- '10000000-0000-0000-0000-000000000041',
-- '10000000-0000-0000-0000-000000000042'
-- );
