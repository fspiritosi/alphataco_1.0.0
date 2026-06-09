'use server';

import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';
import { resolveVehicleTireTemplateId } from './resolve-template';

const logger = new Logger('features/Mantenimiento/Gomeria/shared/checkVehicleTireReadiness');

export type TireReadinessResult = { ready: true } | { ready: false; reason: 'no_template' };

/**
 * Verifica que un vehículo tenga plantilla efectiva (geometría de ejes).
 *
 * La medida por eje ya NO es bloqueante: se resuelve al cargar la cubierta dentro
 * de la orden (vía el tipo de rueda). Solo la ausencia de plantilla bloquea, porque
 * sin geometría no se pueden generar las posiciones del diagrama.
 */
export async function checkVehicleTireReadiness(vehicleId: string): Promise<TireReadinessResult> {
  logger.debug('Checking vehicle tire readiness', { data: { vehicleId } });

  try {
    const vehicle = await prisma.vehicles.findUnique({
      where: { id: vehicleId },
      select: {
        tire_template_id: true,
        sub_type: { select: { tire_template_id: true } },
      },
    });

    if (!vehicle) return { ready: false, reason: 'no_template' };

    const templateId = resolveVehicleTireTemplateId(vehicle);
    if (!templateId) return { ready: false, reason: 'no_template' };

    return { ready: true };
  } catch (error) {
    logger.error('Error checking vehicle tire readiness', { data: { error, vehicleId } });
    throw error;
  }
}
