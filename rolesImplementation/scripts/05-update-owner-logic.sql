-- =====================================================
-- 5. UPDATE OWNER LOGIC
-- =====================================================

-- 1. Insertar Rol 'Propietario' (Sistema)
INSERT INTO roles (name, slug, description, color, is_system, is_active)
VALUES ('Propietario', 'owner', 'Acceso total al sistema', '#000000', true, true)
ON CONFLICT (slug) DO NOTHING;

-- 2. Actualizar user_has_permission para bypass de Owner
CREATE OR REPLACE FUNCTION user_has_permission(
  p_user_id UUID,
  p_module_slug VARCHAR,
  p_tab_slug VARCHAR,
  p_action_slug VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
  has_permission BOOLEAN;
  is_owner BOOLEAN;
BEGIN
  -- Verificar si es Owner
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_user_id AND r.slug = 'owner'
  ) INTO is_owner;

  IF is_owner THEN
    RETURN true;
  END IF;

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

-- 3. Actualizar get_user_permissions para devolver todo si es Owner
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
  source VARCHAR -- 'role', 'custom', 'owner'
) AS $$
DECLARE
  is_owner BOOLEAN;
BEGIN
  -- Verificar si es Owner
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_user_id AND r.slug = 'owner'
  ) INTO is_owner;

  IF is_owner THEN
    RETURN QUERY
    SELECT
      m.id as module_id,
      m.name as module_name,
      m.slug as module_slug,
      t.id as tab_id,
      t.name as tab_name,
      t.slug as tab_slug,
      a.id as action_id,
      a.name as action_name,
      a.slug as action_slug,
      'owner'::VARCHAR as source
    FROM modules m
    CROSS JOIN tabs t
    CROSS JOIN actions a
    WHERE m.is_active = true
      AND t.is_active = true
      AND t.module_id = m.id; -- Ensure tabs belong to modules
    RETURN;
  END IF;

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

-- 4. Actualizar get_user_accessible_modules para Owner
CREATE OR REPLACE FUNCTION get_user_accessible_modules(p_user_id UUID)
RETURNS TABLE (
  module_id UUID,
  module_name VARCHAR,
  module_slug VARCHAR,
  module_icon VARCHAR,
  module_order INTEGER
) AS $$
DECLARE
  is_owner BOOLEAN;
BEGIN
  -- Verificar si es Owner
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_user_id AND r.slug = 'owner'
  ) INTO is_owner;

  IF is_owner THEN
    RETURN QUERY
    SELECT
      m.id,
      m.name,
      m.slug,
      m.icon,
      m.order_index
    FROM modules m
    WHERE m.is_active = true
    ORDER BY m.order_index;
    RETURN;
  END IF;

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
