'use server';

import { Logger } from '@/lib/logger';
import { getServerCompanyId } from '@/shared/actions/company.actions';
import { prisma } from '@/shared/lib/prisma';
import { resourceCompanyCondition, visibleEquipmentTypeCondition } from '../../../shared/maintenance-resource';
import { getHiddenEquipmentTypeIds } from '../../../utils/equipmentTypeVisibility';
import { getSupervisorFilterInfo } from '../../../utils/supervisorFilter';
import type { PipelineCounts } from '../../types';

const logger = new Logger('Pipeline/Taller/counts');

/**
 * Obtiene los counts para cada paso del pipeline de Taller.
 * Filtrado por company_id y supervisor (si el usuario no tiene view_all_requests).
 *
 * Pasos:
 * - schedule:    Ordenes en estado pending_scheduling (por programar)
 * - confirmed:   Ordenes en estado date_confirmed (con fecha asignada, esperando ingreso)
 * - in_workshop: Ordenes en estado in_workshop (actualmente en taller)
 * - approvals:   Reparaciones de items en estado pending_approval o reassignment_requested
 *
 * Cadena de relacion para approvals (work_order_item_repairs):
 * work_order_item_repairs → work_order_items → maintenance_order_items → maintenance_orders → vehicles
 */
export async function getTallerPipelineCounts(): Promise<PipelineCounts> {
  try {
    const [companyId, supervisorFilter, hiddenTypeIds] = await Promise.all([
      getServerCompanyId(),
      getSupervisorFilterInfo(),
      getHiddenEquipmentTypeIds(),
    ]);

    const supervisorCondition: Record<string, unknown> = {};
    if (supervisorFilter?.shouldFilterBySupervisor) {
      supervisorCondition.maintenance_requests = {
        supervisor_id: supervisorFilter.userId,
      };
    }

    // Tipos de equipamiento ocultos para el usuario actual (ticket 690)
    const equipmentCondition = visibleEquipmentTypeCondition(hiddenTypeIds);
    const equipmentAnd = equipmentCondition ? [equipmentCondition] : [];

    // Vehiculo o equipamiento (ticket 596)
    const ordersWhere = {
      AND: [resourceCompanyCondition(companyId), ...equipmentAnd],
      ...supervisorCondition,
    };

    const [schedule, confirmed, inWorkshop, validationOrders, pendingApprovalRepairs, reassignmentRepairs] =
      await Promise.all([
        // Paso 1: Por Programar — ordenes pendientes de asignacion de fecha
        prisma.maintenance_orders.count({
          where: { ...ordersWhere, status: 'pending_scheduling' },
        }),
        // Paso 2: Por Ingresar — con fecha asignada, esperando entrada al taller
        prisma.maintenance_orders.count({
          where: { ...ordersWhere, status: 'date_confirmed' },
        }),
        // Paso 3: En Taller — ordenes actualmente en taller (sin pending_workshop_validation)
        prisma.maintenance_orders.count({
          where: { ...ordersWhere, status: 'in_workshop' },
        }),
        // Paso 4a: Ordenes pendientes de validacion del jefe de taller
        prisma.maintenance_orders.count({
          where: { ...ordersWhere, status: 'pending_workshop_validation' },
        }),
        // Paso 4b: Reparaciones pendientes de aprobacion
        prisma.work_order_item_repairs.count({
          where: {
            status: 'pending_approval',
            work_order_items: {
              maintenance_order_items: {
                maintenance_orders: {
                  AND: [resourceCompanyCondition(companyId), ...equipmentAnd],
                  ...supervisorCondition,
                },
              },
            },
          },
        }),
        // Paso 4c: Reparaciones en reasignacion
        prisma.work_order_item_repairs.count({
          where: {
            status: 'reassignment_requested',
            work_order_items: {
              maintenance_order_items: {
                maintenance_orders: {
                  AND: [resourceCompanyCondition(companyId), ...equipmentAnd],
                  ...supervisorCondition,
                },
              },
            },
          },
        }),
      ]);

    // Paso 4: suma de validaciones + autorizaciones + reasignaciones
    const approvals = validationOrders + pendingApprovalRepairs + reassignmentRepairs;

    logger.debug('Counts de pipeline Taller obtenidos', {
      data: {
        schedule,
        confirmed,
        inWorkshop,
        approvals,
        validationOrders,
        pendingApprovalRepairs,
        reassignmentRepairs,
        companyId,
      },
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
