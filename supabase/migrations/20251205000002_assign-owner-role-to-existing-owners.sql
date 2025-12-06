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
  RAISE NOTICE '  - Roles asignados (nuevos): %', v_inserted_count;
  RAISE NOTICE '  - Roles ya existentes (omitidos): %', v_skipped_count;
END $$;

