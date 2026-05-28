'use server';

import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';
import { resolveVehicleTireTemplateId } from './resolve-template';
import { getAxlesMissingSize } from './resolve-tire-size';

const logger = new Logger('features/Mantenimiento/Gomeria/shared/checkVehicleTireReadiness');

export type TireReadinessResult =
  | { ready: true }
  | { ready: false; reason: 'no_template' }
  | { ready: false; reason: 'missing_sizes'; missingAxles: number[] };

/**
 * Verifica que un vehículo tenga plantilla efectiva Y medidas resueltas
 * para todos sus ejes (template o override de vehículo).
 */
export async function checkVehicleTireReadiness(vehicleId: string): Promise<TireReadinessResult> {
  logger.debug('Checking vehicle tire readiness', { data: { vehicleId } });

  try {
    const vehicle = await prisma.vehicles.findUnique({
      where: { id: vehicleId },
      select: {
        tire_template_id: true,
        sub_type: { select: { tire_template_id: true } },
        vehicle_axle_tire_sizes: { select: { axle_number: true, tire_size: true } },
      },
    });

    if (!vehicle) return { ready: false, reason: 'no_template' };

    const templateId = resolveVehicleTireTemplateId(vehicle);
    if (!templateId) return { ready: false, reason: 'no_template' };

    const axles = await prisma.tire_template_axles.findMany({
      where: { template_id: templateId },
      select: { axle_number: true, tire_size: true },
    });

    const overrides = new Map(
      vehicle.vehicle_axle_tire_sizes.map((o) => [o.axle_number, o.tire_size])
    );
    const missingAxles = getAxlesMissingSize(axles, overrides);

    if (missingAxles.length > 0) {
      return { ready: false, reason: 'missing_sizes', missingAxles };
    }
    return { ready: true };
  } catch (error) {
    logger.error('Error checking vehicle tire readiness', { data: { error, vehicleId } });
    throw error;
  }
}
