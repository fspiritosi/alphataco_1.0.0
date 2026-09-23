import 'server-only';

import type { Prisma } from '@/generated/prisma/client';
import {
  computeWorkOrderBlocking,
  type SectorSequenceItem,
  type WorkOrderBlockingStatus,
} from '@/features/OperatorPanel/lib/sector-blocking';
import { prisma } from '@/shared/lib/prisma';

type PrismaLike = Prisma.TransactionClient | typeof prisma;

/**
 * Lado con base del bloqueo por secuencia de sectores: trae las filas y delega la regla en
 * `computeWorkOrderBlocking` (módulo puro, con tests).
 *
 * Recibe el cliente para poder correr dentro de la misma transacción que la escritura que
 * la consulta (por ejemplo `startWorkOrder`, que valida y arranca la OT de una).
 *
 * Módulo server-only (NO es una Server Action).
 */
export async function getWorkOrderBlockingStatus(
  client: PrismaLike,
  workOrderIds: readonly string[]
): Promise<Record<string, WorkOrderBlockingStatus>> {
  if (workOrderIds.length === 0) return {};

  // Pedidos que tocan estas OTs: el bloqueo se decide dentro de cada pedido.
  const seeds = await client.maintenance_order_items.findMany({
    where: { work_order_id: { in: [...workOrderIds] }, sector_sequence_order: { not: null } },
    select: { maintenance_order_id: true },
    distinct: ['maintenance_order_id'],
  });

  if (seeds.length === 0) {
    return Object.fromEntries(workOrderIds.map((id) => [id, { isBlocked: false, blockedBySector: null }]));
  }

  const rows = await client.maintenance_order_items.findMany({
    where: {
      maintenance_order_id: { in: seeds.map((seed) => seed.maintenance_order_id) },
      work_order_id: { not: null },
      sector_sequence_order: { not: null },
    },
    select: {
      maintenance_order_id: true,
      work_order_id: true,
      sector_sequence_order: true,
      assigned_sector_id: true,
      workshop_sectors: { select: { name: true } },
      work_orders: { select: { status: true } },
    },
  });

  const items: SectorSequenceItem[] = [];
  for (const row of rows) {
    if (!row.work_order_id || row.sector_sequence_order === null) continue;
    items.push({
      maintenanceOrderId: row.maintenance_order_id,
      workOrderId: row.work_order_id,
      sequenceOrder: row.sector_sequence_order,
      assignedSectorId: row.assigned_sector_id,
      sectorName: row.workshop_sectors?.name ?? null,
      workOrderStatus: row.work_orders?.status ?? null,
    });
  }

  return computeWorkOrderBlocking(workOrderIds, items);
}
