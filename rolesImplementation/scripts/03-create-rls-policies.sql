-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================
-- Políticas de seguridad para proteger los datos

-- Habilitar RLS en todas las tablas
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE tabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS PARA MÓDULOS
-- =====================================================
-- Todos pueden ver módulos activos
CREATE POLICY "Anyone can view active modules"
  ON modules FOR SELECT
  USING (is_active = true);

-- Solo admins pueden modificar módulos
CREATE POLICY "Only admins can modify modules"
  ON modules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.slug = 'admin'
    )
  );

-- =====================================================
-- POLÍTICAS PARA TABS
-- =====================================================
-- Todos pueden ver tabs activas
CREATE POLICY "Anyone can view active tabs"
  ON tabs FOR SELECT
  USING (is_active = true);

-- Solo admins pueden modificar tabs
CREATE POLICY "Only admins can modify tabs"
  ON tabs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.slug = 'admin'
    )
  );

-- =====================================================
-- POLÍTICAS PARA ACCIONES
-- =====================================================
-- Todos pueden ver acciones
CREATE POLICY "Anyone can view actions"
  ON actions FOR SELECT
  USING (true);

-- =====================================================
-- POLÍTICAS PARA ROLES
-- =====================================================
-- Todos pueden ver roles activos
CREATE POLICY "Anyone can view active roles"
  ON roles FOR SELECT
  USING (is_active = true);

-- Solo admins pueden modificar roles
CREATE POLICY "Only admins can modify roles"
  ON roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.slug = 'admin'
    )
  );

-- =====================================================
-- POLÍTICAS PARA PERMISOS DE ROLES
-- =====================================================
-- Todos pueden ver permisos de roles
CREATE POLICY "Anyone can view role permissions"
  ON role_permissions FOR SELECT
  USING (true);

-- Solo admins pueden modificar permisos de roles
CREATE POLICY "Only admins can modify role permissions"
  ON role_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.slug = 'admin'
    )
  );

-- =====================================================
-- POLÍTICAS PARA ASIGNACIÓN DE ROLES A USUARIOS
-- =====================================================
-- Los usuarios pueden ver sus propios roles
CREATE POLICY "Users can view their own roles"
  ON user_roles FOR SELECT
  USING (user_id = auth.uid());

-- Admins pueden ver todos los roles de usuarios
CREATE POLICY "Admins can view all user roles"
  ON user_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.slug = 'admin'
    )
  );

-- Solo admins pueden asignar roles
CREATE POLICY "Only admins can assign roles"
  ON user_roles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.slug = 'admin'
    )
  );

-- Solo admins pueden eliminar roles de usuarios
CREATE POLICY "Only admins can remove user roles"
  ON user_roles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.slug = 'admin'
    )
  );

-- =====================================================
-- POLÍTICAS PARA PERMISOS PERSONALIZADOS
-- =====================================================
-- Los usuarios pueden ver sus propios permisos
CREATE POLICY "Users can view their own permissions"
  ON user_permissions FOR SELECT
  USING (user_id = auth.uid());

-- Admins pueden ver todos los permisos
CREATE POLICY "Admins can view all user permissions"
  ON user_permissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.slug = 'admin'
    )
  );

-- Solo admins pueden modificar permisos personalizados
CREATE POLICY "Only admins can modify user permissions"
  ON user_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.slug = 'admin'
    )
  );
