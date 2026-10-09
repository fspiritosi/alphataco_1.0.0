import 'server-only';

import { QUANTITY_SCALE, formatScaled, parseScaled } from '@/features/Comercial/Facturacion/lib/invoice-math';
import { Prisma } from '@/generated/prisma/client';
import { orderedQuantitySql } from './ordered-quantity-sql';
import { PurchaseError } from './purchase-errors';
import { formatQuantityWithUnit } from './quantity-format';
import {
  PROGRESS_REQUEST_STATUSES,
  progressStatus,
  type PurchaseRequestStatus,
} from './request-state-machine';

/**
 * "Lo que falta" de cada linea de solicitud y el avance de la solicitud (spec Compras etapa 2
 * §2.3 y §3, etapa 3 §3). Pedido en OC = `orderedQuantitySql` (OC no anuladas, incluidos los
 * borradores; de las cerradas, solo lo recibido); falta = pedido en la solicitud - pedido en OC.
 *
 * Concurrencia: quien va a escribir lineas de OC (o de cotizacion) lockea primero las SOLICITUDES
 * de esas lineas, ordenadas por id. Dos compradores sobre la misma linea quedan en fila: el
 * segundo recalcula con lo que escribio el primero y recibe "quedan N".
 */

type RawTx = Pick<Prisma.TransactionClient, '$queryRaw' | '$executeRaw'>;

const ZERO = BigInt(0);

export interface LockedRequestLine {
  requestLineId: string;
  requestId: string;
  requestNumber: string;
  requestStatus: PurchaseRequestStatus;
  position: number;
  requested: string;
  itemLabel: string;
  unitAbbr: string;
  suggestedSupplierId: string | null;
}

function scaled(value: string): bigint {
  return parseScaled(value, QUANTITY_SCALE) ?? ZERO;
}

/** Etiqueta de la linea para los mensajes: "[AC-15] Aceite 15W40" o la descripcion libre. */
export function requestLineLabel(line: { code: string | null; name: string | null; description: string | null }): string {
  if (line.name) return line.code ? `[${line.code}] ${line.name}` : line.name;
  return line.description ?? '';
}

/**
 * Lockea (`FOR UPDATE`, por id) las solicitudes de esas lineas y devuelve cada linea con el estado
 * de su solicitud leido DESPUES del lock. Lineas inexistentes o de otra empresa: error.
 */
export async function lockRequestsForLines(
  tx: RawTx,
  companyId: string,
  requestLineIds: readonly string[]
): Promise<Map<string, LockedRequestLine>> {
  const ids = [...new Set(requestLineIds)];
  if (ids.length === 0) return new Map();

  const owners = await tx.$queryRaw<{ request_id: string }[]>`
    SELECT DISTINCT l.request_id
    FROM purchase_request_lines l
    JOIN purchase_requests r ON r.id = l.request_id
    WHERE l.id = ANY(${ids}::uuid[]) AND r.company_id = ${companyId}::uuid
  `;
  const requestIds = owners.map((row) => row.request_id);
  if (requestIds.length > 0) {
    await tx.$queryRaw`
      SELECT id FROM purchase_requests WHERE id = ANY(${requestIds}::uuid[]) ORDER BY id FOR UPDATE
    `;
  }

  const rows = await tx.$queryRaw<
    {
      id: string;
      request_id: string;
      number: string;
      status: PurchaseRequestStatus;
      position: number;
      quantity: string;
      code: string | null;
      name: string | null;
      description: string | null;
      abbreviation: string;
      suggested_supplier_id: string | null;
    }[]
  >`
    SELECT l.id, l.request_id, r.number, r.status::text AS status, l.position, l.quantity::text AS quantity,
           m.code, m.name, l.description, u.abbreviation, l.suggested_supplier_id
    FROM purchase_request_lines l
    JOIN purchase_requests r ON r.id = l.request_id
    JOIN measurement_units u ON u.id = l.unit_id
    LEFT JOIN materials m ON m.id = l.material_id
    WHERE l.id = ANY(${ids}::uuid[]) AND r.company_id = ${companyId}::uuid
  `;
  if (rows.length !== ids.length) throw new PurchaseError('Una de las líneas de solicitud no existe');

  return new Map(
    rows.map((row) => [
      row.id,
      {
        requestLineId: row.id,
        requestId: row.request_id,
        requestNumber: row.number,
        requestStatus: row.status,
        position: row.position,
        requested: row.quantity,
        itemLabel: requestLineLabel(row),
        unitAbbr: row.abbreviation,
        suggestedSupplierId: row.suggested_supplier_id,
      },
    ])
  );
}

/** Pedido en OC no anuladas por linea de solicitud (texto decimal; '0' si no hay). */
export async function orderedByLine(
  tx: RawTx,
  requestLineIds: readonly string[],
  options: { excludeOrderId?: string } = {}
): Promise<Map<string, string>> {
  const ids = [...new Set(requestLineIds)];
  const result = new Map(ids.map((id) => [id, '0']));
  if (ids.length === 0) return result;
  const exclude = options.excludeOrderId ?? null;
  const rows = await tx.$queryRaw<{ request_line_id: string; ordered: string }[]>`
    SELECT l.id AS request_line_id, ${orderedQuantitySql(Prisma.raw('l.id'), exclude)}::text AS ordered
    FROM purchase_request_lines l
    WHERE l.id = ANY(${ids}::uuid[])
  `;
  for (const row of rows) result.set(row.request_line_id, row.ordered);
  return result;
}

/** Falta de una linea (nunca negativo), como texto decimal. */
export function remainingOf(requested: string, ordered: string): string {
  const diff = scaled(requested) - scaled(ordered);
  return formatScaled(diff > ZERO ? diff : ZERO, QUANTITY_SCALE);
}

/**
 * Rechaza si alguna linea pide mas de lo que falta. Las cantidades de la misma linea de solicitud
 * se suman (dos renglones de la OC sobre la misma linea).
 */
export function assertWithinRemaining(
  lines: readonly { requestLineId: string; quantity: string }[],
  locked: Map<string, LockedRequestLine>,
  ordered: Map<string, string>
): void {
  const asked = new Map<string, bigint>();
  for (const line of lines) asked.set(line.requestLineId, (asked.get(line.requestLineId) ?? ZERO) + scaled(line.quantity));

  for (const [requestLineId, quantity] of asked) {
    const line = locked.get(requestLineId);
    if (!line) throw new PurchaseError('Una de las líneas de solicitud no existe');
    const remaining = scaled(remainingOf(line.requested, ordered.get(requestLineId) ?? '0'));
    const where = `De la línea ${line.position} de ${line.requestNumber} (${line.itemLabel})`;
    if (remaining <= ZERO) throw new PurchaseError(`${where} no queda nada por pedir: ya está pedida completa`);
    if (quantity > remaining) {
      throw new PurchaseError(`${where} quedan ${formatQuantityWithUnit(formatScaled(remaining, QUANTITY_SCALE), line.unitAbbr)}`);
    }
  }
}

/**
 * Recalcula el estado de avance (APPROVED / PARTIALLY_ORDERED / ORDERED) de las solicitudes que
 * estan en uno de esos tres. CLOSED y los estados previos a la aprobacion no se tocan. Solo
 * escribe si cambia.
 */
export async function recomputeRequestProgress(tx: RawTx, requestIds: readonly string[]): Promise<void> {
  const ids = [...new Set(requestIds)];
  if (ids.length === 0) return;
  const rows = await tx.$queryRaw<{ request_id: string; status: PurchaseRequestStatus; requested: string; ordered: string }[]>`
    SELECT r.id AS request_id, r.status::text AS status, l.quantity::text AS requested,
           ${orderedQuantitySql(Prisma.raw('l.id'))}::text AS ordered
    FROM purchase_requests r
    JOIN purchase_request_lines l ON l.request_id = r.id
    WHERE r.id = ANY(${ids}::uuid[])
  `;

  const byRequest = new Map<string, { status: PurchaseRequestStatus; lines: { requested: string; ordered: string }[] }>();
  for (const row of rows) {
    const entry = byRequest.get(row.request_id) ?? { status: row.status, lines: [] };
    entry.lines.push({ requested: row.requested, ordered: row.ordered });
    byRequest.set(row.request_id, entry);
  }

  const progress: readonly PurchaseRequestStatus[] = PROGRESS_REQUEST_STATUSES;
  for (const [requestId, entry] of byRequest) {
    if (!progress.includes(entry.status)) continue;
    const next = progressStatus(entry.lines);
    if (next === entry.status) continue;
    await tx.$executeRaw`
      UPDATE purchase_requests SET status = ${next}::purchase_request_status, updated_at = now()
      WHERE id = ${requestId}::uuid
    `;
  }
}

export interface OrderableRequestLine {
  requestLineId: string;
  requestId: string;
  requestNumber: string;
  position: number;
  itemLabel: string;
  unitAbbr: string;
  requested: string;
  remaining: string;
  suggestedSupplierId: string | null;
}

/**
 * Lineas de solicitudes APROBADAS o PEDIDAS EN PARTE con faltante > 0, para los selectores del
 * pedido de cotizacion y de la orden de compra. Busca por numero de solicitud, codigo o nombre del
 * material y descripcion. `total` cuenta todas las que cumplen, no solo las devueltas.
 */
export async function findOrderableRequestLines(
  tx: Pick<Prisma.TransactionClient, '$queryRaw'>,
  companyId: string,
  options: { term?: string; requestId?: string; limit?: number } = {}
): Promise<{ items: OrderableRequestLine[]; total: number }> {
  const term = options.term?.trim() ?? '';
  const pattern = `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const requestId = options.requestId ?? null;
  const limit = options.limit ?? 50;
  const rows = await tx.$queryRaw<
    {
      id: string;
      request_id: string;
      number: string;
      position: number;
      code: string | null;
      name: string | null;
      description: string | null;
      abbreviation: string;
      requested: string;
      ordered: string;
      suggested_supplier_id: string | null;
      total: bigint;
    }[]
  >`
    WITH candidates AS (
      SELECT l.id, l.request_id, r.number, l.position, m.code, m.name, l.description, u.abbreviation,
             l.quantity AS requested, l.suggested_supplier_id,
             ${orderedQuantitySql(Prisma.raw('l.id'))} AS ordered
      FROM purchase_request_lines l
      JOIN purchase_requests r ON r.id = l.request_id
      JOIN measurement_units u ON u.id = l.unit_id
      LEFT JOIN materials m ON m.id = l.material_id
      WHERE r.company_id = ${companyId}::uuid
        AND r.status IN ('APPROVED', 'PARTIALLY_ORDERED')
        AND (${requestId}::uuid IS NULL OR r.id = ${requestId}::uuid)
        AND (${term} = '' OR r.number ILIKE ${pattern} OR m.code ILIKE ${pattern} OR m.name ILIKE ${pattern}
             OR l.description ILIKE ${pattern})
    )
    SELECT id, request_id, number, position, code, name, description, abbreviation,
           requested::text AS requested, ordered::text AS ordered, suggested_supplier_id,
           COUNT(*) OVER () AS total
    FROM candidates
    WHERE requested > ordered
    ORDER BY number, position
    LIMIT ${limit}
  `;
  return {
    items: rows.map((row) => ({
      requestLineId: row.id,
      requestId: row.request_id,
      requestNumber: row.number,
      position: row.position,
      itemLabel: requestLineLabel(row),
      unitAbbr: row.abbreviation,
      requested: row.requested,
      remaining: remainingOf(row.requested, row.ordered),
      suggestedSupplierId: row.suggested_supplier_id,
    })),
    total: Number(rows[0]?.total ?? 0),
  };
}
