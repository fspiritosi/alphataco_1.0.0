import 'server-only';

import type { Prisma } from '@/generated/prisma/client';
import { PurchaseError } from './purchase-errors';
import {
  PURCHASE_QUOTE_STATUS_PAST,
  canApplyPurchaseQuoteAction,
  type PurchaseQuoteAction,
  type PurchaseQuoteStatus,
} from './quote-state-machine';

export interface LockedPurchaseQuote {
  id: string;
  number: string;
  status: PurchaseQuoteStatus;
  supplierId: string;
}

/** Lockea el pedido de cotizacion (`FOR UPDATE`) y valida que admita la accion. */
export async function lockPurchaseQuote(
  tx: Pick<Prisma.TransactionClient, '$queryRaw'>,
  companyId: string,
  quoteId: string,
  action: PurchaseQuoteAction
): Promise<LockedPurchaseQuote> {
  const rows = await tx.$queryRaw<{ id: string; number: string; status: PurchaseQuoteStatus; supplier_id: string }[]>`
    SELECT id, number, status::text AS status, supplier_id
    FROM purchase_quotes
    WHERE id = ${quoteId}::uuid AND company_id = ${companyId}::uuid
    FOR UPDATE
  `;
  const row = rows[0];
  if (!row) throw new PurchaseError('La cotización no existe');
  if (!canApplyPurchaseQuoteAction(row.status, action)) {
    throw new PurchaseError(`La cotización ${row.number} ya fue ${PURCHASE_QUOTE_STATUS_PAST[row.status]}`);
  }
  return { id: row.id, number: row.number, status: row.status, supplierId: row.supplier_id };
}

/** Una cotizacion con OC no anulada ya no se corrige: su precio esta comprometido. */
export async function quoteHasOrders(tx: Pick<Prisma.TransactionClient, 'purchase_orders'>, quoteId: string): Promise<boolean> {
  const count = await tx.purchase_orders.count({ where: { quote_id: quoteId, status: { not: 'CANCELLED' } } });
  return count > 0;
}
