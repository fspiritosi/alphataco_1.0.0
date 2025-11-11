-- ============================================
-- DATOS DE TESTING E2E - AÑO 2030
-- ============================================
-- Este archivo contiene datos de testing para E2E tests
-- Todos los datos están en el año 2030 para evitar conflictos
-- con datos reales y filtros por defecto
-- Company: GRUPO HORIZONTE SRL (be4119b0-12ca-4a8f-87ed-209239194dab)

-- ============================================
-- LIMPIEZA: Cambiar owner de InfinityBrozz
-- ============================================
-- Cambiar el owner de InfinityBrozz al usuario de testing
-- para que yordanpz@hotmail.com no sea owner
UPDATE company 
SET owner_id = '99999999-9999-9999-9999-999999999999'
WHERE id = '814f63ab-075f-49df-b3de-4ed87c9e596e';

-- ============================================
-- USUARIO DE TESTING
-- ============================================
-- Email: testing@e2e.com
-- Password: Testing123!
-- Este usuario tiene acceso completo a GRUPO HORIZONTE SRL

-- Crear usuario en auth.users
-- Password: Testing123! (hash generado con crypt)
INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    '99999999-9999-9999-9999-999999999999',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'testing@e2e.com',
    crypt('Testing123!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    false,
    '',
    '',
    '',
    ''
) ON CONFLICT (id) DO NOTHING;

-- Crear perfil del usuario
INSERT INTO profile (
    id,
    credential_id,
    email,
    fullname,
    role,
    modulos,
    created_at
) VALUES (
    '99999999-9999-9999-9999-999999999999',
    '99999999-9999-9999-9999-999999999999',
    'testing@e2e.com',
    'Usuario Testing E2E',
    'Administrador',
    '{empresa,empleados,equipos,documentación,mantenimiento,dashboard,ayuda,operaciones,formularios}',
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Asignar usuario a la company GRUPO HORIZONTE SRL
INSERT INTO share_company_users (
    id,
    profile_id,
    company_id,
    role,
    modules,
    created_at
) VALUES (
    '88888888-8888-8888-8888-888888888888',
    '99999999-9999-9999-9999-999999999999',
    'be4119b0-12ca-4a8f-87ed-209239194dab',
    'Administrador',
    '{empresa,empleados,equipos,documentación,mantenimiento,dashboard,ayuda,operaciones,formularios}',
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- DATOS DE TESTING
-- ============================================

-- Crear dailyreport para testing (2030-01-15)
INSERT INTO dailyreport (id, date, status, company_id, created_at) VALUES 
('11111111-1111-1111-1111-111111111111', '2030-01-15', 'abierto', 'be4119b0-12ca-4a8f-87ed-209239194dab', '2030-01-15T10:00:00+00:00')
ON CONFLICT (id) DO NOTHING;

-- Crear cliente de testing
INSERT INTO customers (id, name, cuit, address, client_phone, client_email, is_active, company_id, created_at) VALUES 
('22222222-2222-2222-2222-222222222222', 'Cliente Testing E2E', 20111222333, 'Av. Testing 1234', 1111111111, 'testing@e2e.com', true, 'be4119b0-12ca-4a8f-87ed-209239194dab', '2030-01-15T10:00:00+00:00')
ON CONFLICT (id) DO NOTHING;

-- Crear servicio de testing
INSERT INTO customer_services (id, customer_id, service_name, is_active, service_start, service_validity, contract_number, company_id, created_at) VALUES 
('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'Servicio Testing E2E', true, '2030-01-01', '2030-12-31', 'TEST-CONT-001', 'be4119b0-12ca-4a8f-87ed-209239194dab', '2030-01-15T10:00:00+00:00')
ON CONFLICT (id) DO NOTHING;

-- Crear ítem de servicio
INSERT INTO service_items (id, customer_service_id, item_name, item_description, item_price, item_measure_units, is_active, company_id, created_at) VALUES 
('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', 'Item Testing E2E', 'Descripción del item de testing', 100, 4, true, 'be4119b0-12ca-4a8f-87ed-209239194dab', '2030-01-15T10:00:00+00:00')
ON CONFLICT (id) DO NOTHING;

-- Crear empleado de testing
INSERT INTO employees (id, firstname, lastname, document_number, cuil, is_active, company_id, created_at, street, street_number, province, phone, file, date_of_admission, birthplace) VALUES 
('55555555-5555-5555-5555-555555555555', 'Juan', 'Testing', '99999999', '20-99999999-9', true, 'be4119b0-12ca-4a8f-87ed-209239194dab', '2030-01-15T10:00:00+00:00', 'Calle Test', '123', 1, '1111111111', 'TEST-001', '2030-01-01', (SELECT id FROM countries LIMIT 1))
ON CONFLICT (id) DO NOTHING;

-- Crear equipo de testing (tabla vehicles)
INSERT INTO vehicles (id, domain, engine, year, is_active, company_id, created_at, type_of_vehicle, type) VALUES 
('66666666-6666-6666-6666-666666666666', 'TEST999', 'Motor Testing', '2030', true, 'be4119b0-12ca-4a8f-87ed-209239194dab', '2030-01-15T10:00:00+00:00', 1, (SELECT id FROM type LIMIT 1))
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- ÁREAS DEL CLIENTE
-- ============================================
-- Crear 2 áreas para el cliente de testing
INSERT INTO areas_cliente (id, nombre, descripcion_corta, customer_id) VALUES
('55555555-5555-5555-5555-555555555555', 'Área Testing Norte', 'Área de prueba ubicada en zona norte', '22222222-2222-2222-2222-222222222222'),
('66666666-6666-6666-6666-666666666666', 'Área Testing Sur', 'Área de prueba ubicada en zona sur', '22222222-2222-2222-2222-222222222222')
ON CONFLICT (id) DO NOTHING;

-- Vincular las áreas al servicio de testing
INSERT INTO service_areas (service_id, area_id, id) VALUES
('33333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555', 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
('33333333-3333-3333-3333-333333333333', '66666666-6666-6666-6666-666666666666', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee')
ON CONFLICT (area_id, service_id, id) DO NOTHING;

-- ============================================
-- EMPLEADOS ADICIONALES
-- ============================================
-- Crear 2 empleados adicionales de testing
INSERT INTO employees (
    id, firstname, lastname, cuil, document_number, document_type,
    birthplace, gender, marital_status, level_of_education,
    street, street_number, province, city, postal_code,
    phone, email, file, date_of_admission, nationality,
    company_id, is_active, created_at
) VALUES
(
    '77777777-7777-7777-7777-777777777777',
    'Carlos',
    'Testing E2E',
    '20-11111111-1',
    '11111111',
    'DNI',
    (SELECT id FROM countries WHERE name = 'Argentina' LIMIT 1),
    'Masculino',
    'Soltero',
    'Secundario',
    'Calle Testing',
    '123',
    1,
    73,
    '1900',
    '1234567890',
    'carlos.testing@e2e.com',
    'EMP001',
    '2030-01-01',
    'Argentina',
    'be4119b0-12ca-4a8f-87ed-209239194dab',
    true,
    '2030-01-15T10:00:00+00:00'
),
(
    '88888888-8888-8888-8888-888888888888',
    'María',
    'Testing E2E',
    '27-22222222-2',
    '22222222',
    'DNI',
    (SELECT id FROM countries WHERE name = 'Argentina' LIMIT 1),
    'Femenino',
    'Casado',
    'Universitario',
    'Avenida Testing',
    '456',
    1,
    73,
    '1900',
    '0987654321',
    'maria.testing@e2e.com',
    'EMP002',
    '2030-01-01',
    'Argentina',
    'be4119b0-12ca-4a8f-87ed-209239194dab',
    true,
    '2030-01-15T10:00:00+00:00'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- EQUIPOS ADICIONALES
-- ============================================
-- Crear 2 vehículos adicionales de testing
INSERT INTO vehicles (
    id, domain, chassis, engine, serie, intern_number, year,
    brand, model, type_of_vehicle, type, company_id, is_active, created_at
) VALUES
(
    '99999999-9999-9999-9999-999999999999',
    'TEST001',
    'CHASSIS001',
    'ENGINE001',
    'SERIE001',
    'VEH-TEST-001',
    '2030',
    (SELECT id FROM brand_vehicles WHERE is_active = true LIMIT 1),
    (SELECT id FROM model_vehicles WHERE is_active = true LIMIT 1),
    1,
    (SELECT id FROM type WHERE is_active = true AND company_id = 'be4119b0-12ca-4a8f-87ed-209239194dab' LIMIT 1),
    'be4119b0-12ca-4a8f-87ed-209239194dab',
    true,
    '2030-01-15T10:00:00+00:00'
),
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'TEST002',
    'CHASSIS002',
    'ENGINE002',
    'SERIE002',
    'VEH-TEST-002',
    '2030',
    (SELECT id FROM brand_vehicles WHERE is_active = true OFFSET 1 LIMIT 1),
    (SELECT id FROM model_vehicles WHERE is_active = true OFFSET 1 LIMIT 1),
    1,
    (SELECT id FROM type WHERE is_active = true AND company_id = 'be4119b0-12ca-4a8f-87ed-209239194dab' OFFSET 1 LIMIT 1),
    'be4119b0-12ca-4a8f-87ed-209239194dab',
    true,
    '2030-01-15T10:00:00+00:00'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- VINCULACIONES CLIENTE-EMPLEADO-EQUIPO
-- ============================================
-- Vincular 1 empleado al cliente de testing (Carlos)
INSERT INTO contractor_employee (id, employee_id, contractor_id, created_at) VALUES
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '77777777-7777-7777-7777-777777777777', '22222222-2222-2222-2222-222222222222', '2030-01-15T10:00:00+00:00')
ON CONFLICT (id) DO NOTHING;

-- Vincular 1 equipo al cliente de testing (TEST001)
INSERT INTO contractor_equipment (id, equipment_id, contractor_id, created_at) VALUES
('cccccccc-cccc-cccc-cccc-cccccccccccc', '99999999-9999-9999-9999-999999999999', '22222222-2222-2222-2222-222222222222', '2030-01-15T10:00:00+00:00')
ON CONFLICT (id) DO NOTHING;

-- Nota: María (88888888...) y TEST002 (aaaaaaaa...) quedan sin vincular para testing

-- ============================================
-- REGISTRO INICIAL EN PARTE DIARIO
-- ============================================
-- Crear 1 registro inicial en el parte diario para testing
INSERT INTO dailyreportrows (id, customer_id, service_id, item_id, working_day, start_time, end_time, status, description, type_service, daily_report_id, created_at, updated_at) VALUES 
('77777777-7777-7777-7777-777777777777', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', 'jornada 8 horas', '08:00', '17:00', 'pendiente', 'Registro inicial de testing', 'mensual', '11111111-1111-1111-1111-111111111111', '2030-01-15T10:00:00+00:00', '2030-01-15T10:00:00+00:00')
ON CONFLICT (id) DO NOTHING;

-- Crear relación empleado-dailyreportrows
INSERT INTO dailyreportemployeerelations (daily_report_row_id, employee_id) VALUES 
('77777777-7777-7777-7777-777777777777', '55555555-5555-5555-5555-555555555555')
ON CONFLICT (id) DO NOTHING;

-- Crear relación equipo-dailyreportrows
INSERT INTO dailyreportequipmentrelations (daily_report_row_id, equipment_id) VALUES 
('77777777-7777-7777-7777-777777777777', '66666666-6666-6666-6666-666666666666')
ON CONFLICT (id) DO NOTHING;
