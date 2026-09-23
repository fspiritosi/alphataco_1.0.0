import 'server-only';

import type { Prisma } from '@/generated/prisma/client';

/** Sólo hace falta poder ejecutar SQL crudo dentro de la transacción. */
type NumberingTx = Pick<Prisma.TransactionClient, '$executeRaw' | '$queryRaw'>;

/**
 * Numeración de pedidos y de órdenes de trabajo, por empresa y sin carrera.
 *
 * Antes el número salía de un `max()+1` (o un `count()+1`) leído FUERA de la transacción y
 * sobre TODAS las empresas: dos usuarios generando a la vez obtenían el mismo número, y una
 * empresa veía saltos por lo que numeraba otra.
 *
 * La carrera se resuelve en la base con un advisory lock de transacción por empresa: el
 * segundo generador espera a que el primero confirme, así el `max()` que lee ya incluye la
 * fila recién insertada. El lock se libera solo al terminar la transacción.
 */
async function lockNumbering(tx: NumberingTx, key: string): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
}

/** Siguiente `work_orders.sequence_number` de la empresa. */
export async function nextWorkOrderSequence(tx: NumberingTx, companyId: string): Promise<number> {
  await lockNumbering(tx, `work_order_sequence:${companyId}`);

  const rows = await tx.$queryRaw<{ next: bigint }[]>`
    SELECT COALESCE(MAX(sequence_number), 0) + 1 AS next
    FROM work_orders
    WHERE company_id = ${companyId}::uuid
  `;

  return Number(rows[0]?.next ?? 1);
}

/**
 * Siguiente `maintenance_orders.order_number` de la empresa, con formato `OM-000001`.
 *
 * El máximo se calcula sobre la parte numérica del número ya asignado: usar un `count()`
 * repetía el número en cuanto una orden quedaba sin numerar en el medio.
 */
export async function nextMaintenanceOrderNumber(tx: NumberingTx, companyId: string): Promise<string> {
  await lockNumbering(tx, `maintenance_order_number:${companyId}`);

  const rows = await tx.$queryRaw<{ next: bigint }[]>`
    SELECT COALESCE(MAX(NULLIF(regexp_replace(order_number, '\\D', '', 'g'), '')::bigint), 0) + 1 AS next
    FROM maintenance_orders
    WHERE company_id = ${companyId}::uuid AND order_number IS NOT NULL
  `;

  return `OM-${String(Number(rows[0]?.next ?? 1)).padStart(6, '0')}`;
}
