-- ============================================
-- AGREGAR TABS DE DETALLE PARA EMPLEADOS Y EQUIPOS
-- ============================================
-- Este archivo agrega las tabs necesarias para las vistas de detalle
-- de empleados y equipos, permitiendo control de permisos granular.
-- ============================================

-- ============================================
-- TABS DE DETALLE PARA EMPLEADOS
-- ============================================

-- Tab principal: detalle-empleado
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id, is_active) VALUES
('20000000-0000-0000-0000-000000000006', '3c54a757-162c-4afc-8ea5-dca462f92e0c', 'detalle-empleado', 'Detalle de Empleado', 'Vista de detalle para crear/editar empleado', 6, NULL, true)
ON CONFLICT (id) DO NOTHING;

-- Subtabs de detalle-empleado
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id, is_active) VALUES
('20000000-0000-0000-0000-000000000061', '3c54a757-162c-4afc-8ea5-dca462f92e0c', 'datos-personales', 'Datos Personales', 'Información personal del empleado', 1, '20000000-0000-0000-0000-000000000006', true),
('20000000-0000-0000-0000-000000000062', '3c54a757-162c-4afc-8ea5-dca462f92e0c', 'datos-contacto', 'Datos de Contacto', 'Información de contacto del empleado', 2, '20000000-0000-0000-0000-000000000006', true),
('20000000-0000-0000-0000-000000000063', '3c54a757-162c-4afc-8ea5-dca462f92e0c', 'datos-laborales', 'Datos Laborales', 'Información laboral del empleado', 3, '20000000-0000-0000-0000-000000000006', true),
('20000000-0000-0000-0000-000000000064', '3c54a757-162c-4afc-8ea5-dca462f92e0c', 'documentacion-empleado', 'Documentación', 'Documentos del empleado', 4, '20000000-0000-0000-0000-000000000006', true),
('20000000-0000-0000-0000-000000000065', '3c54a757-162c-4afc-8ea5-dca462f92e0c', 'diagramas-empleado', 'Diagramas', 'Diagramas del empleado', 5, '20000000-0000-0000-0000-000000000006', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- TABS DE DETALLE PARA EQUIPOS
-- ============================================

-- Tab principal: detalle-equipo
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id, is_active) VALUES
('30000000-0000-0000-0000-000000000005', '34d7f9e5-7c01-4def-9446-6b3f52d761a0', 'detalle-equipo', 'Detalle de Equipo', 'Vista de detalle para crear/editar equipo', 5, NULL, true)
ON CONFLICT (id) DO NOTHING;

-- Subtabs de detalle-equipo
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id, is_active) VALUES
('30000000-0000-0000-0000-000000000051', '34d7f9e5-7c01-4def-9446-6b3f52d761a0', 'datos-basicos', 'Datos Básicos', 'Información básica del equipo', 1, '30000000-0000-0000-0000-000000000005', true),
('30000000-0000-0000-0000-000000000052', '34d7f9e5-7c01-4def-9446-6b3f52d761a0', 'asignacion', 'Asignación', 'Asignación del equipo', 2, '30000000-0000-0000-0000-000000000005', true),
('30000000-0000-0000-0000-000000000053', '34d7f9e5-7c01-4def-9446-6b3f52d761a0', 'documentos-equipo', 'Documentos', 'Documentos del equipo', 3, '30000000-0000-0000-0000-000000000005', true),
('30000000-0000-0000-0000-000000000054', '34d7f9e5-7c01-4def-9446-6b3f52d761a0', 'reparaciones', 'Reparaciones', 'Reparaciones del equipo', 4, '30000000-0000-0000-0000-000000000005', true),
('30000000-0000-0000-0000-000000000055', '34d7f9e5-7c01-4def-9446-6b3f52d761a0', 'qr-equipo', 'QR', 'Código QR del equipo', 5, '30000000-0000-0000-0000-000000000005', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Verificar tabs de empleados
SELECT 
  t.slug,
  t.name,
  t.parent_tab_id,
  CASE WHEN t.parent_tab_id IS NULL THEN 'Tab Principal' ELSE 'Subtab' END as tipo
FROM tabs t
WHERE t.module_id = '3c54a757-162c-4afc-8ea5-dca462f92e0c'
  AND (t.slug = 'detalle-empleado' OR t.parent_tab_id = '20000000-0000-0000-0000-000000000006')
ORDER BY t.parent_tab_id NULLS FIRST, t.order_index;

-- Verificar tabs de equipos
SELECT 
  t.slug,
  t.name,
  t.parent_tab_id,
  CASE WHEN t.parent_tab_id IS NULL THEN 'Tab Principal' ELSE 'Subtab' END as tipo
FROM tabs t
WHERE t.module_id = '34d7f9e5-7c01-4def-9446-6b3f52d761a0'
  AND (t.slug = 'detalle-equipo' OR t.parent_tab_id = '30000000-0000-0000-0000-000000000005')
ORDER BY t.parent_tab_id NULLS FIRST, t.order_index;
