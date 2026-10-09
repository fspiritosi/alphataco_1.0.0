import 'server-only';

import { Prisma } from '@/generated/prisma/client';

/**
 * "Pedido en OC" de una linea de solicitud, como expresion SQL. Es la UNICA definicion: la usan el
 * avance de la solicitud, lo que falta pedir, el buscador de lineas, el detalle y la columna
 * Avance de la tabla (lecciones del CLAUDE.md: una regla escrita en varios lugares diverge).
 *
 *   OC no anuladas ni cerradas -> lo pedido en la linea de OC;
 *   OC cerradas (etapa 3)      -> solo lo RECIBIDO en recepciones vigentes (lo no entregado
 *                                 vuelve a quedar pendiente en la solicitud).
 *
 * `requestLineId` es la expresion de la columna (p. ej. `Prisma.raw('l.id')`); `excludeOrderId`
 * deja afuera una OC (la que se esta editando).
 */
export function orderedQuantitySql(requestLineId: Prisma.Sql, excludeOrderId: string | null = null): Prisma.Sql {
  return Prisma.sql`COALESCE((
    SELECT SUM(
      CASE WHEN o.status = 'CLOSED' THEN COALESCE((
        SELECT SUM(rl.quantity)
        FROM purchase_receipt_lines rl
        JOIN purchase_receipts r ON r.id = rl.receipt_id
        WHERE rl.order_line_id = ol.id AND r.cancelled_at IS NULL
      ), 0)
      ELSE ol.quantity END
    )
    FROM purchase_order_lines ol
    JOIN purchase_orders o ON o.id = ol.order_id
    WHERE ol.request_line_id = ${requestLineId}
      AND o.status <> 'CANCELLED'
      AND (${excludeOrderId}::uuid IS NULL OR o.id <> ${excludeOrderId}::uuid)
  ), 0)`;
}
