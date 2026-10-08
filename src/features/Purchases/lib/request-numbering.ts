import 'server-only';

import type { Prisma } from '@/generated/prisma/client';
import { formatPurchaseRequestNumber } from './request-number-format';

type NumberingTx = Pick<Prisma.TransactionClient, '$executeRaw' | '$queryRaw'>;

/**
 * Siguiente `purchase_requests.number` de la empresa (`SC-000001`). Mismo criterio que
 * `nextMaterialRequestNumber` de Almacenes: advisory lock de transaccion por empresa y
 * `MAX()+1`, con su propia clave de lock.
 */
export async function nextPurchaseRequestNumber(tx: NumberingTx, companyId: string): Promise<string> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`purchase_request_number:${companyId}`}, 0))`;

  const rows = await tx.$queryRaw<{ next: bigint }[]>`
    SELECT COALESCE(MAX(NULLIF(regexp_replace(number, '\\D', '', 'g'), '')::bigint), 0) + 1 AS next
    FROM purchase_requests
    WHERE company_id = ${companyId}::uuid
  `;

  return formatPurchaseRequestNumber(Number(rows[0]?.next ?? 1));
}
