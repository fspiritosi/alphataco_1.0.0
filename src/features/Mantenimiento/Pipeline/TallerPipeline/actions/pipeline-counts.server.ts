'use server';

import { Logger } from '@/lib/logger';
import { getServerCompanyId } from '@/shared/actions/company.actions';
import { prisma } from '@/shared/lib/prisma';
import type { PipelineCounts } from '../../types';

const logger = new Logger('Pipeline/Taller/counts');

/**
 * Obtiene los counts para cada paso del pipeline de Taller.
 * Filtrado por company_id. El pipeline de Taller no aplica filtro de supervisor.
 *
 * Pasos:
 * - schedule:    Ordenes en estado pending_scheduling o date_rejected (por programar)
 * - confirmed:   Ordenes en estado workshop_pending o date_confirmed (confirmadas, esperando entrada)
 * - in_workshop: Ordenes en estado in_progress (actualmente en taller)
 * - approvals:   Reparaciones de items en estado pending_approval o reassignment_requested
 *
 * Cadena de relacion para approvals (work_order_item_repairs):
 * work_order_item_repairs → work_order_items → maintenance_order_items → maintenance_orders → vehicles
 */
export async function getTallerPipelineCounts(): Promise<PipelineCounts> {
  try {
    const companyId = await getServerCompanyId();

    const ordersWhere = {
      vehicles: { company_id: companyId },
    };

    const [schedule, confirmed, inWorkshop, approvals] = await Promise.all([
      // Paso 1: Por Programar — ordenes sin fecha asignada o con fecha rechazada por Operaciones
      prisma.maintenance_orders.count({
        where: {
          ...ordersWhere,
          status: { in: ['pending_scheduling', 'date_rejected'] },
        },
      }),
      // Paso 2: Confirmados — fecha aprobada por Operaciones, esperando entrada al taller
      prisma.maintenance_orders.count({
        where: {
          ...ordersWhere,
          status: { in: ['workshop_pending', 'date_confirmed'] },
        },
      }),
      // Paso 3: En Taller — ordenes actualmente en taller
      prisma.maintenance_orders.count({
        where: { ...ordersWhere, status: 'in_workshop' },
      }),
      // Paso 4: Aprobaciones — reparaciones de items pendientes de aprobacion o reasignacion
      // Cadena: work_order_item_repairs → work_order_items → maintenance_order_items → maintenance_orders → vehicles
      prisma.work_order_item_repairs.count({
        where: {
          status: { in: ['pending_approval', 'reassignment_requested'] },
          work_order_items: {
            maintenance_order_items: {
              maintenance_orders: {
                vehicles: { company_id: companyId },
              },
            },
          },
        },
      }),
    ]);

    logger.debug('Counts de pipeline Taller obtenidos', {
      data: { schedule, confirmed, inWorkshop, approvals, companyId },
    });

    return {
      schedule,
      confirmed,
      in_workshop: inWorkshop,
      approvals,
    };
  } catch (error) {
    logger.error('Error al obtener counts de pipeline Taller', { data: { error } });
    return { schedule: 0, confirmed: 0, in_workshop: 0, approvals: 0 };
  }
}

export type TallerPipelineCountsData = Awaited<ReturnType<typeof getTallerPipelineCounts>>;
