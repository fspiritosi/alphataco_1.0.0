-- Compras (etapa 1): reglas que viven en la base (CHECK e indices que Prisma no modela, ver
-- migracion 20261008100000_purchases_core). El servidor valida antes y da el mensaje; estos
-- tests prueban la red de seguridad. 23514 = check_violation, 23505 = unique_violation.
BEGIN;

SELECT plan(55);

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

-- Etapa 4: comprobantes de proveedor
INSERT INTO purchase_expense_categories (id, company_id, name)
VALUES ('a2000000-0000-0000-0000-000000000060', 'a2000000-0000-0000-0000-000000000001', 'Luz');

INSERT INTO supplier_invoices (id, company_id, supplier_id, cbte_type, sales_point, number, issue_date, vat_period,
  net_taxed, net_untaxed, exempt, vat_total, vat_perceptions, gross_income_perceptions, other_taxes, total,
  status, created_by)
VALUES ('a2000000-0000-0000-0000-000000000061', 'a2000000-0000-0000-0000-000000000001',
        'a2000000-0000-0000-0000-000000000010', 1, 3, 12345, current_date, to_char(current_date, 'YYYY-MM'),
        100, 0, 0, 21, 0, 0, 0, 121, 'CONFORMING', 'a2000000-0000-0000-0000-000000000002');

SELECT throws_ok(
  $$UPDATE supplier_invoices SET sales_point = 0 WHERE id = 'a2000000-0000-0000-0000-000000000061'$$,
  '23514', NULL, 'el punto de venta va de 1 a 99999'
);

SELECT throws_ok(
  $$UPDATE supplier_invoices SET number = 0 WHERE id = 'a2000000-0000-0000-0000-000000000061'$$,
  '23514', NULL, 'el numero va de 1 a 99999999'
);

SELECT throws_ok(
  $$UPDATE supplier_invoices SET vat_period = '2026-13' WHERE id = 'a2000000-0000-0000-0000-000000000061'$$,
  '23514', NULL, 'el periodo de IVA es YYYY-MM'
);

SELECT throws_ok(
  $$UPDATE supplier_invoices SET cancelled_at = now() WHERE id = 'a2000000-0000-0000-0000-000000000061'$$,
  '23514', NULL, 'la anulacion del comprobante va completa'
);

SELECT throws_ok(
  $$UPDATE supplier_invoices SET status = 'CANCELLED' WHERE id = 'a2000000-0000-0000-0000-000000000061'$$,
  '23514', NULL, 'un comprobante anulado lleva la anulacion'
);

SELECT throws_ok(
  $$UPDATE supplier_invoices SET resolution_comment = 'ok' WHERE id = 'a2000000-0000-0000-0000-000000000061'$$,
  '23514', NULL, 'la resolucion va completa'
);

SELECT throws_ok(
  $$INSERT INTO supplier_invoices (company_id, supplier_id, cbte_type, sales_point, number, issue_date, vat_period,
      net_taxed, net_untaxed, exempt, vat_total, vat_perceptions, gross_income_perceptions, other_taxes, total,
      status, created_by)
    VALUES ('a2000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000010', 1, 3, 12345,
      current_date, to_char(current_date, 'YYYY-MM'), 0, 0, 0, 0, 0, 0, 0, 0, 'CONFORMING',
      'a2000000-0000-0000-0000-000000000002')$$,
  '23505', NULL, 'el comprobante es unico por proveedor, tipo, punto de venta y numero'
);

SELECT throws_ok(
  $$INSERT INTO supplier_invoice_lines (invoice_id, position, order_line_id, quantity, unit_price, expense_category_id,
      description, vat_rate_id, net_total, vat_amount)
    VALUES ('a2000000-0000-0000-0000-000000000061', 1, 'a2000000-0000-0000-0000-000000000041', 1, 10,
      'a2000000-0000-0000-0000-000000000060', 'x', 5, 10, 2.1)$$,
  '23514', NULL, 'una linea es de OC o de gasto, no las dos'
);

SELECT throws_ok(
  $$INSERT INTO supplier_invoice_lines (invoice_id, position, vat_rate_id, net_total, vat_amount)
    VALUES ('a2000000-0000-0000-0000-000000000061', 1, 5, 10, 2.1)$$,
  '23514', NULL, 'una linea es de OC o de gasto, alguna de las dos'
);

SELECT throws_ok(
  $$INSERT INTO supplier_invoice_lines (invoice_id, position, order_line_id, unit_price, vat_rate_id, net_total, vat_amount)
    VALUES ('a2000000-0000-0000-0000-000000000061', 1, 'a2000000-0000-0000-0000-000000000041', 10, 5, 10, 2.1)$$,
  '23514', NULL, 'la linea de OC lleva cantidad'
);

SELECT throws_ok(
  $$INSERT INTO supplier_invoice_lines (invoice_id, position, expense_category_id, vat_rate_id, net_total, vat_amount)
    VALUES ('a2000000-0000-0000-0000-000000000061', 1, 'a2000000-0000-0000-0000-000000000060', 5, 10, 2.1)$$,
  '23514', NULL, 'la linea de gasto lleva descripcion'
);

SELECT throws_ok(
  $$INSERT INTO supplier_invoice_taxes (invoice_id, kind, amount)
    VALUES ('a2000000-0000-0000-0000-000000000061', 'GROSS_INCOME_PERCEPTION', 10)$$,
  '23514', NULL, 'la percepcion de IIBB lleva provincia'
);

SELECT throws_ok(
  $$INSERT INTO supplier_invoice_taxes (invoice_id, kind, amount)
    VALUES ('a2000000-0000-0000-0000-000000000061', 'OTHER_TAX', 10)$$,
  '23514', NULL, 'otro tributo lleva descripcion'
);

SELECT throws_ok(
  $$INSERT INTO supplier_invoice_taxes (invoice_id, kind, amount)
    VALUES ('a2000000-0000-0000-0000-000000000061', 'VAT_PERCEPTION', 0)$$,
  '23514', NULL, 'el tributo es mayor a 0'
);

SELECT lives_ok(
  $$INSERT INTO supplier_invoice_lines (invoice_id, position, expense_category_id, description, vat_rate_id, net_total, vat_amount)
    VALUES ('a2000000-0000-0000-0000-000000000061', 1, 'a2000000-0000-0000-0000-000000000060', 'Luz octubre', 5, 100, 21)$$,
  'una linea de gasto completa se guarda'
);

UPDATE supplier_invoices SET status = 'CANCELLED', cancelled_by = 'a2000000-0000-0000-0000-000000000002',
  cancelled_at = now(), cancel_reason = 'mal cargada' WHERE id = 'a2000000-0000-0000-0000-000000000061';

SELECT lives_ok(
  $$INSERT INTO supplier_invoices (company_id, supplier_id, cbte_type, sales_point, number, issue_date, vat_period,
      net_taxed, net_untaxed, exempt, vat_total, vat_perceptions, gross_income_perceptions, other_taxes, total,
      status, created_by)
    VALUES ('a2000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000010', 1, 3, 12345,
      current_date, to_char(current_date, 'YYYY-MM'), 0, 0, 0, 0, 0, 0, 0, 0, 'CONFORMING',
      'a2000000-0000-0000-0000-000000000002')$$,
  'un comprobante anulado se puede volver a cargar'
);

-- Etapa 5: ordenes de pago y retenciones
INSERT INTO treasury_accounts (id, company_id, kind, name)
VALUES ('a2000000-0000-0000-0000-000000000070', 'a2000000-0000-0000-0000-000000000001', 'BANK', 'Banco prueba');

INSERT INTO withholding_regimes (id, company_id, tax, code, description, rate_registered)
VALUES ('a2000000-0000-0000-0000-000000000071', 'a2000000-0000-0000-0000-000000000001', 'GANANCIAS', '078', 'Bienes', 2);

INSERT INTO payment_orders (id, company_id, number, supplier_id, status, planned_on, invoices_total, credits_total,
  advance_total, withholdings_total, net_total, created_by)
VALUES ('a2000000-0000-0000-0000-000000000072', 'a2000000-0000-0000-0000-000000000001', 'OP-000001',
  'a2000000-0000-0000-0000-000000000010', 'DRAFT', current_date, 0, 0, 0, 0, 0, 'a2000000-0000-0000-0000-000000000002');

SELECT throws_ok(
  $$INSERT INTO withholding_regimes (company_id, tax, code, description, rate_registered)
    VALUES ('a2000000-0000-0000-0000-000000000001', 'IVA', '12', 'x', 1)$$,
  '23514', NULL, 'el codigo de regimen tiene 3 digitos'
);

SELECT throws_ok(
  $$UPDATE payment_orders SET status = 'PAID' WHERE id = 'a2000000-0000-0000-0000-000000000072'$$,
  '23514', NULL, 'una orden pagada lleva la fecha de pago'
);

SELECT throws_ok(
  $$UPDATE payment_orders SET cancelled_at = now() WHERE id = 'a2000000-0000-0000-0000-000000000072'$$,
  '23514', NULL, 'la anulacion de la orden va completa'
);

SELECT throws_ok(
  $$UPDATE payment_orders SET net_total = -1 WHERE id = 'a2000000-0000-0000-0000-000000000072'$$,
  '23514', NULL, 'el neto a pagar no es negativo'
);

SELECT throws_ok(
  $$INSERT INTO payment_order_lines (payment_order_id, position, kind, amount)
    VALUES ('a2000000-0000-0000-0000-000000000072', 1, 'INVOICE', 10)$$,
  '23514', NULL, 'una linea de factura lleva el comprobante'
);

SELECT throws_ok(
  $$INSERT INTO payment_order_lines (payment_order_id, position, kind, amount)
    VALUES ('a2000000-0000-0000-0000-000000000072', 1, 'ADVANCE', 0)$$,
  '23514', NULL, 'el importe de una linea es mayor a 0'
);

SELECT throws_ok(
  $$INSERT INTO payment_order_payments (payment_order_id, method, treasury_account_id, amount)
    VALUES ('a2000000-0000-0000-0000-000000000072', 'CHECK', 'a2000000-0000-0000-0000-000000000070', 10)$$,
  '23514', NULL, 'un cheque lleva numero y fecha'
);

SELECT throws_ok(
  $$INSERT INTO supplier_withholding_profiles (supplier_id, tax, status, exclusion_percentage)
    VALUES ('a2000000-0000-0000-0000-000000000010', 'GANANCIAS', 'SUBJECT', 50)$$,
  '23514', NULL, 'la exclusion lleva su vigencia'
);

SELECT lives_ok(
  $$INSERT INTO payment_order_lines (payment_order_id, position, kind, amount, description)
    VALUES ('a2000000-0000-0000-0000-000000000072', 1, 'ADVANCE', 1000, 'Anticipo')$$,
  'un anticipo se guarda'
);

SELECT * FROM finish();
ROLLBACK;
