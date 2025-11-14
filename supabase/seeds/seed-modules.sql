-- ============================================
-- INSERTAR MÓDULOS DEL SISTEMA
-- Basado en src/features/Layout/sidebar/constants/navigation.tsx
-- ============================================

-- Insertar módulos con IDs fijos para referencia en tabs
INSERT INTO modules (id, name, slug, description, icon, order_index, is_active, price, created_at, updated_at) VALUES
-- 1. Dashboard
('91ed9ae4-6713-41ac-a87e-6b156e079948', 'Dashboard', 'dashboard', 'Panel principal del sistema', 'LayoutDashboard', 1, true, 0, now(), now()),

-- 2. Empresa
('e0478383-1287-4b5e-a727-985baf867173', 'Empresa', 'empresa', 'Gestión de empresa y configuración', 'Building2', 2, true, 0, now(), now()),

-- 3. Empleados
('3c54a757-162c-4afc-8ea5-dca462f92e0c', 'Empleados', 'empleados', 'Gestión de empleados y recursos humanos', 'Users', 3, true, 0, now(), now()),

-- 4. Equipos
('34d7f9e5-7c01-4def-9446-6b3f52d761a0', 'Equipos', 'equipos', 'Gestión de equipos y vehículos', 'Truck', 4, true, 0, now(), now()),

-- 5. Comercial
('92bfac14-dc5b-41be-b366-740bfbeaea13', 'Comercial', 'comercial', 'Gestión comercial y clientes', 'HandshakeIcon', 5, true, 0, now(), now()),

-- 6. Documentación
('4783f7df-3580-4f54-bf8f-6ef7f252d038', 'Documentación', 'documentacion', 'Gestión de documentos', 'FileText', 6, true, 0, now(), now()),

-- 7. Mantenimiento
('421e96da-5235-4857-bf81-e63336447f13', 'Mantenimiento', 'mantenimiento', 'Gestión de mantenimiento', 'Wrench', 7, true, 0, now(), now()),

-- 8. Operaciones
('5563157e-fc3e-470f-b90b-dadd7cc38417', 'Operaciones', 'operaciones', 'Gestión de operaciones diarias', 'Calendar', 8, true, 0, now(), now()),

-- 9. Formularios
('6674268f-0d4f-581f-c91c-ebbe8dd49528', 'Formularios', 'formularios', 'Gestión de formularios personalizados', 'ClipboardList', 9, true, 0, now(), now()),

-- 10. Ayuda
('7785379f-1e5f-692f-da2d-fccf9ee5af39', 'Ayuda', 'ayuda', 'Centro de ayuda y soporte', 'HelpCircle', 10, true, 0, now(), now())

ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    order_index = EXCLUDED.order_index,
    is_active = EXCLUDED.is_active,
    updated_at = now();
