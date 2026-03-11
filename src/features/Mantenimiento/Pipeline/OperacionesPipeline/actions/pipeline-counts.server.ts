'use server';

import { Logger } from '@/lib/logger';
import { getServerCompanyId } from '@/shared/actions/company.actions';
import { prisma } from '@/shared/lib/prisma';
import { getSupervisorFilterInfo } from '../../../utils/supervisorFilter';
import type { PipelineCounts } from '../../types';

const logger = new Logger('Pipeline/Operaciones/counts');

/**
 * Obtiene los counts para cada paso del pipeline de Operaciones.
 * Filtrado por company_id y supervisor si corresponde.
 *
 * Pasos:
 * - validate:      Solicitudes en estado pending_approval (validar solicitud)
 * - approve_date:  Ordenes en estado pending_scheduling o scheduled (aprobacion de fecha por Operaciones)
 * - for_workshop:  Ordenes en estado workshop_pending o date_confirmed (listas para taller)
 * - in_workshop:   Ordenes en estado in_workshop (actualmente en taller)
 */
export async function getOperacionesPipelineCounts(): Promise<PipelineCounts> {
  try {
    const [companyId, filterInfo] = await Promise.all([getServerCompanyId(), getSupervisorFilterInfo()]);

    // Filtro base para maintenance_requests: por company (via vehicles) y supervisor si aplica
    const requestsWhere = {
      vehicles: { company_id: companyId },
      ...(filterInfo?.shouldFilterBySupervisor ? { supervisor_id: filterInfo.userId } : {}),
    };

    // Filtro base para maintenance_orders: por company (via vehicles) y supervisor via request si aplica
    const ordersWhere = {
      vehicles: { company_id: companyId },
      ...(filterInfo?.shouldFilterBySupervisor ? { maintenance_requests: { supervisor_id: filterInfo.userId } } : {}),
    };

    const [validate, approveDate, forWorkshop, inWorkshop] = await Promise.all([
      // Paso 1: Validar Solicitud — solicitudes pendientes de aprobacion
      prisma.maintenance_requests.count({
        where: { ...requestsWhere, status: 'pending_approval' },
      }),
      // Paso 2: Aprobar Fecha — ordenes pendientes de programacion o con fecha propuesta
      prisma.maintenance_orders.count({
        where: {
          ...ordersWhere,
          status: { in: ['pending_scheduling', 'scheduled'] },
        },
      }),
      // Paso 3: Para Taller — ordenes con fecha confirmada, listas para entrada al taller
      prisma.maintenance_orders.count({
        where: { ...ordersWhere, status: 'date_confirmed' },
      }),
      // Paso 4: Seguimiento — ordenes actualmente en taller (cualquier sub-estado de taller)
      prisma.maintenance_orders.count({
        where: { ...ordersWhere, status: 'in_workshop' },
      }),
    ]);

    logger.debug('Counts de pipeline Operaciones obtenidos', {
      data: { validate, approveDate, forWorkshop, inWorkshop, companyId },
    });

    return {
      validate,
      approve_date: approveDate,
      for_workshop: forWorkshop,
      in_workshop: inWorkshop,
    };
  } catch (error) {
    logger.error('Error al obtener counts de pipeline Operaciones', { data: { error } });
    return { validate: 0, approve_date: 0, for_workshop: 0, in_workshop: 0 };
  }
}

export type OperacionesPipelineCountsData = Awaited<ReturnType<typeof getOperacionesPipelineCounts>>;
