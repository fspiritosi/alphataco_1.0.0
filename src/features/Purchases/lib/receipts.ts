import 'server-only';

import type { Prisma } from '@/generated/prisma/client';
import { PurchaseError } from './purchase-errors';

export interface LockedPurchaseReceipt {
  id: string;
  number: string;
  orderId: string;
  stockMovementId: string | null;
}

/** Lockea una recepcion VIGENTE (`FOR UPDATE`): dos anulaciones simultaneas quedan en fila. */
export async function lockPurchaseReceipt(
  tx: Pick<Prisma.TransactionClient, '$queryRaw'>,
  companyId: string,
  receiptId: string
): Promise<LockedPurchaseReceipt> {
  const rows = await tx.$queryRaw<{ id: string; number: string; order_id: string; stock_movement_id: string | null; cancelled_at: Date | null }[]>`
    SELECT id, number, order_id, stock_movement_id, cancelled_at
    FROM purchase_receipts
    WHERE id = ${receiptId}::uuid AND company_id = ${companyId}::uuid
    FOR UPDATE
  `;
  const row = rows[0];
  if (!row) throw new PurchaseError('La recepción no existe');
  if (row.cancelled_at) throw new PurchaseError(`La recepción ${row.number} ya fue anulada`);
  return { id: row.id, number: row.number, orderId: row.order_id, stockMovementId: row.stock_movement_id };
}

/** Lock de la OC sin validar transicion (la anulacion de una recepcion recalcula su estado). */
export async function lockOrderRow(tx: Pick<Prisma.TransactionClient, '$queryRaw'>, orderId: string): Promise<void> {
  await tx.$queryRaw`SELECT id FROM purchase_orders WHERE id = ${orderId}::uuid FOR UPDATE`;
}
