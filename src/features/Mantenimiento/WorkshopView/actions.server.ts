'use server';

import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';

const logger = new Logger('features/WorkshopView');

/**
 * Obtiene todos los sectores de taller activos con el conteo total de
 * tareas (maintenance_order_items) asignadas a cada uno.
 *
 * Una sola query — evita N+1 usando `_count` relacional de Prisma.
 * No filtra por company_id (decisión de negocio — se evaluará restricción por usuario más adelante).
 */
export async function getWorkshopSectorsWithCounts() {
  logger.debug('Obteniendo sectores de taller con conteo');

  try {
    const sectors = await prisma.workshop_sectors.findMany({
      where: { is_active: true },
      select: {
        id: true,
        name: true,
        description: true,
        workshops: { select: { id: true, name: true } },
        _count: {
          select: { maintenance_order_items: true },
        },
      },
      orderBy: [{ workshops: { name: 'asc' } }, { name: 'asc' }],
    });

    return sectors.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      workshopName: s.workshops?.name ?? null,
      count: s._count.maintenance_order_items,
    }));
  } catch (error) {
    logger.error('Error al obtener sectores de taller', { data: { error } });
    return [];
  }
}

export type WorkshopSectorWithCount = Awaited<ReturnType<typeof getWorkshopSectorsWithCounts>>[number];
