'use server';

import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';
import { OCCUPYING_WORK_ORDER_STATUSES, OPEN_WORK_ORDERS_ONLY } from './workshop-view-filters';

const logger = new Logger('features/WorkshopView');

/**
 * Obtiene todos los sectores de taller activos con:
 *  - el desglose de **órdenes de trabajo** abiertas por estado
 *  - el cupo configurado (`workshop_sectors.max_capacity`, nullable) y su semáforo
 *
 * Ticket 678: antes se contaban TAREAS (`maintenance_order_items`), lo que hacía
 * que un camión con cuatro tareas se mostrara como "4 órdenes de trabajo". Una OT
 * pertenece a UNA unidad, así que contar OT es contar unidades dentro del sector.
 *
 * Tres queries en paralelo:
 *  - `workshop_sectors.findMany` — metadata + cupo
 *  - `work_orders.groupBy` — OT abiertas por sector y estado
 *  - `maintenance_order_items.groupBy` — tareas asignadas al sector que todavía
 *    no tienen OT generada (trabajo pendiente que el taller igual tiene que ver)
 *
 * No filtra por company_id (decisión de negocio — se evaluará restricción por
 * usuario más adelante).
 */
export async function getWorkshopSectorsWithCounts() {
  logger.debug('Obteniendo sectores de taller con conteos de OT y cupos');

  try {
    const [sectors, workOrderGroups, unassignedTaskGroups] = await Promise.all([
      prisma.workshop_sectors.findMany({
        where: { is_active: true },
        select: {
          id: true,
          name: true,
          description: true,
          max_capacity: true,
          workshops: { select: { id: true, name: true } },
        },
        orderBy: [{ workshops: { name: 'asc' } }, { name: 'asc' }],
      }),
      prisma.work_orders.groupBy({
        by: ['sector_id', 'status'],
        where: { sector_id: { not: null }, ...OPEN_WORK_ORDERS_ONLY },
        _count: { _all: true },
      }),
      prisma.maintenance_order_items.groupBy({
        by: ['assigned_sector_id'],
        where: { assigned_sector_id: { not: null }, work_order_id: null },
        _count: { _all: true },
      }),
    ]);

    // sectorId → { estado de OT → cantidad de OT }
    const countsBySector = new Map<string, Record<string, number>>();
    for (const row of workOrderGroups) {
      if (!row.sector_id) continue;
      const sectorCounts = countsBySector.get(row.sector_id) ?? {};
      sectorCounts[row.status] = (sectorCounts[row.status] ?? 0) + row._count._all;
      countsBySector.set(row.sector_id, sectorCounts);
    }

    // sectorId → tareas asignadas sin OT generada
    const unassignedBySector = new Map<string, number>();
    for (const row of unassignedTaskGroups) {
      if (!row.assigned_sector_id) continue;
      unassignedBySector.set(row.assigned_sector_id, row._count._all);
    }

    return sectors.map((sector) => {
      const statusCounts = countsBySector.get(sector.id) ?? {};

      // Cupos ocupados = OT que ya están dentro del taller (ver OCCUPYING_WORK_ORDER_STATUSES)
      const occupiedSlots = OCCUPYING_WORK_ORDER_STATUSES.reduce(
        (total, status) => total + (statusCounts[status] ?? 0),
        0
      );

      const maxCapacity = sector.max_capacity;
      // Sin cupo configurado no hay semáforo que mostrar
      const availableSlots = maxCapacity == null ? null : Math.max(maxCapacity - occupiedSlots, 0);
      const isOverCapacity = maxCapacity != null && occupiedSlots > maxCapacity;

      return {
        id: sector.id,
        name: sector.name,
        description: sector.description,
        workshopName: sector.workshops?.name ?? null,
        maxCapacity,
        occupiedSlots,
        availableSlots,
        isOverCapacity,
        statusCounts,
        unassignedTaskCount: unassignedBySector.get(sector.id) ?? 0,
      };
    });
  } catch (error) {
    logger.error('Error al obtener sectores de taller', { data: { error } });
    return [];
  }
}

export type WorkshopSectorWithCount = Awaited<ReturnType<typeof getWorkshopSectorsWithCounts>>[number];
