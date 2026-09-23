'use server';

import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';

const logger = new Logger('Mantenimiento/shared/equipment-company');

/**
 * Empresa del equipo de la ruta, o `null` si el equipo no existe o no tiene empresa.
 *
 * Es la comprobación de existencia de las pantallas del QR: el `equipmentId` llega del
 * caller anónimo, y sin empresa no hay perímetro posible. Se distingue de
 * `getResourceCompanyId()` (que lanza) porque acá el caso "no existe" es una redirección
 * normal de la página, no un error.
 */
export async function getEquipmentCompanyIdOrNull(equipmentId: string): Promise<string | null> {
  try {
    const vehicle = await prisma.vehicles.findUnique({
      where: { id: equipmentId },
      select: { company_id: true },
    });
    return vehicle?.company_id ?? null;
  } catch (error) {
    logger.error('Error al resolver la empresa del equipo', { data: { error, equipmentId } });
    return null;
  }
}
