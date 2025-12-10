Mostrar el historico luego del KPI (historico de KPI)
Si el KPI vence no se muestra el grafico

## COD-164: Implementación de KPIs

### Queries de INSERT para tabs y permisos

```sql
-- Insertar tab de KPIs en el módulo Empresa
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id)
VALUES (
  '10000000-0000-0000-0000-000000000004',
  'e0478383-1287-4b5e-a727-985baf867173',
  'kpis',
  'KPIs',
  'Indicadores clave de desempeño',
  4,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  order_index = EXCLUDED.order_index;

-- Insertar permisos para la tab de KPIs (view, create, update)
-- Asignar permisos a roles: owner, admin, super-admin
INSERT INTO role_permissions (role_id, tab_id, action_id)
SELECT
  r.id as role_id,
  '10000000-0000-0000-0000-000000000004'::uuid as tab_id,
  a.id as action_id
FROM roles r
CROSS JOIN actions a
WHERE a.slug IN ('view', 'create', 'update')
  AND r.slug IN ('owner', 'admin', 'super-admin')
ON CONFLICT DO NOTHING;
```

### Estructura de tablas creadas

- **kpis**: Tabla principal de KPIs con campos para número, vigencia, fórmula, soporte técnico y oportunidades de mejora
  - Campos: id, company_id, name, code, number, validity_date, calculation_formula, technical_support, improvement_opportunities, filters (jsonb), is_active, created_at, updated_at
- **kpi_revisions**: Historial de revisiones cuando se modifica número o fecha de vigencia
  - Campos: id, kpi_id, previous_number, new_number, previous_validity_date, new_validity_date, change_reason, changed_by, is_active, created_at

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
