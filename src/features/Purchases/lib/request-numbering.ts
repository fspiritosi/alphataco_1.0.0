import 'server-only';

import type { Prisma } from '@/generated/prisma/client';
import { nextPurchaseDocumentNumber } from './document-number';

type NumberingTx = Pick<Prisma.TransactionClient, '$executeRaw' | '$queryRaw'>;

/** Siguiente `purchase_requests.number` de la empresa (`SC-000001`). */
export function nextPurchaseRequestNumber(tx: NumberingTx, companyId: string): Promise<string> {
  return nextPurchaseDocumentNumber(tx, companyId, 'request');
}
