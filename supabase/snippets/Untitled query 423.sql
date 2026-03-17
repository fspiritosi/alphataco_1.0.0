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















  


    INSERT INTO actions (id, slug, name) VALUES
    ('f1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c', 'view_private', 'Ver privados'),
    ('a5b6c7d8-e9f0-4a1b-2c3d-4e5f6a7b8c9d', 'upload_private', 'Subir privados')
  ON CONFLICT (id) DO NOTHING;

  -- 2. Asignar al rol admin (id=2) en las tabs de documentos
  INSERT INTO role_permissions (role_id, tab_id, action_id) VALUES
    -- documentos-de-empleados: view_private + upload_private
    (2, '50000000-0000-0000-0000-000000000001', 'f1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c'),
    (2, '50000000-0000-0000-0000-000000000001', 'a5b6c7d8-e9f0-4a1b-2c3d-4e5f6a7b8c9d'),
    -- documentos-de-equipos: view_private + upload_private
    (2, '50000000-0000-0000-0000-000000000002', 'f1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c'),
    (2, '50000000-0000-0000-0000-000000000002', 'a5b6c7d8-e9f0-4a1b-2c3d-4e5f6a7b8c9d'),
    -- documentos-de-empresa: view_private + upload_private
    (2, '50000000-0000-0000-0000-000000000003', 'f1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c'),
    (2, '50000000-0000-0000-0000-000000000003', 'a5b6c7d8-e9f0-4a1b-2c3d-4e5f6a7b8c9d'),
    -- tipos-docs-personas: solo view_private (no se suben docs aquí)
    (2, '60000000-0000-0000-0000-000000000006', 'f1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c'),
    -- tipos-docs-equipos: solo view_private
    (2, '60000000-0000-0000-0000-000000000007', 'f1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c'),
    -- tipos-docs-empresa: solo view_private
    (2, '60000000-0000-0000-0000-000000000018', 'f1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c')
  ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;