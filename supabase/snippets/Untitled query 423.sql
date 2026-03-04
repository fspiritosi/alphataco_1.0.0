
  -- 1. Crear la acción 'view_all_requests'
  INSERT INTO actions (id, slug, name)
  VALUES (
    gen_random_uuid(),
    'view_all_requests',
    'Ver todas las solicitudes'
  )
  ON CONFLICT (slug) DO NOTHING;

  -- 2. Asignar el permiso a los roles que deben ver TODAS las solicitudes
  --    (Super Admin, Admin, Full Access Provisional, Administrador, Administrador Mantenimiento, Administrador Operaciones)
  INSERT INTO role_permissions (role_id, tab_id, action_id)
  SELECT r.id, t.id, a.id
  FROM roles r
  CROSS JOIN tabs t
  CROSS JOIN actions a
  WHERE r.id IN (1, 2, 9, 10, 16, 17)  -- Super Admin, Admin, Administrador, Full Access Provisional, Admin Mant., Admin Ops.
    AND t.slug IN ('maintenance_requests', 'pendientes_ejecutar', 'para_taller')
    AND a.slug = 'view_all_requests'
  ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;