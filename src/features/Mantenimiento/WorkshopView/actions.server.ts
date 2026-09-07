'use server';

import { Logger } from '@/lib/logger';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import { prisma } from '@/shared/lib/prisma';
import { OPEN_WORK_ONLY } from './workshop-view-filters';

const logger = new Logger('features/WorkshopView');

/**
 * Obtiene todos los sectores de taller activos con el desglose de conteos
 * por estado de OT (work_orders.status) para cada sector.
 *
 * Dos queries en paralelo:
 *  - `workshop_sectors.findMany` — metadata de los sectores
 *  - `maintenance_order_items.groupBy` + resolución de estados de OT
 *
 * Para `maintenance_order_items` sin OT asignada (work_order_id = null)
 * se usa la key `NULL_FILTER_VALUE` (representa "Sin OT").
 *
 * No filtra por company_id (decisión de negocio — se evaluará restricción por usuario más adelante).
 *
 * Sí excluye las tareas cuya OT ya terminó (ticket 650), con el mismo criterio
 * que la tabla de cada sector: si los conteos incluyeran el trabajo cerrado, el
 * acordeón mostraría un número que no coincide con las filas de adentro.
 */
export async function getWorkshopSectorsWithCounts() {
  logger.debug('Obteniendo sectores de taller con conteos por estado');

  try {
    const [sectors, grouped] = await Promise.all([
      prisma.workshop_sectors.findMany({
        where: { is_active: true },
        select: {
          id: true,
          name: true,
          description: true,
          workshops: { select: { id: true, name: true } },
        },
        orderBy: [{ workshops: { name: 'asc' } }, { name: 'asc' }],
      }),
      prisma.maintenance_order_items.groupBy({
        by: ['assigned_sector_id', 'work_order_id'],
        where: { assigned_sector_id: { not: null }, ...OPEN_WORK_ONLY },
        _count: { _all: true },
      }),
    ]);

    // Resolver status de work_orders para los work_order_id encontrados
    const workOrderIds = Array.from(
      new Set(grouped.map((g) => g.work_order_id).filter((id): id is string => id != null))
    );
    const workOrders =
      workOrderIds.length > 0
        ? await prisma.work_orders.findMany({
            where: { id: { in: workOrderIds } },
            select: { id: true, status: true },
          })
        : [];
    const woStatusById = new Map(workOrders.map((wo) => [wo.id, wo.status]));

    // sectorId → { statusKey → count }
    const countsBySector = new Map<string, Map<string, number>>();
    for (const row of grouped) {
      if (!row.assigned_sector_id) continue;
      const statusKey = row.work_order_id
        ? woStatusById.get(row.work_order_id) ?? NULL_FILTER_VALUE
        : NULL_FILTER_VALUE;
      let sectorMap = countsBySector.get(row.assigned_sector_id);
      if (!sectorMap) {
        sectorMap = new Map();
        countsBySector.set(row.assigned_sector_id, sectorMap);
      }
      sectorMap.set(statusKey, (sectorMap.get(statusKey) ?? 0) + row._count._all);
    }

    return sectors.map((s) => {
      const sectorMap = countsBySector.get(s.id);
      const statusCounts: Record<string, number> = {};
      if (sectorMap) {
        for (const [k, v] of sectorMap) statusCounts[k] = v;
      }
      return {
        id: s.id,
        name: s.name,
        description: s.description,
        workshopName: s.workshops?.name ?? null,
        statusCounts,
      };
    });
  } catch (error) {
    logger.error('Error al obtener sectores de taller', { data: { error } });
    return [];
  }
}

export type WorkshopSectorWithCount = Awaited<ReturnType<typeof getWorkshopSectorsWithCounts>>[number];
