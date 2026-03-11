

   -- 1. Insertar tab padre: empresa-mantenimiento (subtab de "general")
  INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
  ('10000000-0000-0000-0000-000000000016', 'e0478383-1287-4b5e-a727-985baf867173', 'empresa_mantenimiento',
  'Mantenimiento', 'Configuración de mantenimiento', 6, '10000000-0000-0000-0000-000000000001')
  ON CONFLICT (id) DO NOTHING;

  -- 2. Insertar subtabs de empresa-mantenimiento
  INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
  ('10000000-0000-0000-0000-000000000161', 'e0478383-1287-4b5e-a727-985baf867173', 'talleres', 'Talleres', 'Gestión
  de talleres', 1, '10000000-0000-0000-0000-000000000016'),
  ('10000000-0000-0000-0000-000000000162', 'e0478383-1287-4b5e-a727-985baf867173', 'sectores_taller', 'Sectores',
  'Gestión de sectores de taller', 2, '10000000-0000-0000-0000-000000000016')
  ON CONFLICT (id) DO NOTHING;

  -- 3. Permisos para Full Access Provisional (role_id = 10)
  -- empresa-mantenimiento: solo view
  INSERT INTO role_permissions (role_id, tab_id, action_id)
  SELECT 10, '10000000-0000-0000-0000-000000000016', a.id
  FROM actions a WHERE a.slug IN ('view')
  ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;

  -- talleres: view, create, update, delete
  INSERT INTO role_permissions (role_id, tab_id, action_id)
  SELECT 10, '10000000-0000-0000-0000-000000000161', a.id
  FROM actions a WHERE a.slug IN ('view', 'create', 'update', 'delete')
  ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;

  -- sectores_taller: view, create, update, delete
  INSERT INTO role_permissions (role_id, tab_id, action_id)
  SELECT 10, '10000000-0000-0000-0000-000000000162', a.id
  FROM actions a WHERE a.slug IN ('view', 'create', 'update', 'delete')
  ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;






    INSERT INTO types_of_repairs (id, name, description, is_active, company_id)
  VALUES (
    '00000000-0000-0000-0000-d1a900571c00',
    'Diagnóstico',
    'Tipo de reparación reservado para items de diagnóstico generados automáticamente por el sistema',
    true,
    NULL
  )
  ON CONFLICT (id) DO NOTHING;