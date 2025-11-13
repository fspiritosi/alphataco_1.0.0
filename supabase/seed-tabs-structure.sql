-- ============================================
-- INSERTAR TABS Y SUBTABS PARA TODOS LOS MÓDULOS
-- Basado en cypress/MIGRATION_PLAN.md
-- ============================================

-- ============================================
-- 1. DASHBOARD (sin tabs)
-- ============================================
-- El dashboard no tiene tabs, es una vista única

-- ============================================
-- 2. EMPRESA
-- ============================================

-- Tab: general (5 subtabs)
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('10000000-0000-0000-0000-000000000001', '91ed9ae4-6713-41ac-a87e-6b156e079948', 'general', 'General', 'Configuración general de la empresa', 1, NULL)
ON CONFLICT (id) DO NOTHING;

-- Subtabs de general
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('10000000-0000-0000-0000-000000000011', '91ed9ae4-6713-41ac-a87e-6b156e079948', 'company', 'Empresa', 'Información de la empresa', 1, '10000000-0000-0000-0000-000000000001'),
('10000000-0000-0000-0000-000000000012', '91ed9ae4-6713-41ac-a87e-6b156e079948', 'cost-center', 'Centro de Costos', 'Gestión de centros de costos', 2, '10000000-0000-0000-0000-000000000001'),
('10000000-0000-0000-0000-000000000013', '91ed9ae4-6713-41ac-a87e-6b156e079948', 'organigrama', 'Organigrama', 'Estructura organizacional', 3, '10000000-0000-0000-0000-000000000001'),
('10000000-0000-0000-0000-000000000014', '91ed9ae4-6713-41ac-a87e-6b156e079948', 'users', 'Usuarios', 'Gestión de usuarios', 4, '10000000-0000-0000-0000-000000000001'),
('10000000-0000-0000-0000-000000000015', '91ed9ae4-6713-41ac-a87e-6b156e079948', 'documentacion', 'Documentación', 'Documentos de la empresa', 5, '10000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Tab: rrhh (6 subtabs)
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('10000000-0000-0000-0000-000000000002', '91ed9ae4-6713-41ac-a87e-6b156e079948', 'rrhh', 'RRHH', 'Recursos Humanos', 2, NULL)
ON CONFLICT (id) DO NOTHING;

-- Subtabs de rrhh
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('10000000-0000-0000-0000-000000000021', '91ed9ae4-6713-41ac-a87e-6b156e079948', 'listado', 'Listado', 'Tipos de diagramas', 1, '10000000-0000-0000-0000-000000000002'),
('10000000-0000-0000-0000-000000000022', '91ed9ae4-6713-41ac-a87e-6b156e079948', 'diagrams', 'Diagramas', 'Tipos de novedades', 2, '10000000-0000-0000-0000-000000000002'),
('10000000-0000-0000-0000-000000000023', '91ed9ae4-6713-41ac-a87e-6b156e079948', 'convenios', 'Convenios', 'CCT', 3, '10000000-0000-0000-0000-000000000002'),
('10000000-0000-0000-0000-000000000024', '91ed9ae4-6713-41ac-a87e-6b156e079948', 'contract-types', 'Tipos de Contrato', 'Gestión de tipos de contrato', 4, '10000000-0000-0000-0000-000000000002'),
('10000000-0000-0000-0000-000000000025', '91ed9ae4-6713-41ac-a87e-6b156e079948', 'positions', 'Puestos', 'Gestión de puestos', 5, '10000000-0000-0000-0000-000000000002'),
('10000000-0000-0000-0000-000000000026', '91ed9ae4-6713-41ac-a87e-6b156e079948', 'aptitudes', 'Aptitudes', 'Aptitudes técnicas', 6, '10000000-0000-0000-0000-000000000002')
ON CONFLICT (id) DO NOTHING;

-- Tab: vehicles (5 subtabs)
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('10000000-0000-0000-0000-000000000003', '91ed9ae4-6713-41ac-a87e-6b156e079948', 'vehicles', 'Vehículos', 'Configuración de vehículos', 3, NULL)
ON CONFLICT (id) DO NOTHING;

-- Subtabs de vehicles
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('10000000-0000-0000-0000-000000000031', '91ed9ae4-6713-41ac-a87e-6b156e079948', 'tipos', 'Tipos', 'Tipos de unidad', 1, '10000000-0000-0000-0000-000000000003'),
('10000000-0000-0000-0000-000000000032', '91ed9ae4-6713-41ac-a87e-6b156e079948', 'marcas', 'Marcas', 'Marcas de equipos', 2, '10000000-0000-0000-0000-000000000003'),
('10000000-0000-0000-0000-000000000033', '91ed9ae4-6713-41ac-a87e-6b156e079948', 'modelos', 'Modelos', 'Modelos de equipos', 3, '10000000-0000-0000-0000-000000000003'),
('10000000-0000-0000-0000-000000000034', '91ed9ae4-6713-41ac-a87e-6b156e079948', 'subtipos', 'Subtipos', 'Subtipos de equipos', 4, '10000000-0000-0000-0000-000000000003'),
('10000000-0000-0000-0000-000000000035', '91ed9ae4-6713-41ac-a87e-6b156e079948', 'titulares', 'Titulares', 'Titulares de equipos', 5, '10000000-0000-0000-0000-000000000003')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 3. EMPLEADOS
-- ============================================

-- Tab: employees (2 subtabs)
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('20000000-0000-0000-0000-000000000001', 'e0478383-1287-4b5e-a727-985baf867173', 'employees', 'Empleados', 'Gestión de empleados', 1, NULL)
ON CONFLICT (id) DO NOTHING;

-- Subtabs de employees
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('20000000-0000-0000-0000-000000000011', 'e0478383-1287-4b5e-a727-985baf867173', 'empleados-activos', 'Empleados Activos', 'Empleados activos', 1, '20000000-0000-0000-0000-000000000001'),
('20000000-0000-0000-0000-000000000012', 'e0478383-1287-4b5e-a727-985baf867173', 'empleados-inactivos', 'Empleados Inactivos', 'Empleados inactivos', 2, '20000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Tab: Documentos de empleados (2 subtabs)
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('20000000-0000-0000-0000-000000000002', 'e0478383-1287-4b5e-a727-985baf867173', 'documentos-de-empleados', 'Documentos de Empleados', 'Documentación de empleados', 2, NULL)
ON CONFLICT (id) DO NOTHING;

-- Subtabs de documentos de empleados
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('20000000-0000-0000-0000-000000000021', 'e0478383-1287-4b5e-a727-985baf867173', 'docs-empleados-permanentes', 'Permanentes', 'Documentos permanentes', 1, '20000000-0000-0000-0000-000000000002'),
('20000000-0000-0000-0000-000000000022', 'e0478383-1287-4b5e-a727-985baf867173', 'docs-empleados-mensuales', 'Mensuales', 'Documentos mensuales', 2, '20000000-0000-0000-0000-000000000002')
ON CONFLICT (id) DO NOTHING;

-- Tab: diagrams (4 subtabs)
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('20000000-0000-0000-0000-000000000003', 'e0478383-1287-4b5e-a727-985baf867173', 'diagrams', 'Diagramas', 'Gestión de diagramas', 3, NULL)
ON CONFLICT (id) DO NOTHING;

-- Subtabs de diagrams
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('20000000-0000-0000-0000-000000000031', 'e0478383-1287-4b5e-a727-985baf867173', 'old', 'Diagramas Cargados', 'Diagramas cargados', 1, '20000000-0000-0000-0000-000000000003'),
('20000000-0000-0000-0000-000000000032', 'e0478383-1287-4b5e-a727-985baf867173', 'new', 'Cargar Diagramas', 'Cargar nuevos diagramas', 2, '20000000-0000-0000-0000-000000000003'),
('20000000-0000-0000-0000-000000000033', 'e0478383-1287-4b5e-a727-985baf867173', 'massive_diagram', 'Carga Masiva', 'Carga masiva de diagramas', 3, '20000000-0000-0000-0000-000000000003'),
('20000000-0000-0000-0000-000000000034', 'e0478383-1287-4b5e-a727-985baf867173', 'reports', 'Reportes', 'Reportes de diagramas', 4, '20000000-0000-0000-0000-000000000003')
ON CONFLICT (id) DO NOTHING;

-- Tab: Tipos de documentos (sin subtabs)
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('20000000-0000-0000-0000-000000000004', 'e0478383-1287-4b5e-a727-985baf867173', 'tipos-de-documentos', 'Tipos de Documentos', 'Gestión de tipos de documentos', 4, NULL)
ON CONFLICT (id) DO NOTHING;

-- Tab: covenant (sin subtabs)
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('20000000-0000-0000-0000-000000000005', 'e0478383-1287-4b5e-a727-985baf867173', 'covenant', 'CCT', 'Convenios colectivos de trabajo', 5, NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 4. EQUIPOS
-- ============================================

-- Tab: equipos (3 subtabs)
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('30000000-0000-0000-0000-000000000001', '3c54a757-162c-4afc-8ea5-dca462f92e0c', 'equipos', 'Equipos', 'Gestión de equipos', 1, NULL)
ON CONFLICT (id) DO NOTHING;

-- Subtabs de equipos
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('30000000-0000-0000-0000-000000000011', '3c54a757-162c-4afc-8ea5-dca462f92e0c', 'vehicles', 'Vehículos', 'Vehículos', 1, '30000000-0000-0000-0000-000000000001'),
('30000000-0000-0000-0000-000000000012', '3c54a757-162c-4afc-8ea5-dca462f92e0c', 'others', 'Otros', 'Otros equipos', 2, '30000000-0000-0000-0000-000000000001'),
('30000000-0000-0000-0000-000000000013', '3c54a757-162c-4afc-8ea5-dca462f92e0c', 'inactive', 'Dados de Baja', 'Equipos dados de baja', 3, '30000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Tab: Documentos de equipos (2 subtabs)
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('30000000-0000-0000-0000-000000000002', '3c54a757-162c-4afc-8ea5-dca462f92e0c', 'documentos-de-equipos', 'Documentos de Equipos', 'Documentación de equipos', 2, NULL)
ON CONFLICT (id) DO NOTHING;

-- Subtabs de documentos de equipos
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('30000000-0000-0000-0000-000000000021', '3c54a757-162c-4afc-8ea5-dca462f92e0c', 'docs-equipos-permanentes', 'Permanentes', 'Documentos permanentes', 1, '30000000-0000-0000-0000-000000000002'),
('30000000-0000-0000-0000-000000000022', '3c54a757-162c-4afc-8ea5-dca462f92e0c', 'docs-equipos-mensuales', 'Mensuales', 'Documentos mensuales', 2, '30000000-0000-0000-0000-000000000002')
ON CONFLICT (id) DO NOTHING;

-- Tab: Tipos de documentos (sin subtabs)
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('30000000-0000-0000-0000-000000000003', '3c54a757-162c-4afc-8ea5-dca462f92e0c', 'tipos-de-documentos', 'Tipos de Documentos', 'Gestión de tipos de documentos', 3, NULL)
ON CONFLICT (id) DO NOTHING;

-- Tab: type_of_repairs (4 subtabs)
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('30000000-0000-0000-0000-000000000004', '3c54a757-162c-4afc-8ea5-dca462f92e0c', 'type_of_repairs', 'Mantenimiento', 'Gestión de mantenimiento', 4, NULL)
ON CONFLICT (id) DO NOTHING;

-- Subtabs de type_of_repairs
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('30000000-0000-0000-0000-000000000041', '3c54a757-162c-4afc-8ea5-dca462f92e0c', 'created_solicitudes', 'Solicitudes', 'Solicitudes de mantenimiento', 1, '30000000-0000-0000-0000-000000000004'),
('30000000-0000-0000-0000-000000000042', '3c54a757-162c-4afc-8ea5-dca462f92e0c', 'type_of_repair', 'Tipos de Reparación', 'Tipos de reparaciones', 2, '30000000-0000-0000-0000-000000000004'),
('30000000-0000-0000-0000-000000000043', '3c54a757-162c-4afc-8ea5-dca462f92e0c', 'type_of_repair_new_entry', 'Nueva Solicitud', 'Nueva solicitud de mantenimiento', 3, '30000000-0000-0000-0000-000000000004'),
('30000000-0000-0000-0000-000000000044', '3c54a757-162c-4afc-8ea5-dca462f92e0c', 'maintenance_groups', 'Grupos', 'Grupos de mantenimiento', 4, '30000000-0000-0000-0000-000000000004')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 5. COMERCIAL
-- ============================================

-- Tab: comerce (7 subtabs)
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('40000000-0000-0000-0000-000000000001', '34d7f9e5-7c01-4def-9446-6b3f52d761a0', 'comerce', 'Comercial', 'Gestión comercial', 1, NULL)
ON CONFLICT (id) DO NOTHING;

-- Subtabs de comerce
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('40000000-0000-0000-0000-000000000011', '34d7f9e5-7c01-4def-9446-6b3f52d761a0', 'customers', 'Clientes', 'Gestión de clientes', 1, '40000000-0000-0000-0000-000000000001'),
('40000000-0000-0000-0000-000000000012', '34d7f9e5-7c01-4def-9446-6b3f52d761a0', 'areas', 'Áreas', 'Gestión de áreas', 2, '40000000-0000-0000-0000-000000000001'),
('40000000-0000-0000-0000-000000000013', '34d7f9e5-7c01-4def-9446-6b3f52d761a0', 'equipment', 'Equipos del Cliente', 'Equipos del cliente', 3, '40000000-0000-0000-0000-000000000001'),
('40000000-0000-0000-0000-000000000014', '34d7f9e5-7c01-4def-9446-6b3f52d761a0', 'sector', 'Sectores', 'Gestión de sectores', 4, '40000000-0000-0000-0000-000000000001'),
('40000000-0000-0000-0000-000000000015', '34d7f9e5-7c01-4def-9446-6b3f52d761a0', 'service', 'Contratos/Servicios', 'Gestión de contratos y servicios', 5, '40000000-0000-0000-0000-000000000001'),
('40000000-0000-0000-0000-000000000016', '34d7f9e5-7c01-4def-9446-6b3f52d761a0', 'mensure_units', 'Unidades de Medida', 'Unidades de medida', 6, '40000000-0000-0000-0000-000000000001'),
('40000000-0000-0000-0000-000000000017', '34d7f9e5-7c01-4def-9446-6b3f52d761a0', 'daily_reports', 'Partes Diarios', 'Partes diarios', 7, '40000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 6. DOCUMENTACIÓN
-- ============================================

-- Tab: Documentos de empleados (2 subtabs)
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('50000000-0000-0000-0000-000000000001', '92bfac14-dc5b-41be-b366-740bfbeaea13', 'documentos-de-empleados', 'Documentos de Empleados', 'Documentación de empleados', 1, NULL)
ON CONFLICT (id) DO NOTHING;

-- Subtabs de documentos de empleados
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('50000000-0000-0000-0000-000000000011', '92bfac14-dc5b-41be-b366-740bfbeaea13', 'empleados-permanentes', 'Permanentes', 'Documentos permanentes', 1, '50000000-0000-0000-0000-000000000001'),
('50000000-0000-0000-0000-000000000012', '92bfac14-dc5b-41be-b366-740bfbeaea13', 'empleados-mensuales', 'Mensuales', 'Documentos mensuales', 2, '50000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Tab: Documentos de equipos (2 subtabs)
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('50000000-0000-0000-0000-000000000002', '92bfac14-dc5b-41be-b366-740bfbeaea13', 'documentos-de-equipos', 'Documentos de Equipos', 'Documentación de equipos', 2, NULL)
ON CONFLICT (id) DO NOTHING;

-- Subtabs de documentos de equipos
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('50000000-0000-0000-0000-000000000021', '92bfac14-dc5b-41be-b366-740bfbeaea13', 'equipos-permanentes', 'Permanentes', 'Documentos permanentes', 1, '50000000-0000-0000-0000-000000000002'),
('50000000-0000-0000-0000-000000000022', '92bfac14-dc5b-41be-b366-740bfbeaea13', 'equipos-mensuales', 'Mensuales', 'Documentos mensuales', 2, '50000000-0000-0000-0000-000000000002')
ON CONFLICT (id) DO NOTHING;

-- Tab: Documentos de empresa (2 subtabs)
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('50000000-0000-0000-0000-000000000003', '92bfac14-dc5b-41be-b366-740bfbeaea13', 'documentos-de-empresa', 'Documentos de Empresa', 'Documentación de empresa', 3, NULL)
ON CONFLICT (id) DO NOTHING;

-- Subtabs de documentos de empresa
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('50000000-0000-0000-0000-000000000031', '92bfac14-dc5b-41be-b366-740bfbeaea13', 'empresa-permanentes', 'Permanentes', 'Documentos permanentes', 1, '50000000-0000-0000-0000-000000000003'),
('50000000-0000-0000-0000-000000000032', '92bfac14-dc5b-41be-b366-740bfbeaea13', 'empresa-mensuales', 'Mensuales', 'Documentos mensuales', 2, '50000000-0000-0000-0000-000000000003')
ON CONFLICT (id) DO NOTHING;

-- Tab: Tipos de documentos (sin subtabs)
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('50000000-0000-0000-0000-000000000004', '92bfac14-dc5b-41be-b366-740bfbeaea13', 'tipos-de-documentos', 'Tipos de Documentos', 'Gestión de tipos de documentos', 4, NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 7. MANTENIMIENTO
-- ============================================

-- Tab: type_of_repairs (4 subtabs)
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('60000000-0000-0000-0000-000000000001', '4783f7df-3580-4f54-bf8f-6ef7f252d038', 'type_of_repairs', 'Mantenimiento', 'Gestión de mantenimiento', 1, NULL)
ON CONFLICT (id) DO NOTHING;

-- Subtabs de type_of_repairs
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('60000000-0000-0000-0000-000000000011', '4783f7df-3580-4f54-bf8f-6ef7f252d038', 'created_solicitudes', 'Solicitudes', 'Solicitudes de mantenimiento', 1, '60000000-0000-0000-0000-000000000001'),
('60000000-0000-0000-0000-000000000012', '4783f7df-3580-4f54-bf8f-6ef7f252d038', 'type_of_repair', 'Tipos de Reparación', 'Tipos de reparaciones', 2, '60000000-0000-0000-0000-000000000001'),
('60000000-0000-0000-0000-000000000013', '4783f7df-3580-4f54-bf8f-6ef7f252d038', 'type_of_repair_new_entry', 'Nueva Solicitud', 'Nueva solicitud de mantenimiento', 3, '60000000-0000-0000-0000-000000000001'),
('60000000-0000-0000-0000-000000000014', '4783f7df-3580-4f54-bf8f-6ef7f252d038', 'maintenance_groups', 'Grupos', 'Grupos de mantenimiento', 4, '60000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 8. OPERACIONES
-- ============================================

-- Tab: Preparte (sin subtabs)
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('70000000-0000-0000-0000-000000000001', '421e96da-5235-4857-bf81-e63336447f13', 'preparte', 'Preparte', 'Gestor de pedidos', 1, NULL)
ON CONFLICT (id) DO NOTHING;

-- Tab: dailyReportsTable (sin subtabs)
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('70000000-0000-0000-0000-000000000002', '421e96da-5235-4857-bf81-e63336447f13', 'dailyreportstable', 'Partes Diarios', 'Tabla de partes diarios', 2, NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 9. FORMULARIOS
-- ============================================

-- Tab: formularios (sin subtabs)
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('80000000-0000-0000-0000-000000000001', '5563157e-fc3e-470f-b90b-dadd7cc38417', 'formularios', 'Formularios', 'Gestión de formularios', 1, NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 10. AYUDA
-- ============================================
-- El módulo de ayuda no tiene tabs, es una vista única

-- ============================================
-- RESUMEN
-- ============================================
-- Total de tabs principales: 28
-- Total de subtabs: 44
-- Total general: 72 tabs
