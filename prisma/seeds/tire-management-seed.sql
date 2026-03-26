-- ============================================================================
-- SEED: Tire Management Test Data
-- ============================================================================
-- Run with: npx prisma db execute --file prisma/seeds/tire-management-seed.sql

-- ============================================================================
-- 1. MORE TIRE BRANDS
-- ============================================================================
INSERT INTO tire_brands (id, name, company_id, is_active) VALUES
  ('b0000001-aaaa-bbbb-cccc-000000000001', 'Bridgestone', 'be4119b0-12ca-4a8f-87ed-209239194dab', true),
  ('b0000001-aaaa-bbbb-cccc-000000000002', 'Firestone', 'be4119b0-12ca-4a8f-87ed-209239194dab', true),
  ('b0000001-aaaa-bbbb-cccc-000000000003', 'Michelin', 'be4119b0-12ca-4a8f-87ed-209239194dab', true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 2. TIRES (30 total)
-- ============================================================================
INSERT INTO tires (id, serial_number, brand_id, size, is_new, retread_level, tread_type, tread_depth, status, company_id, is_active, updated_at) VALUES
  ('a1000001-1111-2222-3333-000000000001', 'FT001', '419d21f5-c866-4385-b331-1efc8fc411ea', '295', true, NULL, 'BLOCK', 100, 'AVAILABLE', 'be4119b0-12ca-4a8f-87ed-209239194dab', true, NOW()),
  ('a1000001-1111-2222-3333-000000000002', 'FT002', '419d21f5-c866-4385-b331-1efc8fc411ea', '295', true, NULL, 'BLOCK', 100, 'AVAILABLE', 'be4119b0-12ca-4a8f-87ed-209239194dab', true, NOW()),
  ('a1000001-1111-2222-3333-000000000003', 'FT003', '419d21f5-c866-4385-b331-1efc8fc411ea', '295', true, NULL, 'MIXED', 95, 'AVAILABLE', 'be4119b0-12ca-4a8f-87ed-209239194dab', true, NOW()),
  ('a1000001-1111-2222-3333-000000000004', 'FT004', '419d21f5-c866-4385-b331-1efc8fc411ea', '295', false, 'FIRST', 'BLOCK', 80, 'AVAILABLE', 'be4119b0-12ca-4a8f-87ed-209239194dab', true, NOW()),
  ('a1000001-1111-2222-3333-000000000005', 'FT005', '419d21f5-c866-4385-b331-1efc8fc411ea', '295', false, 'FIRST', 'MIXED', 75, 'AVAILABLE', 'be4119b0-12ca-4a8f-87ed-209239194dab', true, NOW()),
  ('a1000001-1111-2222-3333-000000000006', 'FT006', '419d21f5-c866-4385-b331-1efc8fc411ea', '275', true, NULL, 'SMOOTH', 100, 'AVAILABLE', 'be4119b0-12ca-4a8f-87ed-209239194dab', true, NOW()),
  ('a1000001-1111-2222-3333-000000000007', 'FT007', '419d21f5-c866-4385-b331-1efc8fc411ea', '275', true, NULL, 'SMOOTH', 100, 'AVAILABLE', 'be4119b0-12ca-4a8f-87ed-209239194dab', true, NOW()),
  ('a1000001-1111-2222-3333-000000000008', 'FT008', '419d21f5-c866-4385-b331-1efc8fc411ea', '275', false, 'SECOND', 'SMOOTH', 60, 'IN_REPAIR', 'be4119b0-12ca-4a8f-87ed-209239194dab', true, NOW()),
  ('a1000001-1111-2222-3333-000000000009', 'CO001', 'ae09cb18-333a-4fbc-8fc8-88cc0b89b9b8', '295', true, NULL, 'BLOCK', 100, 'AVAILABLE', 'be4119b0-12ca-4a8f-87ed-209239194dab', true, NOW()),
  ('a1000001-1111-2222-3333-000000000010', 'CO002', 'ae09cb18-333a-4fbc-8fc8-88cc0b89b9b8', '295', true, NULL, 'MIXED', 90, 'AVAILABLE', 'be4119b0-12ca-4a8f-87ed-209239194dab', true, NOW()),
  ('a1000001-1111-2222-3333-000000000011', 'CO003', 'ae09cb18-333a-4fbc-8fc8-88cc0b89b9b8', '295', false, 'FIRST', 'BLOCK', 70, 'AVAILABLE', 'be4119b0-12ca-4a8f-87ed-209239194dab', true, NOW()),
  ('a1000001-1111-2222-3333-000000000012', 'CO004', 'ae09cb18-333a-4fbc-8fc8-88cc0b89b9b8', '275', true, NULL, 'SMOOTH', 100, 'AVAILABLE', 'be4119b0-12ca-4a8f-87ed-209239194dab', true, NOW()),
  ('a1000001-1111-2222-3333-000000000013', 'CO005', 'ae09cb18-333a-4fbc-8fc8-88cc0b89b9b8', '275', true, NULL, 'SMOOTH', 95, 'AVAILABLE', 'be4119b0-12ca-4a8f-87ed-209239194dab', true, NOW()),
  ('a1000001-1111-2222-3333-000000000014', 'BR001', 'b0000001-aaaa-bbbb-cccc-000000000001', '295', true, NULL, 'BLOCK', 100, 'AVAILABLE', 'be4119b0-12ca-4a8f-87ed-209239194dab', true, NOW()),
  ('a1000001-1111-2222-3333-000000000015', 'BR002', 'b0000001-aaaa-bbbb-cccc-000000000001', '295', true, NULL, 'MIXED', 100, 'AVAILABLE', 'be4119b0-12ca-4a8f-87ed-209239194dab', true, NOW()),
  ('a1000001-1111-2222-3333-000000000016', 'BR003', 'b0000001-aaaa-bbbb-cccc-000000000001', '315', true, NULL, 'BLOCK', 100, 'AVAILABLE', 'be4119b0-12ca-4a8f-87ed-209239194dab', true, NOW()),
  ('a1000001-1111-2222-3333-000000000017', 'BR004', 'b0000001-aaaa-bbbb-cccc-000000000001', '315', false, 'FIRST', 'BLOCK', 85, 'AVAILABLE', 'be4119b0-12ca-4a8f-87ed-209239194dab', true, NOW()),
  ('a1000001-1111-2222-3333-000000000018', 'FS001', 'b0000001-aaaa-bbbb-cccc-000000000002', '295', true, NULL, 'BLOCK', 100, 'AVAILABLE', 'be4119b0-12ca-4a8f-87ed-209239194dab', true, NOW()),
  ('a1000001-1111-2222-3333-000000000019', 'FS002', 'b0000001-aaaa-bbbb-cccc-000000000002', '295', false, 'SECOND', 'MIXED', 55, 'AVAILABLE', 'be4119b0-12ca-4a8f-87ed-209239194dab', true, NOW()),
  ('a1000001-1111-2222-3333-000000000020', 'FS003', 'b0000001-aaaa-bbbb-cccc-000000000002', '275', true, NULL, 'SMOOTH', 100, 'AVAILABLE', 'be4119b0-12ca-4a8f-87ed-209239194dab', true, NOW()),
  ('a1000001-1111-2222-3333-000000000021', 'MI001', 'b0000001-aaaa-bbbb-cccc-000000000003', '295', true, NULL, 'BLOCK', 100, 'AVAILABLE', 'be4119b0-12ca-4a8f-87ed-209239194dab', true, NOW()),
  ('a1000001-1111-2222-3333-000000000022', 'MI002', 'b0000001-aaaa-bbbb-cccc-000000000003', '295', true, NULL, 'MIXED', 100, 'AVAILABLE', 'be4119b0-12ca-4a8f-87ed-209239194dab', true, NOW()),
  ('a1000001-1111-2222-3333-000000000023', 'MI003', 'b0000001-aaaa-bbbb-cccc-000000000003', '315', true, NULL, 'BLOCK', 100, 'AVAILABLE', 'be4119b0-12ca-4a8f-87ed-209239194dab', true, NOW()),
  -- INSTALLED tires
  ('a1000001-1111-2222-3333-000000000024', 'FT100', '419d21f5-c866-4385-b331-1efc8fc411ea', '275', true, NULL, 'SMOOTH', 90, 'INSTALLED', 'be4119b0-12ca-4a8f-87ed-209239194dab', true, NOW()),
  ('a1000001-1111-2222-3333-000000000025', 'FT101', '419d21f5-c866-4385-b331-1efc8fc411ea', '275', true, NULL, 'SMOOTH', 88, 'INSTALLED', 'be4119b0-12ca-4a8f-87ed-209239194dab', true, NOW()),
  ('a1000001-1111-2222-3333-000000000026', 'CO100', 'ae09cb18-333a-4fbc-8fc8-88cc0b89b9b8', '295', true, NULL, 'BLOCK', 85, 'INSTALLED', 'be4119b0-12ca-4a8f-87ed-209239194dab', true, NOW()),
  ('a1000001-1111-2222-3333-000000000027', 'CO101', 'ae09cb18-333a-4fbc-8fc8-88cc0b89b9b8', '295', true, NULL, 'BLOCK', 82, 'INSTALLED', 'be4119b0-12ca-4a8f-87ed-209239194dab', true, NOW()),
  ('a1000001-1111-2222-3333-000000000028', 'CO102', 'ae09cb18-333a-4fbc-8fc8-88cc0b89b9b8', '295', false, 'FIRST', 'MIXED', 70, 'INSTALLED', 'be4119b0-12ca-4a8f-87ed-209239194dab', true, NOW()),
  ('a1000001-1111-2222-3333-000000000029', 'CO103', 'ae09cb18-333a-4fbc-8fc8-88cc0b89b9b8', '295', false, 'FIRST', 'BLOCK', 65, 'INSTALLED', 'be4119b0-12ca-4a8f-87ed-209239194dab', true, NOW()),
  -- DISCARDED
  ('a1000001-1111-2222-3333-000000000030', 'FT200', '419d21f5-c866-4385-b331-1efc8fc411ea', '295', false, 'THIRD', 'BLOCK', 10, 'DISCARDED', 'be4119b0-12ca-4a8f-87ed-209239194dab', true, NOW())
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 3. TEMPLATES
-- ============================================================================
-- Template A: Tractor 3 ejes
INSERT INTO tire_templates (id, name, description, company_id, is_active) VALUES
  ('aaa00001-1111-2222-3333-000000000001', 'Tractor 3 ejes', 'Tractor con eje de dirección simple y 2 ejes de tracción duales. 1 auxilio.', 'be4119b0-12ca-4a8f-87ed-209239194dab', true)
ON CONFLICT DO NOTHING;

INSERT INTO tire_template_axles (id, template_id, axle_number, tires_per_side, tire_size, is_drive_axle, is_spare) VALUES
  ('aaa10001-1111-2222-3333-000000000001', 'aaa00001-1111-2222-3333-000000000001', 1, 1, '275', false, false),
  ('aaa10001-1111-2222-3333-000000000002', 'aaa00001-1111-2222-3333-000000000001', 2, 2, '295', true, false),
  ('aaa10001-1111-2222-3333-000000000003', 'aaa00001-1111-2222-3333-000000000001', 3, 2, '295', false, false),
  ('aaa10001-1111-2222-3333-000000000004', 'aaa00001-1111-2222-3333-000000000001', 4, 1, '295', false, true)
ON CONFLICT DO NOTHING;

-- Template B: Semi 3 ejes
INSERT INTO tire_templates (id, name, description, company_id, is_active) VALUES
  ('aaa00001-1111-2222-3333-000000000002', 'Semi 3 ejes', 'Semirremolque con 3 ejes duales de carga. 1 auxilio.', 'be4119b0-12ca-4a8f-87ed-209239194dab', true)
ON CONFLICT DO NOTHING;

INSERT INTO tire_template_axles (id, template_id, axle_number, tires_per_side, tire_size, is_drive_axle, is_spare) VALUES
  ('aaa20001-1111-2222-3333-000000000001', 'aaa00001-1111-2222-3333-000000000002', 1, 2, '295', false, false),
  ('aaa20001-1111-2222-3333-000000000002', 'aaa00001-1111-2222-3333-000000000002', 2, 2, '295', false, false),
  ('aaa20001-1111-2222-3333-000000000003', 'aaa00001-1111-2222-3333-000000000002', 3, 2, '295', false, false),
  ('aaa20001-1111-2222-3333-000000000004', 'aaa00001-1111-2222-3333-000000000002', 4, 1, '295', false, true)
ON CONFLICT DO NOTHING;

-- Template C: Pick Up 2 ejes
INSERT INTO tire_templates (id, name, description, company_id, is_active) VALUES
  ('aaa00001-1111-2222-3333-000000000003', 'Pick Up 2 ejes', 'Pick up con 2 ejes simples. Sin auxilio.', 'be4119b0-12ca-4a8f-87ed-209239194dab', true)
ON CONFLICT DO NOTHING;

INSERT INTO tire_template_axles (id, template_id, axle_number, tires_per_side, tire_size, is_drive_axle, is_spare) VALUES
  ('aaa30001-1111-2222-3333-000000000001', 'aaa00001-1111-2222-3333-000000000003', 1, 1, '275', false, false),
  ('aaa30001-1111-2222-3333-000000000002', 'aaa00001-1111-2222-3333-000000000003', 2, 1, '275', true, false)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 4. ASSIGN TEMPLATES TO SUB_TYPES
-- (Templates now live on sub_types, not individual vehicles)
-- ============================================================================
-- Set template on the sub_type of each test vehicle (if they share a sub_type)
-- Vehicle f2d0b7e0 (AA486OK tractor): set its sub_type to use Tractor 3 ejes template
UPDATE sub_type SET tire_template_id = 'aaa00001-1111-2222-3333-000000000001'
  WHERE id = (SELECT "subType" FROM vehicles WHERE id = 'f2d0b7e0-1e2a-47d0-ad6e-8cd7c9ee6258')
  AND tire_template_id IS NULL;

-- Vehicle 28447923 (semi): set its sub_type to use Semi 3 ejes template
UPDATE sub_type SET tire_template_id = 'aaa00001-1111-2222-3333-000000000002'
  WHERE id = (SELECT "subType" FROM vehicles WHERE id = '28447923-eb6d-43a0-839c-953154efa0e8')
  AND tire_template_id IS NULL;

-- Vehicle b435dd86 (pick up): set its sub_type to use Pick Up 2 ejes template
UPDATE sub_type SET tire_template_id = 'aaa00001-1111-2222-3333-000000000003'
  WHERE id = (SELECT "subType" FROM vehicles WHERE id = 'b435dd86-2e6f-44cb-a542-a826931830d2')
  AND tire_template_id IS NULL;

-- ============================================================================
-- 5. POSITIONS FOR AA486OK (Tractor 3 ejes — partial load)
-- ============================================================================
INSERT INTO vehicle_tire_positions (id, vehicle_id, template_axle_id, position_number, axle_number, side, tire_id, updated_at) VALUES
  ('bbb00001-1111-2222-3333-000000000001', 'f2d0b7e0-1e2a-47d0-ad6e-8cd7c9ee6258', 'aaa10001-1111-2222-3333-000000000001', 1, 1, 'LEFT', 'a1000001-1111-2222-3333-000000000024', NOW()),
  ('bbb00001-1111-2222-3333-000000000002', 'f2d0b7e0-1e2a-47d0-ad6e-8cd7c9ee6258', 'aaa10001-1111-2222-3333-000000000001', 2, 1, 'RIGHT', 'a1000001-1111-2222-3333-000000000025', NOW()),
  ('bbb00001-1111-2222-3333-000000000003', 'f2d0b7e0-1e2a-47d0-ad6e-8cd7c9ee6258', 'aaa10001-1111-2222-3333-000000000002', 3, 2, 'LEFT', 'a1000001-1111-2222-3333-000000000026', NOW()),
  ('bbb00001-1111-2222-3333-000000000004', 'f2d0b7e0-1e2a-47d0-ad6e-8cd7c9ee6258', 'aaa10001-1111-2222-3333-000000000002', 4, 2, 'LEFT', 'a1000001-1111-2222-3333-000000000027', NOW()),
  ('bbb00001-1111-2222-3333-000000000005', 'f2d0b7e0-1e2a-47d0-ad6e-8cd7c9ee6258', 'aaa10001-1111-2222-3333-000000000002', 5, 2, 'RIGHT', 'a1000001-1111-2222-3333-000000000028', NOW()),
  ('bbb00001-1111-2222-3333-000000000006', 'f2d0b7e0-1e2a-47d0-ad6e-8cd7c9ee6258', 'aaa10001-1111-2222-3333-000000000002', 6, 2, 'RIGHT', 'a1000001-1111-2222-3333-000000000029', NOW()),
  ('bbb00001-1111-2222-3333-000000000007', 'f2d0b7e0-1e2a-47d0-ad6e-8cd7c9ee6258', 'aaa10001-1111-2222-3333-000000000003', 7, 3, 'LEFT', NULL, NOW()),
  ('bbb00001-1111-2222-3333-000000000008', 'f2d0b7e0-1e2a-47d0-ad6e-8cd7c9ee6258', 'aaa10001-1111-2222-3333-000000000003', 8, 3, 'LEFT', NULL, NOW()),
  ('bbb00001-1111-2222-3333-000000000009', 'f2d0b7e0-1e2a-47d0-ad6e-8cd7c9ee6258', 'aaa10001-1111-2222-3333-000000000003', 9, 3, 'RIGHT', NULL, NOW()),
  ('bbb00001-1111-2222-3333-000000000010', 'f2d0b7e0-1e2a-47d0-ad6e-8cd7c9ee6258', 'aaa10001-1111-2222-3333-000000000003', 10, 3, 'RIGHT', NULL, NOW()),
  ('bbb00001-1111-2222-3333-000000000011', 'f2d0b7e0-1e2a-47d0-ad6e-8cd7c9ee6258', 'aaa10001-1111-2222-3333-000000000004', 11, 4, 'SPARE', NULL, NOW())
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 6. POSITIONS FOR AA575GV (Pick Up — all empty)
-- ============================================================================
INSERT INTO vehicle_tire_positions (id, vehicle_id, template_axle_id, position_number, axle_number, side, tire_id, updated_at) VALUES
  ('bbb00002-1111-2222-3333-000000000001', 'b435dd86-2e6f-44cb-a542-a826931830d2', 'aaa30001-1111-2222-3333-000000000001', 1, 1, 'LEFT', NULL, NOW()),
  ('bbb00002-1111-2222-3333-000000000002', 'b435dd86-2e6f-44cb-a542-a826931830d2', 'aaa30001-1111-2222-3333-000000000001', 2, 1, 'RIGHT', NULL, NOW()),
  ('bbb00002-1111-2222-3333-000000000003', 'b435dd86-2e6f-44cb-a542-a826931830d2', 'aaa30001-1111-2222-3333-000000000002', 3, 2, 'LEFT', NULL, NOW()),
  ('bbb00002-1111-2222-3333-000000000004', 'b435dd86-2e6f-44cb-a542-a826931830d2', 'aaa30001-1111-2222-3333-000000000002', 4, 2, 'RIGHT', NULL, NOW())
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 7. SERVICE ORDER (closed)
-- ============================================================================
INSERT INTO tire_service_orders (id, vehicle_id, trailer_vehicle_id, kilometer, service_date, status, created_by, company_id, closed_at) VALUES
  ('ccc00001-1111-2222-3333-000000000001', 'f2d0b7e0-1e2a-47d0-ad6e-8cd7c9ee6258', NULL, '45230', '2026-03-20 10:00:00+00', 'CLOSED', 'efba0906-a078-49dc-a799-060c7109c872', 'be4119b0-12ca-4a8f-87ed-209239194dab', '2026-03-20 11:30:00+00')
ON CONFLICT DO NOTHING;

INSERT INTO tire_service_items (id, service_order_id, position_number, vehicle_id, action, tire_id, new_tire_id, old_tire_destination, tread_depth, pressure_start, pressure_end, observations) VALUES
  ('ddd00001-1111-2222-3333-000000000001', 'ccc00001-1111-2222-3333-000000000001', 1, 'f2d0b7e0-1e2a-47d0-ad6e-8cd7c9ee6258', 'CALIBRATE', 'a1000001-1111-2222-3333-000000000024', NULL, NULL, 90, 95.0, 110.0, 'Presión baja, se calibró'),
  ('ddd00001-1111-2222-3333-000000000002', 'ccc00001-1111-2222-3333-000000000001', 2, 'f2d0b7e0-1e2a-47d0-ad6e-8cd7c9ee6258', 'CALIBRATE', 'a1000001-1111-2222-3333-000000000025', NULL, NULL, 88, 100.0, 110.0, NULL),
  ('ddd00001-1111-2222-3333-000000000003', 'ccc00001-1111-2222-3333-000000000001', 3, 'f2d0b7e0-1e2a-47d0-ad6e-8cd7c9ee6258', 'REPLACE', 'a1000001-1111-2222-3333-000000000030', 'a1000001-1111-2222-3333-000000000026', 'DISCARD', 85, NULL, NULL, 'Cubierta vieja con desgaste excesivo')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 8. SERVICE ORDER (open — with trailer)
-- ============================================================================
INSERT INTO tire_service_orders (id, vehicle_id, trailer_vehicle_id, kilometer, service_date, status, created_by, company_id) VALUES
  ('ccc00001-1111-2222-3333-000000000002', 'f2d0b7e0-1e2a-47d0-ad6e-8cd7c9ee6258', '28447923-eb6d-43a0-839c-953154efa0e8', '46100', '2026-03-25 08:00:00+00', 'OPEN', 'efba0906-a078-49dc-a799-060c7109c872', 'be4119b0-12ca-4a8f-87ed-209239194dab')
ON CONFLICT DO NOTHING;
