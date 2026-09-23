'use server';

import { resolveVehicleTireTemplateId } from '@/features/Mantenimiento/Gomeria/shared/resolve-template';
import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';

const logger = new Logger('features/Mantenimiento/Gomeria/Ordenes/tire-service-qr');

/**
 * Contexto de gomería del equipo escaneado por el QR.
 *
 * La empresa sale del vehículo de la ruta (no hay empresa activa en este flujo) y la
 * plantilla efectiva de cubiertas es el override del vehículo o, si no tiene, la de su
 * subtipo. Devuelve `null` si el equipo no existe o no tiene empresa.
 */
export async function fetchTireServiceContextForEquipment(equipmentId: string) {
  try {
    const vehicle = await prisma.vehicles.findUnique({
      where: { id: equipmentId },
      select: {
        company_id: true,
        tire_template_id: true,
        sub_type: { select: { tire_template_id: true } },
      },
    });

    if (!vehicle?.company_id) return null;

    return {
      companyId: vehicle.company_id,
      tireTemplateId: resolveVehicleTireTemplateId(vehicle),
    };
  } catch (error) {
    logger.error('Error al obtener el contexto de gomería del equipo', { data: { error, equipmentId } });
    return null;
  }
}
