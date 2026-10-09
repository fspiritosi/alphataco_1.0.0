-- Compras (etapa 1): reglas que viven en la base (CHECK e indices que Prisma no modela, ver
-- migracion 20261008100000_purchases_core). El servidor valida antes y da el mensaje; estos
-- tests prueban la red de seguridad. 23514 = check_violation, 23505 = unique_violation.
BEGIN;

SELECT plan(30);

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

-- ── Etapa 2: cotizaciones y ordenes de compra ───────────────────────────────
INSERT INTO purchase_request_lines (id, request_id, position, description, quantity, unit_id)
VALUES ('a2000000-0000-0000-0000-000000000021', 'a2000000-0000-0000-0000-000000000020', 1, 'Servicio', 10,
        'a2000000-0000-0000-0000-000000000003');

INSERT INTO purchase_quotes (id, company_id, number, supplier_id, created_by)
VALUES ('a2000000-0000-0000-0000-000000000030', 'a2000000-0000-0000-0000-000000000001', 'PC-000001',
        'a2000000-0000-0000-0000-000000000010', 'a2000000-0000-0000-0000-000000000002');

INSERT INTO purchase_quote_lines (quote_id, request_line_id, quantity)
VALUES ('a2000000-0000-0000-0000-000000000030', 'a2000000-0000-0000-0000-000000000021', 10);

INSERT INTO purchase_orders (id, company_id, number, supplier_id, created_by)
VALUES ('a2000000-0000-0000-0000-000000000040', 'a2000000-0000-0000-0000-000000000001', 'OC-000001',
        'a2000000-0000-0000-0000-000000000010', 'a2000000-0000-0000-0000-000000000002');

SELECT throws_ok(
  $$INSERT INTO purchase_quote_lines (quote_id, request_line_id, quantity)
    VALUES ('a2000000-0000-0000-0000-000000000030', 'a2000000-0000-0000-0000-000000000021', 5)$$,
  '23505', NULL, 'una linea de solicitud va una sola vez por cotizacion'
);

SELECT throws_ok(
  $$UPDATE purchase_quote_lines SET not_quoted = true, unit_price = 10, vat_rate_id = 5
    WHERE quote_id = 'a2000000-0000-0000-0000-000000000030'$$,
  '23514', NULL, 'una linea que no se cotiza no lleva precio'
);

SELECT throws_ok(
  $$UPDATE purchase_quote_lines SET unit_price = 10 WHERE quote_id = 'a2000000-0000-0000-0000-000000000030'$$,
  '23514', NULL, 'el precio cotizado va con su alicuota'
);

SELECT throws_ok(
  $$UPDATE purchase_quotes SET cancelled_at = now() WHERE id = 'a2000000-0000-0000-0000-000000000030'$$,
  '23514', NULL, 'la anulacion de la cotizacion va completa'
);

SELECT throws_ok(
  $$INSERT INTO purchase_order_lines (order_id, request_line_id, position, quantity, unit_price, vat_rate_id, net_total, vat_amount)
    VALUES ('a2000000-0000-0000-0000-000000000040', 'a2000000-0000-0000-0000-000000000021', 1, 0, 1, 5, 0, 0)$$,
  '23514', NULL, 'la cantidad de la OC es mayor a 0'
);

SELECT throws_ok(
  $$INSERT INTO purchase_order_lines (order_id, request_line_id, position, quantity, unit_price, vat_rate_id, net_total, vat_amount)
    VALUES ('a2000000-0000-0000-0000-000000000040', 'a2000000-0000-0000-0000-000000000021', 1, 1, -1, 5, 0, 0)$$,
  '23514', NULL, 'el precio de la OC no es negativo'
);

SELECT throws_ok(
  $$UPDATE purchase_orders SET status = 'APPROVED' WHERE id = 'a2000000-0000-0000-0000-000000000040'$$,
  '23514', NULL, 'una OC aprobada tiene la aprobacion'
);

SELECT throws_ok(
  $$UPDATE purchase_orders
    SET status = 'SENT', approved_by = 'a2000000-0000-0000-0000-000000000002', approved_at = now()
    WHERE id = 'a2000000-0000-0000-0000-000000000040'$$,
  '23514', NULL, 'una OC enviada tiene el envio'
);

SELECT throws_ok(
  $$UPDATE purchase_orders SET cancel_reason = 'x' WHERE id = 'a2000000-0000-0000-0000-000000000040'$$,
  '23514', NULL, 'la anulacion de la OC va completa'
);

SELECT throws_ok(
  $$INSERT INTO purchase_orders (company_id, number, supplier_id, created_by)
    VALUES ('a2000000-0000-0000-0000-000000000001', 'OC-000001', 'a2000000-0000-0000-0000-000000000010',
            'a2000000-0000-0000-0000-000000000002')$$,
  '23505', NULL, 'el numero de OC es unico por empresa'
);

SELECT throws_ok(
  $$UPDATE purchase_requests SET status = 'CLOSED' WHERE id = 'a2000000-0000-0000-0000-000000000020'$$,
  '23514', NULL, 'una solicitud cerrada lleva el cierre con motivo'
);

-- ── Etapa 3: recepciones ────────────────────────────────────────────────────
INSERT INTO purchase_order_lines (id, order_id, request_line_id, position, quantity, unit_price, vat_rate_id, net_total, vat_amount)
VALUES ('a2000000-0000-0000-0000-000000000041', 'a2000000-0000-0000-0000-000000000040', 'a2000000-0000-0000-0000-000000000021', 1, 5, 10, 5, 50, 10.5);

INSERT INTO purchase_receipts (id, company_id, number, order_id, supplier_id, received_on, created_by)
VALUES ('a2000000-0000-0000-0000-000000000050', 'a2000000-0000-0000-0000-000000000001', 'RC-000001',
        'a2000000-0000-0000-0000-000000000040', 'a2000000-0000-0000-0000-000000000010', current_date,
        'a2000000-0000-0000-0000-000000000002');

SELECT throws_ok(
  $$INSERT INTO purchase_receipt_lines (receipt_id, order_line_id, quantity, unit_cost)
    VALUES ('a2000000-0000-0000-0000-000000000050', 'a2000000-0000-0000-0000-000000000041', 0, 10)$$,
  '23514', NULL, 'la cantidad recibida es mayor a 0'
);

SELECT throws_ok(
  $$INSERT INTO purchase_receipt_lines (receipt_id, order_line_id, quantity, unit_cost)
    VALUES ('a2000000-0000-0000-0000-000000000050', 'a2000000-0000-0000-0000-000000000041', 1, -1)$$,
  '23514', NULL, 'el costo no es negativo'
);

SELECT throws_ok(
  $$UPDATE purchase_receipts SET cancelled_at = now() WHERE id = 'a2000000-0000-0000-0000-000000000050'$$,
  '23514', NULL, 'la anulacion de la recepcion va completa'
);

SELECT throws_ok(
  $$INSERT INTO purchase_receipts (company_id, number, order_id, supplier_id, received_on, created_by)
    VALUES ('a2000000-0000-0000-0000-000000000001', 'RC-000001', 'a2000000-0000-0000-0000-000000000040',
            'a2000000-0000-0000-0000-000000000010', current_date, 'a2000000-0000-0000-0000-000000000002')$$,
  '23505', NULL, 'el numero de recepcion es unico por empresa'
);

SELECT throws_ok(
  $$UPDATE purchase_orders SET status = 'CLOSED' WHERE id = 'a2000000-0000-0000-0000-000000000040'$$,
  '23514', NULL, 'una OC cerrada lleva el cierre con motivo'
);

SELECT throws_ok(
  $$UPDATE purchase_orders SET complements_order_id = 'a2000000-0000-0000-0000-000000000040' WHERE id = 'a2000000-0000-0000-0000-000000000040'$$,
  '23514', NULL, 'una OC complementaria lleva la recepcion que la origino'
);

SELECT * FROM finish();
ROLLBACK;
