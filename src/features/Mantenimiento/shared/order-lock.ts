import 'server-only';

import type { Prisma } from '@/generated/prisma/client';

/**
 * Orden de locks del módulo de mantenimiento: **primero el pedido, después la OT**.
 *
 * El pedido (`maintenance_orders`) y sus OTs (`work_orders`) se escriben juntos en la misma
 * transacción desde tres lugares distintos: el panel del operario (`OperatorPanel`), las
 * validaciones del jefe de taller / operaciones (`MaintenanceOrders/actions/validations.server.ts`)
 * y el cierre manual de OTs externas (`MaintenanceOrders/actions/mutations.server.ts`).
 *
 * Si cada uno toma los locks en el orden que le queda cómodo, dos transacciones sobre el mismo
 * pedido se esperan en cruz: A lockea el pedido y va por la OT, B ya tiene la OT y va por el
 * pedido → deadlock, y Postgres mata a una de las dos. La Task 9c encontró el caso dentro de
 * `OperatorPanel` y unificó el orden ahí; esta función es ese mismo criterio compartido por los
 * tres módulos, para que el orden sea uno solo en TODO el dominio.
 *
 * Reglas de uso:
 *
 * 1. Toda transacción que escriba `maintenance_orders` Y `work_orders` (o cualquiera de las
 *    tablas que cuelgan de la OT: `work_order_items`, `work_order_item_repairs`) llama a esto
 *    **al principio**, antes de la primera escritura.
 * 2. "Escritura" incluye las implícitas: un `UPDATE` toma el lock de la fila igual que un
 *    `SELECT ... FOR UPDATE`. No alcanza con mirar dónde hay locks explícitos — hay que contar
 *    los `update`/`updateMany`/`create`.
 * 3. Un `SELECT` plano no toma lock de fila bajo `READ COMMITTED`, así que no cuenta para el
 *    orden... pero tampoco sirve como garantía: por eso las rutas que deciden en base a una
 *    lectura (¿queda alguna OT en progreso?, ¿están todas cerradas?) lockean el pedido ANTES de
 *    leer, no sólo antes de escribir.
 *
 * Es justo el tipo de detalle que un refactor futuro invierte sin darse cuenta ("total, el
 * update del pedido va al final"), así que el porqué está escrito acá y referenciado desde cada
 * llamador.
 */
export async function lockMaintenanceOrder(
  tx: Prisma.TransactionClient,
  maintenanceOrderId: string
): Promise<void> {
  await tx.$executeRaw`SELECT id FROM maintenance_orders WHERE id = ${maintenanceOrderId}::uuid FOR UPDATE`;
}
