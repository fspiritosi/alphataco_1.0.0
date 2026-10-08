-- Compras (etapa 1): reglas que viven en la base (CHECK e indices que Prisma no modela, ver
-- migracion 20261008100000_purchases_core). El servidor valida antes y da el mensaje; estos
-- tests prueban la red de seguridad. 23514 = check_violation, 23505 = unique_violation.
BEGIN;

SELECT plan(13);

SELECT has_table('public', 'suppliers', 'existe suppliers');
SELECT has_table('public', 'purchase_requests', 'existe purchase_requests');
SELECT has_table('public', 'purchase_request_lines', 'existe purchase_request_lines');

-- ── Datos minimos ───────────────────────────────────────────────────────────
INSERT INTO company (id, company_name, description, contact_email, contact_phone, address, city, country, industry, company_cuit)
SELECT
  'a2000000-0000-0000-0000-000000000001'::uuid,
  'pgTAP compras', 'empresa de prueba', 'pgtap-compras@alphataco.local', '+542991234567',
  'Calle 123', c.id, 'argentina', 'Petroleo', '30999999986'
FROM cities c
LIMIT 1;

INSERT INTO profile (id, credential_id, email)
VALUES ('a2000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000002', 'pgtap-compras@alphataco.local');

INSERT INTO measurement_units (id, company_id, name, abbreviation)
VALUES ('a2000000-0000-0000-0000-000000000003', 'a2000000-0000-0000-0000-000000000001', 'Unidad pgTAP', 'upg');

INSERT INTO materials (id, company_id, code, name, unit_id)
VALUES ('a2000000-0000-0000-0000-000000000004', 'a2000000-0000-0000-0000-000000000001', 'M1', 'Material 1', 'a2000000-0000-0000-0000-000000000003');

INSERT INTO suppliers (id, company_id, name, cuit, vat_condition_id)
VALUES ('a2000000-0000-0000-0000-000000000010', 'a2000000-0000-0000-0000-000000000001', 'Proveedor 1', 30712345678, 1);

INSERT INTO purchase_requests (id, company_id, number, requested_by)
VALUES ('a2000000-0000-0000-0000-000000000020', 'a2000000-0000-0000-0000-000000000001', 'SC-000001', 'a2000000-0000-0000-0000-000000000002');

-- ── Proveedores ─────────────────────────────────────────────────────────────
SELECT throws_ok(
  $$INSERT INTO suppliers (company_id, name, cuit, vat_condition_id)
    VALUES ('a2000000-0000-0000-0000-000000000001', 'Duplicado', 30712345678, 1)$$,
  '23505', NULL, 'el CUIT es unico por empresa'
);

SELECT throws_ok(
  $$INSERT INTO supplier_contacts (supplier_id, name, is_primary) VALUES
    ('a2000000-0000-0000-0000-000000000010', 'Uno', true),
    ('a2000000-0000-0000-0000-000000000010', 'Dos', true)$$,
  '23505', NULL, 'un solo contacto principal por proveedor'
);

SELECT throws_ok(
  $$UPDATE suppliers SET bank_cbu = '123' WHERE id = 'a2000000-0000-0000-0000-000000000010'$$,
  '23514', NULL, 'el CBU tiene 22 digitos'
);

-- ── Lineas ──────────────────────────────────────────────────────────────────
SELECT throws_ok(
  $$INSERT INTO purchase_request_lines (request_id, position, material_id, description, quantity, unit_id)
    VALUES ('a2000000-0000-0000-0000-000000000020', 1, 'a2000000-0000-0000-0000-000000000004', 'texto', 1,
            'a2000000-0000-0000-0000-000000000003')$$,
  '23514', NULL, 'una linea no lleva material y texto a la vez'
);

SELECT throws_ok(
  $$INSERT INTO purchase_request_lines (request_id, position, quantity, unit_id)
    VALUES ('a2000000-0000-0000-0000-000000000020', 1, 1, 'a2000000-0000-0000-0000-000000000003')$$,
  '23514', NULL, 'una linea lleva material o texto'
);

SELECT throws_ok(
  $$INSERT INTO purchase_request_lines (request_id, position, description, quantity, unit_id)
    VALUES ('a2000000-0000-0000-0000-000000000020', 1, 'texto', 0, 'a2000000-0000-0000-0000-000000000003')$$,
  '23514', NULL, 'la cantidad es mayor a 0'
);

-- ── Solicitud ───────────────────────────────────────────────────────────────
SELECT throws_ok(
  $$UPDATE purchase_requests SET destination_type = 'EMPLOYEE' WHERE id = 'a2000000-0000-0000-0000-000000000020'$$,
  '23514', NULL, 'un destino lleva su recurso'
);

SELECT throws_ok(
  $$UPDATE purchase_requests SET vehicle_id = gen_random_uuid() WHERE id = 'a2000000-0000-0000-0000-000000000020'$$,
  '23514', NULL, 'sin tipo de destino no hay recurso'
);

SELECT throws_ok(
  $$UPDATE purchase_requests
    SET status = 'REJECTED', decided_by = 'a2000000-0000-0000-0000-000000000002', decided_at = now()
    WHERE id = 'a2000000-0000-0000-0000-000000000020'$$,
  '23514', NULL, 'un rechazo lleva motivo'
);

SELECT throws_ok(
  $$UPDATE purchase_requests SET cancelled_at = now() WHERE id = 'a2000000-0000-0000-0000-000000000020'$$,
  '23514', NULL, 'una anulacion tiene fecha, quien y motivo juntos'
);

SELECT * FROM finish();
ROLLBACK;
