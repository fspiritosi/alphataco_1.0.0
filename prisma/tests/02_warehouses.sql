-- Almacenes (etapa 1): tablas y las reglas que viven SOLO en la base (CHECK e indices que
-- Prisma no modela, ver migracion 20261004100000_warehouses_core). El motor de stock valida
-- antes y da el mensaje; estos tests prueban la red de seguridad.
-- 23514 = check_violation, 23505 = unique_violation.
BEGIN;

SELECT plan(23);

SELECT has_table('public', 'warehouses', 'existe warehouses');
SELECT has_table('public', 'material_categories', 'existe material_categories');
SELECT has_table('public', 'measurement_units', 'existe measurement_units');
SELECT has_table('public', 'materials', 'existe materials');
SELECT has_table('public', 'material_batches', 'existe material_batches');
SELECT has_table('public', 'material_units', 'existe material_units');
SELECT has_table('public', 'stock_balances', 'existe stock_balances');
SELECT has_table('public', 'stock_movements', 'existe stock_movements');
SELECT has_table('public', 'stock_movement_lines', 'existe stock_movement_lines');

-- ── Datos minimos ───────────────────────────────────────────────────────────
INSERT INTO company (id, company_name, description, contact_email, contact_phone, address, city, country, industry, company_cuit)
SELECT
  'a1000000-0000-0000-0000-000000000001'::uuid,
  'pgTAP almacenes', 'empresa de prueba', 'pgtap-almacenes@alphataco.local', '+542991234567',
  'Calle 123', c.id, 'argentina', 'Petroleo', '30999999985'
FROM cities c
LIMIT 1;

INSERT INTO profile (id, credential_id, email)
VALUES ('a1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 'pgtap-almacenes@alphataco.local');

INSERT INTO measurement_units (id, company_id, name, abbreviation)
VALUES ('a1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'Unidad pgTAP', 'upg');

INSERT INTO warehouses (id, company_id, code, name) VALUES
  ('a1000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000001', 'D1', 'Deposito 1'),
  ('a1000000-0000-0000-0000-000000000011', 'a1000000-0000-0000-0000-000000000001', 'D2', 'Deposito 2');

INSERT INTO materials (id, company_id, code, name, unit_id)
VALUES ('a1000000-0000-0000-0000-000000000020', 'a1000000-0000-0000-0000-000000000001', 'M1', 'Material 1', 'a1000000-0000-0000-0000-000000000003');

INSERT INTO stock_balances (company_id, material_id, warehouse_id, quantity)
VALUES ('a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000020', 'a1000000-0000-0000-0000-000000000010', 5);

-- ── Saldos ──────────────────────────────────────────────────────────────────
SELECT throws_ok(
  $$UPDATE stock_balances SET quantity = -1 WHERE material_id = 'a1000000-0000-0000-0000-000000000020'$$,
  '23514', NULL, 'el saldo no puede quedar negativo'
);

SELECT throws_ok(
  $$INSERT INTO stock_balances (company_id, material_id, warehouse_id, quantity)
    VALUES ('a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000020', 'a1000000-0000-0000-0000-000000000010', 1)$$,
  '23505', NULL, 'un solo saldo por material+deposito aunque el lote sea NULL (NULLS NOT DISTINCT)'
);

-- ── Movimientos ─────────────────────────────────────────────────────────────
SELECT lives_ok(
  $$INSERT INTO stock_movements (id, company_id, number, type, warehouse_id, occurred_on, created_by)
    VALUES ('a1000000-0000-0000-0000-000000000030', 'a1000000-0000-0000-0000-000000000001', 'MOV-000001', 'ENTRY',
            'a1000000-0000-0000-0000-000000000010', CURRENT_DATE, 'a1000000-0000-0000-0000-000000000002')$$,
  'una entrada sin destino es valida'
);

SELECT throws_ok(
  $$INSERT INTO stock_movements (company_id, number, type, warehouse_id, occurred_on, created_by)
    VALUES ('a1000000-0000-0000-0000-000000000001', 'MOV-T1', 'EXIT',
            'a1000000-0000-0000-0000-000000000010', CURRENT_DATE, 'a1000000-0000-0000-0000-000000000002')$$,
  '23514', NULL, 'una salida sin destino se rechaza'
);

SELECT throws_ok(
  $$INSERT INTO stock_movements (company_id, number, type, warehouse_id, occurred_on, created_by, destination_type)
    VALUES ('a1000000-0000-0000-0000-000000000001', 'MOV-T2', 'EXIT',
            'a1000000-0000-0000-0000-000000000010', CURRENT_DATE, 'a1000000-0000-0000-0000-000000000002', 'CUSTOMER')$$,
  '23514', NULL, 'una salida con tipo de destino pero sin la FK correspondiente se rechaza'
);

SELECT throws_ok(
  $$INSERT INTO stock_movements (company_id, number, type, warehouse_id, occurred_on, created_by)
    VALUES ('a1000000-0000-0000-0000-000000000001', 'MOV-T3', 'TRANSFER',
            'a1000000-0000-0000-0000-000000000010', CURRENT_DATE, 'a1000000-0000-0000-0000-000000000002')$$,
  '23514', NULL, 'una transferencia sin deposito destino se rechaza'
);

SELECT throws_ok(
  $$INSERT INTO stock_movements (company_id, number, type, warehouse_id, target_warehouse_id, occurred_on, created_by)
    VALUES ('a1000000-0000-0000-0000-000000000001', 'MOV-T4', 'TRANSFER',
            'a1000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000010',
            CURRENT_DATE, 'a1000000-0000-0000-0000-000000000002')$$,
  '23514', NULL, 'una transferencia al mismo deposito se rechaza'
);

SELECT throws_ok(
  $$INSERT INTO stock_movements (company_id, number, type, warehouse_id, occurred_on, created_by, customer_service_id)
    VALUES ('a1000000-0000-0000-0000-000000000001', 'MOV-T5', 'ENTRY',
            'a1000000-0000-0000-0000-000000000010', CURRENT_DATE, 'a1000000-0000-0000-0000-000000000002',
            'a1000000-0000-0000-0000-0000000000ff')$$,
  '23514', NULL, 'un contrato sin cliente se rechaza'
);

-- Anulaciones: una sola por movimiento.
SELECT lives_ok(
  $$INSERT INTO stock_movements (company_id, number, type, warehouse_id, occurred_on, created_by, reverses_movement_id, notes)
    VALUES ('a1000000-0000-0000-0000-000000000001', 'MOV-000002', 'ENTRY',
            'a1000000-0000-0000-0000-000000000010', CURRENT_DATE, 'a1000000-0000-0000-0000-000000000002',
            'a1000000-0000-0000-0000-000000000030', 'error de carga')$$,
  'se puede anular un movimiento'
);

SELECT throws_ok(
  $$INSERT INTO stock_movements (company_id, number, type, warehouse_id, occurred_on, created_by, reverses_movement_id, notes)
    VALUES ('a1000000-0000-0000-0000-000000000001', 'MOV-000003', 'ENTRY',
            'a1000000-0000-0000-0000-000000000010', CURRENT_DATE, 'a1000000-0000-0000-0000-000000000002',
            'a1000000-0000-0000-0000-000000000030', 'otra vez')$$,
  '23505', NULL, 'no se puede anular dos veces el mismo movimiento'
);

-- ── Lineas ──────────────────────────────────────────────────────────────────
SELECT throws_ok(
  $$INSERT INTO stock_movement_lines (movement_id, material_id, quantity, direction, unit_cost, total_cost)
    VALUES ('a1000000-0000-0000-0000-000000000030', 'a1000000-0000-0000-0000-000000000020', 0, 1, 10, 0)$$,
  '23514', NULL, 'una linea con cantidad 0 se rechaza'
);

SELECT throws_ok(
  $$INSERT INTO stock_movement_lines (movement_id, material_id, quantity, direction, unit_cost, total_cost)
    VALUES ('a1000000-0000-0000-0000-000000000030', 'a1000000-0000-0000-0000-000000000020', 1, 2, 10, 10)$$,
  '23514', NULL, 'direction solo admite +1 o -1'
);

-- ── Unidades serializadas ───────────────────────────────────────────────────
SELECT throws_ok(
  $$INSERT INTO material_units (company_id, material_id, serial_number, status)
    VALUES ('a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000020', 'S-1', 'IN_STOCK')$$,
  '23514', NULL, 'una unidad en stock sin deposito se rechaza'
);

SELECT throws_ok(
  $$INSERT INTO material_units (company_id, material_id, serial_number, status, warehouse_id)
    VALUES ('a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000020', 'S-2', 'OUT',
            'a1000000-0000-0000-0000-000000000010')$$,
  '23514', NULL, 'una unidad entregada no puede tener deposito'
);

SELECT * FROM finish();
ROLLBACK;
