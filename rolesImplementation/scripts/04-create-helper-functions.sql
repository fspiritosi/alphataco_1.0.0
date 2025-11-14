-- =====================================================
-- FUNCIONES HELPER PARA CONSULTAS DE PERMISOS
-- =====================================================

-- =====================================================
-- 1. FUNCIÓN: Obtener todos los permisos de un usuario
-- =====================================================
-- Combina permisos de roles + permisos personalizados
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS TABLE (
  module_id UUID,
  module_name VARCHAR,
  module_slug VARCHAR,
  tab_id UUID,
  tab_name VARCHAR,
  tab_slug VARCHAR,
  action_id UUID,
  action_name VARCHAR,
  action_slug VARCHAR,
  source VARCHAR -- 'role' o 'custom'
) AS $$
BEGIN
  RETURN QUERY
  -- Permisos desde roles
  SELECT DISTINCT
    m.id as module_id,
    m.name as module_name,
    m.slug as module_slug,
    t.id as tab_id,
    t.name as tab_name,
    t.slug as tab_slug,
    a.id as action_id,
    a.name as action_name,
    a.slug as action_slug,
    'role'::VARCHAR as source
  FROM user_roles ur
  JOIN role_permissions rp ON ur.role_id = rp.role_id
  JOIN tabs t ON rp.tab_id = t.id
  JOIN modules m ON t.module_id = m.id
  JOIN actions a ON rp.action_id = a.id
  WHERE ur.user_id = p_user_id
    AND m.is_active = true
    AND t.is_active = true
  
  UNION
  
  -- Permisos personalizados (solo los concedidos)
  SELECT DISTINCT
    m.id as module_id,
    m.name as module_name,
    m.slug as module_slug,
    t.id as tab_id,
    t.name as tab_name,
    t.slug as tab_slug,
    a.id as action_id,
    a.name as action_name,
    a.slug as action_slug,
    'custom'::VARCHAR as source
  FROM user_permissions up
  JOIN tabs t ON up.tab_id = t.id
  JOIN modules m ON t.module_id = m.id
  JOIN actions a ON up.action_id = a.id
  WHERE up.user_id = p_user_id
    AND up.is_granted = true
    AND m.is_active = true
    AND t.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. FUNCIÓN: Verificar si un usuario tiene un permiso específico
-- =====================================================
CREATE OR REPLACE FUNCTION user_has_permission(
  p_user_id UUID,
  p_module_slug VARCHAR,
  p_tab_slug VARCHAR,
  p_action_slug VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
  has_permission BOOLEAN;
BEGIN
  -- Verificar si el usuario tiene el permiso desde roles o permisos personalizados
  SELECT EXISTS (
    SELECT 1
    FROM get_user_permissions(p_user_id) up
    WHERE up.module_slug = p_module_slug
      AND up.tab_slug = p_tab_slug
      AND up.action_slug = p_action_slug
  ) INTO has_permission;
  
  RETURN has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. FUNCIÓN: Obtener módulos accesibles por un usuario
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_accessible_modules(p_user_id UUID)
RETURNS TABLE (
  module_id UUID,
  module_name VARCHAR,
  module_slug VARCHAR,
  module_icon VARCHAR,
  module_order INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    m.id,
    m.name,
    m.slug,
    m.icon,
    m.order_index
  FROM get_user_permissions(p_user_id) up
  JOIN modules m ON up.module_id = m.id
  WHERE m.is_active = true
  ORDER BY m.order_index;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. FUNCIÓN: Obtener resumen de permisos por role
-- =====================================================
CREATE OR REPLACE FUNCTION get_role_permissions_summary(p_role_id UUID)
RETURNS TABLE (
  module_name VARCHAR,
  tab_name VARCHAR,
  actions TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.name as module_name,
    t.name as tab_name,
    array_agg(a.name ORDER BY a.name) as actions
  FROM role_permissions rp
  JOIN tabs t ON rp.tab_id = t.id
  JOIN modules m ON t.module_id = m.id
  JOIN actions a ON rp.action_id = a.id
  WHERE rp.role_id = p_role_id
  GROUP BY m.name, t.name, m.order_index, t.order_index
  ORDER BY m.order_index, t.order_index;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMENTARIOS EN LAS FUNCIONES
-- =====================================================
COMMENT ON FUNCTION get_user_permissions IS 'Obtiene todos los permisos de un usuario (roles + personalizados)';
COMMENT ON FUNCTION user_has_permission IS 'Verifica si un usuario tiene un permiso específico';
COMMENT ON FUNCTION get_user_accessible_modules IS 'Obtiene los módulos a los que un usuario tiene acceso';
COMMENT ON FUNCTION get_role_permissions_summary IS 'Obtiene un resumen de permisos de un role';
