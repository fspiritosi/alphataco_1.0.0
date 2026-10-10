import 'server-only';

import type { Prisma } from '@/generated/prisma/client';

/**
 * Cuenta corriente de proveedores (spec Compras etapa 5 §2.4): UNA sola definicion SQL de lo
 * pendiente de un comprobante y lo disponible de un anticipo. La usan la orden de pago, los
 * vencimientos, la cuenta corriente y el detalle del comprobante (leccion del 712: una formula).
 *
 * - Pendiente = total − lo aplicado en ordenes de pago no anuladas (los borradores cuentan).
 * - Disponible de un anticipo = su importe (si la orden esta pagada) − lo aplicado en ordenes no anuladas.
 */

type RawTx = Pick<Prisma.TransactionClient, '$queryRaw'>;

export async function invoicePending(
  tx: RawTx,
  invoiceIds: readonly string[],
  options: { excludeOrderId?: string } = {}
): Promise<Map<string, string>> {
  const ids = [...new Set(invoiceIds)];
  const result = new Map<string, string>();
  if (ids.length === 0) return result;
  const exclude = options.excludeOrderId ?? null;
  const rows = await tx.$queryRaw<{ id: string; pending: string }[]>`
    SELECT si.id,
           (si.total - COALESCE(SUM(l.amount) FILTER (
              WHERE po.status::text IN ('DRAFT','PENDING_APPROVAL','APPROVED','PAID')
                AND (${exclude}::uuid IS NULL OR po.id <> ${exclude}::uuid)), 0))::text AS pending
    FROM supplier_invoices si
    LEFT JOIN payment_order_lines l ON l.invoice_id = si.id
    LEFT JOIN payment_orders po ON po.id = l.payment_order_id
    WHERE si.id = ANY(${ids}::uuid[])
    GROUP BY si.id, si.total
  `;
  for (const row of rows) result.set(row.id, row.pending);
  return result;
}

export interface AdvanceBalance {
  lineId: string;
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  supplierId: string;
  companyId: string;
  amount: string;
  available: string;
  paidOn: Date | null;
  description: string | null;
}

export async function advanceAvailable(
  tx: RawTx,
  lineIds: readonly string[],
  options: { excludeOrderId?: string } = {}
): Promise<Map<string, AdvanceBalance>> {
  const ids = [...new Set(lineIds)];
  const result = new Map<string, AdvanceBalance>();
  if (ids.length === 0) return result;
  const exclude = options.excludeOrderId ?? null;
  const rows = await tx.$queryRaw<
    {
      id: string;
      order_id: string;
      number: string;
      status: string;
      supplier_id: string;
      company_id: string;
      amount: string;
      available: string;
      paid_on: Date | null;
      description: string | null;
    }[]
  >`
    SELECT a.id, ao.id AS order_id, ao.number, ao.status::text AS status, ao.supplier_id, ao.company_id,
           a.amount::text AS amount,
           (a.amount - COALESCE(SUM(x.amount) FILTER (
              WHERE xo.status::text IN ('DRAFT','PENDING_APPROVAL','APPROVED','PAID')
                AND (${exclude}::uuid IS NULL OR xo.id <> ${exclude}::uuid)), 0))::text AS available,
           ao.paid_on, a.description
    FROM payment_order_lines a
    JOIN payment_orders ao ON ao.id = a.payment_order_id
    LEFT JOIN payment_order_lines x ON x.source_line_id = a.id
    LEFT JOIN payment_orders xo ON xo.id = x.payment_order_id
    WHERE a.id = ANY(${ids}::uuid[]) AND a.kind = 'ADVANCE'
    GROUP BY a.id, ao.id, a.amount, a.description
  `;
  for (const row of rows) {
    result.set(row.id, {
      lineId: row.id,
      orderId: row.order_id,
      orderNumber: row.number,
      orderStatus: row.status,
      supplierId: row.supplier_id,
      companyId: row.company_id,
      amount: row.amount,
      available: row.available,
      paidOn: row.paid_on,
      description: row.description,
    });
  }
  return result;
}

export interface OpenInvoice {
  id: string;
  cbteType: number;
  salesPoint: number;
  number: bigint;
  issueDate: Date;
  dueDate: Date | null;
  total: string;
  pending: string;
}

/** Comprobantes "a pagar" del proveedor con pendiente > 0 (facturas, ND y NC), por vencimiento. */
export async function openInvoicesOfSupplier(
  tx: RawTx,
  companyId: string,
  supplierId: string,
  options: { excludeOrderId?: string } = {}
): Promise<OpenInvoice[]> {
  const exclude = options.excludeOrderId ?? null;
  const rows = await tx.$queryRaw<
    { id: string; cbte_type: number; sales_point: number; number: bigint; issue_date: Date; due_date: Date | null; total: string; pending: string }[]
  >`
    SELECT si.id, si.cbte_type, si.sales_point, si.number, si.issue_date, si.due_date, si.total::text AS total,
           (si.total - COALESCE(SUM(l.amount) FILTER (
              WHERE po.status::text IN ('DRAFT','PENDING_APPROVAL','APPROVED','PAID')
                AND (${exclude}::uuid IS NULL OR po.id <> ${exclude}::uuid)), 0))::text AS pending
    FROM supplier_invoices si
    LEFT JOIN payment_order_lines l ON l.invoice_id = si.id
    LEFT JOIN payment_orders po ON po.id = l.payment_order_id
    WHERE si.company_id = ${companyId}::uuid AND si.supplier_id = ${supplierId}::uuid
      AND si.status IN ('CONFORMING', 'APPROVED')
    GROUP BY si.id
    HAVING si.total - COALESCE(SUM(l.amount) FILTER (
              WHERE po.status::text IN ('DRAFT','PENDING_APPROVAL','APPROVED','PAID')
                AND (${exclude}::uuid IS NULL OR po.id <> ${exclude}::uuid)), 0) > 0
    ORDER BY si.due_date NULLS LAST, si.issue_date, si.number
  `;
  return rows.map((r) => ({
    id: r.id,
    cbteType: r.cbte_type,
    salesPoint: r.sales_point,
    number: r.number,
    issueDate: r.issue_date,
    dueDate: r.due_date,
    total: r.total,
    pending: r.pending,
  }));
}

/** Anticipos pagados del proveedor con disponible > 0. */
export async function openAdvancesOfSupplier(
  tx: RawTx,
  companyId: string,
  supplierId: string,
  options: { excludeOrderId?: string } = {}
): Promise<AdvanceBalance[]> {
  const lines = await tx.$queryRaw<{ id: string }[]>`
    SELECT a.id FROM payment_order_lines a JOIN payment_orders ao ON ao.id = a.payment_order_id
    WHERE a.kind = 'ADVANCE' AND ao.status = 'PAID' AND ao.company_id = ${companyId}::uuid AND ao.supplier_id = ${supplierId}::uuid
  `;
  const balances = await advanceAvailable(
    tx,
    lines.map((l) => l.id),
    options
  );
  return [...balances.values()].filter((b) => Number(b.available) > 0).sort((a, b) => a.orderNumber.localeCompare(b.orderNumber));
}


/**
 * Comprobantes a pagar de la empresa con pendiente > 0 (id → pendiente), con la misma definicion
 * que el resto. Lo usa la tabla de vencimientos para filtrar y paginar con Prisma sobre esos ids.
 */
export async function openInvoicePendingMap(tx: RawTx, companyId: string): Promise<Map<string, string>> {
  const rows = await tx.$queryRaw<{ id: string; pending: string }[]>`
    SELECT si.id,
           (si.total - COALESCE(SUM(l.amount) FILTER (
              WHERE po.status::text IN ('DRAFT','PENDING_APPROVAL','APPROVED','PAID')), 0))::text AS pending
    FROM supplier_invoices si
    LEFT JOIN payment_order_lines l ON l.invoice_id = si.id
    LEFT JOIN payment_orders po ON po.id = l.payment_order_id
    WHERE si.company_id = ${companyId}::uuid AND si.status IN ('CONFORMING', 'APPROVED')
    GROUP BY si.id
    HAVING si.total - COALESCE(SUM(l.amount) FILTER (
              WHERE po.status::text IN ('DRAFT','PENDING_APPROVAL','APPROVED','PAID')), 0) > 0
  `;
  return new Map(rows.map((r) => [r.id, r.pending]));
}
