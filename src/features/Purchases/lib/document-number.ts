import 'server-only';

import { Prisma } from '@/generated/prisma/client';
import { formatPurchaseDocumentNumber, type PurchaseDocumentKind } from './document-number-format';

type NumberingTx = Pick<Prisma.TransactionClient, '$executeRaw' | '$queryRaw'>;

/**
 * Tabla de cada documento. Es un mapa cerrado (nunca viene del cliente), por eso interpolarla con
 * `Prisma.raw` es seguro.
 */
const TABLES: Record<PurchaseDocumentKind, string> = {
  request: 'purchase_requests',
  quote: 'purchase_quotes',
  order: 'purchase_orders',
  receipt: 'purchase_receipts',
  payment: 'payment_orders',
};

/**
 * Siguiente numero del documento en la empresa (`SC-`, `PC-`, `OC-`, `RC-`, `OP-`). Advisory lock de transaccion
 * por empresa y tipo, y `MAX()+1`: mismo criterio que `nextMaterialRequestNumber` de Almacenes.
 */
export async function nextPurchaseDocumentNumber(
  tx: NumberingTx,
  companyId: string,
  kind: PurchaseDocumentKind
): Promise<string> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`purchase_${kind}_number:${companyId}`}, 0))`;

  const rows = await tx.$queryRaw<{ next: bigint }[]>`
    SELECT COALESCE(MAX(NULLIF(regexp_replace(number, '\\D', '', 'g'), '')::bigint), 0) + 1 AS next
    FROM ${Prisma.raw(TABLES[kind])}
    WHERE company_id = ${companyId}::uuid
  `;

  return formatPurchaseDocumentNumber(kind, Number(rows[0]?.next ?? 1));
}
