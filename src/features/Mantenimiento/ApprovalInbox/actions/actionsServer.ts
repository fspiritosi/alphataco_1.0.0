'use server';

import { Logger } from '@/lib/logger';
import { requireServerAuthProfile } from '@/shared/actions/auth.actions';
import { CACHE_TAGS, CACHE_TTL } from '@/shared/constants/cache';
import { INVALIDATION_MAP } from '@/shared/constants/cache-invalidation-map';
import { prisma } from '@/shared/lib/prisma';
import { invalidateCacheTags } from '@/shared/utils/cache-invalidation';
import { cacheLife, cacheTag } from 'next/cache';

const logger = new Logger('ApprovalInbox/actions');

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Obtiene tareas pendientes de aprobacion (status: pending_approval)
 * Estas son tareas agregadas por operarios con tipos de reparacion autorizables
 */
export async function getPendingApprovalTasks() {
  'use cache';
  cacheTag(CACHE_TAGS.TAB_APPROVALS, CACHE_TAGS.WORK_ORDER_REPAIRS);
  cacheLife({ expire: CACHE_TTL.PAGINATED_LIST, revalidate: CACHE_TTL.PAGINATED_LIST, stale: 30 });

  logger.debug('Obteniendo tareas pendientes de aprobacion');

  try {
    const data = await prisma.work_order_item_repairs.findMany({
      where: { status: 'pending_approval' },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        work_order_item_id: true,
        repair_type_id: true,
        status: true,
        technician_notes: true,
        completed_at: true,
        completed_by: true,
        created_at: true,
        updated_at: true,
        added_by: true,
        approved_by: true,
        approved_at: true,
        rejection_reason: true,
        original_sector_id: true,
        is_operator_added: true,
        return_reason: true,
        is_diagnostico: true,
        technician_notes_by: true,
        types_of_repairs: {
          select: { id: true, name: true, autorizable: true },
        },
        profile_work_order_item_repairs_added_byToprofile: {
          select: { id: true, email: true, fullname: true },
        },
        work_order_items: {
          select: {
            id: true,
            maintenance_order_items: {
              select: {
                id: true,
                maintenance_order_id: true,
                assigned_sector_id: true,
                description: true,
                workshop_sectors: {
                  select: { id: true, name: true },
                },
                maintenance_request_items: {
                  select: { driver_comment: true, description: true },
                },
                maintenance_orders: {
                  select: {
                    id: true,
                    order_number: true,
                    equipment_id: true,
                    vehicles: {
                      select: { id: true, domain: true, serie: true, intern_number: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Mapear para mantener compatibilidad de nombres con la query de Supabase original
    return data.map((item) => ({
      ...item,
      added_by_user: item.profile_work_order_item_repairs_added_byToprofile,
    }));
  } catch (error) {
    logger.error('Error al obtener tareas pendientes de aprobacion', { data: { error } });
    throw error;
  }
}

export type PendingTasksData = Awaited<ReturnType<typeof getPendingApprovalTasks>>;
export type PendingTaskData = PendingTasksData[number];

/**
 * Obtiene tareas devueltas por reasignacion (status: reassignment_requested)
 */
export async function getReturnedTasks() {
  'use cache';
  cacheTag(CACHE_TAGS.TAB_APPROVALS, CACHE_TAGS.WORK_ORDER_REPAIRS);
  cacheLife({ expire: CACHE_TTL.PAGINATED_LIST, revalidate: CACHE_TTL.PAGINATED_LIST, stale: 30 });

  logger.debug('Obteniendo tareas devueltas por reasignacion');

  try {
    const data = await prisma.work_order_item_repairs.findMany({
      where: { status: 'reassignment_requested' },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        work_order_item_id: true,
        repair_type_id: true,
        status: true,
        technician_notes: true,
        completed_at: true,
        completed_by: true,
        created_at: true,
        updated_at: true,
        added_by: true,
        approved_by: true,
        approved_at: true,
        rejection_reason: true,
        original_sector_id: true,
        is_operator_added: true,
        return_reason: true,
        is_diagnostico: true,
        technician_notes_by: true,
        types_of_repairs: {
          select: { id: true, name: true },
        },
        // original_sector_id → workshop_sectors (FK en work_order_item_repairs)
        workshop_sectors: {
          select: { id: true, name: true },
        },
        work_order_items: {
          select: {
            id: true,
            maintenance_order_items: {
              select: {
                id: true,
                maintenance_order_id: true,
                assigned_sector_id: true,
                description: true,
                workshop_sectors: {
                  select: { id: true, name: true },
                },
                maintenance_request_items: {
                  select: { driver_comment: true, description: true },
                },
                maintenance_orders: {
                  select: {
                    id: true,
                    order_number: true,
                    equipment_id: true,
                    vehicles: {
                      select: { id: true, domain: true, serie: true, intern_number: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Mapear para mantener compatibilidad de nombres con la query de Supabase original
    return data.map((item) => ({
      ...item,
      original_sector: item.workshop_sectors,
    }));
  } catch (error) {
    logger.error('Error al obtener tareas devueltas', { data: { error } });
    throw error;
  }
}

export type ReturnedTasksData = Awaited<ReturnType<typeof getReturnedTasks>>;
export type ReturnedTaskData = ReturnedTasksData[number];

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Aprueba una tarea pendiente de autorizacion
 */
export async function approveTask(taskId: string) {
  const profile = await requireServerAuthProfile();

  logger.debug('Aprobando tarea', { data: { taskId, approvedBy: profile.id } });

  try {
    await prisma.work_order_item_repairs.update({
      where: { id: taskId },
      data: {
        status: 'pending',
        approved_by: profile.id,
        approved_at: new Date(),
      },
    });
  } catch (error) {
    logger.error('Error al aprobar tarea', { data: { error, taskId } });
    throw new Error(`Error al aprobar tarea: ${error instanceof Error ? error.message : String(error)}`);
  }

  await invalidateCacheTags(INVALIDATION_MAP.approveTask);

  logger.info('Tarea aprobada', { data: { taskId } });
}

/**
 * Rechaza una tarea pendiente de autorizacion
 */
export async function rejectTask(taskId: string, reason: string) {
  const profile = await requireServerAuthProfile();

  logger.debug('Rechazando tarea', { data: { taskId, rejectedBy: profile.id } });

  try {
    await prisma.work_order_item_repairs.update({
      where: { id: taskId },
      data: {
        status: 'rejected',
        rejection_reason: reason,
        approved_by: profile.id,
        approved_at: new Date(),
      },
    });
  } catch (error) {
    logger.error('Error al rechazar tarea', { data: { error, taskId } });
    throw new Error(`Error al rechazar tarea: ${error instanceof Error ? error.message : String(error)}`);
  }

  await invalidateCacheTags(INVALIDATION_MAP.rejectTask);

  logger.info('Tarea rechazada', { data: { taskId, reason } });
}

/**
 * Reasigna una tarea devuelta a un nuevo sector
 */
export async function reassignTaskToSector(taskId: string, newSectorId: string) {
  logger.debug('Reasignando tarea a nuevo sector', { data: { taskId, newSectorId } });

  try {
    // Primero obtener el work_order_item para actualizar el maintenance_order_item
    const repair = await prisma.work_order_item_repairs.findUnique({
      where: { id: taskId },
      select: {
        work_order_items: {
          select: { maintenance_order_item_id: true },
        },
      },
    });

    if (!repair) {
      throw new Error('Tarea no encontrada');
    }

    // Actualizar el status de la reparacion
    await prisma.work_order_item_repairs.update({
      where: { id: taskId },
      data: { status: 'pending' },
    });

    // Actualizar el sector del maintenance_order_item si existe
    const moItemId = repair.work_order_items?.maintenance_order_item_id;
    if (moItemId) {
      await prisma.maintenance_order_items.update({
        where: { id: moItemId },
        data: { assigned_sector_id: newSectorId },
      });
    }
  } catch (error) {
    logger.error('Error al reasignar tarea', { data: { error, taskId, newSectorId } });
    throw new Error(`Error al reasignar: ${error instanceof Error ? error.message : String(error)}`);
  }

  await invalidateCacheTags(INVALIDATION_MAP.reassignTaskToSector);

  logger.info('Tarea reasignada a nuevo sector', { data: { taskId, newSectorId } });
}
