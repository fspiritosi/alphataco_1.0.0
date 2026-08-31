'use server';

import { Logger } from '@/lib/logger';
import { getServerCompanyId } from '@/shared/actions/company.actions';
import { prisma } from '@/shared/lib/prisma';
import { DEFAULT_TRACKING_STATUSES } from '../../../WorkshopTracking/statuses';
import { resourceCompanyCondition } from '../../../shared/maintenance-resource';
import { getSupervisorFilterInfo } from '../../../utils/supervisorFilter';
import type { PipelineCounts } from '../../types';

const logger = new Logger('Pipeline/Operaciones/counts');

/**
 * Obtiene los counts para cada paso del pipeline de Operaciones.
 * Filtrado por company_id y supervisor si corresponde.
 *
 * Pasos:
 * - validate:    Solicitudes en estado pending_approval (validar solicitud)
 * - in_workshop: Ordenes pendientes de ingreso (date_confirmed) y actualmente en taller (in_workshop)
 */
export async function getOperacionesPipelineCounts(): Promise<PipelineCounts> {
  try {
    const [companyId, filterInfo] = await Promise.all([getServerCompanyId(), getSupervisorFilterInfo()]);

    // Filtro base para maintenance_requests: por company (vehiculo o equipamiento,
    // ticket 596) y supervisor si aplica
    const requestsWhere = {
      AND: [resourceCompanyCondition(companyId)],
      ...(filterInfo?.shouldFilterBySupervisor ? { supervisor_id: filterInfo.userId } : {}),
    };

    // Filtro base para maintenance_orders: por company y supervisor via request si aplica
    const ordersWhere = {
      AND: [resourceCompanyCondition(companyId)],
      ...(filterInfo?.shouldFilterBySupervisor ? { maintenance_requests: { supervisor_id: filterInfo.userId } } : {}),
    };

    const [validate, inWorkshop] = await Promise.all([
      // Paso 1: Validar Solicitud — solicitudes pendientes de aprobacion
      prisma.maintenance_requests.count({
        where: { ...requestsWhere, status: 'pending_approval' },
      }),
      // Paso 2: Seguimiento — se cuenta EXACTAMENTE lo que la tabla muestra por
      // defecto (misma constante), para que el chevron no diga un numero y el
      // listado otro.
      prisma.maintenance_orders.count({
        where: { ...ordersWhere, status: { in: DEFAULT_TRACKING_STATUSES } },
      }),
    ]);

    logger.debug('Counts de pipeline Operaciones obtenidos', {
      data: { validate, inWorkshop, companyId },
    });

    return {
      validate,
      in_workshop: inWorkshop,
    };
  } catch (error) {
    logger.error('Error al obtener counts de pipeline Operaciones', { data: { error } });
    return { validate: 0, in_workshop: 0 };
  }
}

export type OperacionesPipelineCountsData = Awaited<ReturnType<typeof getOperacionesPipelineCounts>>;
