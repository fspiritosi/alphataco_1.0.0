'use server';

import { work_order_status } from '@/generated/prisma/enums';
import { Logger } from '@/lib/logger';
import { requireServerAuthProfile } from '@/shared/actions/auth.actions';
import { INVALIDATION_MAP } from '@/shared/constants/cache-invalidation-map';
import { prisma } from '@/shared/lib/prisma';
import { invalidateCacheTags } from '@/shared/utils/cache-invalidation';
import type { WorkOrderDetail, WorkOrderItemDetail, WorkOrderRowData } from '../types';

const logger = new Logger('OrdenesTrabajo/actions');

// =============================================================================
// HELPERS INTERNOS
// =============================================================================

/**
 * Obtiene el total_paused_time (interval) de una o varias OTs usando SQL raw.
 * Retorna un Map<id, string|null> con el valor como string de intervalo PostgreSQL.
 */
async function getPausedTimeForOrders(ids: string[]): Promise<Map<string, string | null>> {
  if (ids.length === 0) return new Map();

  const rows = await prisma.$queryRaw<{ id: string; total_paused_time: string | null }[]>`
    SELECT id, total_paused_time::text
    FROM work_orders
    WHERE id = ANY(${ids}::uuid[])
  `;

  const map = new Map<string, string | null>();
  for (const row of rows) {
    map.set(row.id, row.total_paused_time);
  }
  return map;
}

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Obtiene todas las órdenes de trabajo con filtro opcional por estado
 */
export async function getWorkOrders(status?: string | string[]) {
  try {
    const statusFilter =
      status !== undefined
        ? Array.isArray(status)
          ? { in: status as work_order_status[] }
          : { equals: status as work_order_status }
        : undefined;

    const data = await prisma.work_orders.findMany({
      where: statusFilter ? { status: statusFilter } : undefined,
      select: {
        id: true,
        order_number: true,
        sequence_number: true,
        status: true,
        priority: true,
        equipment_id: true,
        workshop_id: true,
        sector_id: true,
        planned_start_date: true,
        planned_end_date: true,
        actual_start_date: true,
        actual_end_date: true,
        notes: true,
        created_at: true,
        created_by: true,
        paused_at: true,
        pause_reason: true,
        vehicles: {
          select: {
            id: true,
            domain: true,
            serie: true,
            intern_number: true,
            types_of_vehicles: {
              select: { name: true },
            },
          },
        },
        workshops: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        workshop_sectors: {
          select: {
            id: true,
            name: true,
          },
        },
        work_order_items: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    // Obtener total_paused_time por separado (tipo Unsupported "interval" en Prisma)
    const pausedTimeMap = await getPausedTimeForOrders(data.map((wo) => wo.id));

    // Transformar a WorkOrderRowData
    const workOrders: WorkOrderRowData[] = data.map((wo) => {
      const items = wo.work_order_items || [];
      const completedItems = items.filter((i) => i.status === 'completed').length;

      return {
        id: wo.id,
        orderNumber: wo.order_number,
        sequenceNumber: wo.sequence_number,
        status: wo.status as WorkOrderRowData['status'],
        priority: wo.priority as WorkOrderRowData['priority'],
        equipmentId: wo.equipment_id,
        vehicleDomain: wo.vehicles?.domain || null,
        vehicleSerie: wo.vehicles?.serie || null,
        vehicleInternNumber: wo.vehicles?.intern_number || null,
        vehicleType: wo.vehicles?.types_of_vehicles?.name || null,
        workshopId: wo.workshop_id,
        workshopName: wo.workshops?.name || '',
        workshopType: (wo.workshops?.type || 'interno') as WorkOrderRowData['workshopType'],
        sectorId: wo.sector_id,
        sectorName: wo.workshop_sectors?.name || null,
        plannedStartDate: wo.planned_start_date?.toISOString() ?? null,
        plannedEndDate: wo.planned_end_date?.toISOString() ?? null,
        actualStartDate: wo.actual_start_date?.toISOString() ?? null,
        actualEndDate: wo.actual_end_date?.toISOString() ?? null,
        totalItems: items.length,
        completedItems,
        notes: wo.notes,
        createdAt: wo.created_at?.toISOString() ?? null,
        createdBy: wo.created_by,
        pausedAt: wo.paused_at?.toISOString() ?? null,
        pauseReason: wo.pause_reason,
        totalPausedTime: pausedTimeMap.get(wo.id) ?? null,
      };
    });

    return workOrders;
  } catch (error) {
    logger.error('Error obteniendo órdenes de trabajo', { data: { error } });
    throw new Error('Error al obtener órdenes de trabajo');
  }
}

/**
 * Obtiene el detalle completo de una orden de trabajo
 */
export async function getWorkOrderDetail(workOrderId: string): Promise<WorkOrderDetail | null> {
  try {
    // Obtener la orden con datos del vehículo, taller, sector y quién pausó
    const wo = await prisma.work_orders.findUnique({
      where: { id: workOrderId },
      select: {
        id: true,
        order_number: true,
        sequence_number: true,
        status: true,
        priority: true,
        equipment_id: true,
        workshop_id: true,
        sector_id: true,
        planned_start_date: true,
        planned_end_date: true,
        actual_start_date: true,
        actual_end_date: true,
        notes: true,
        created_at: true,
        created_by: true,
        started_at: true,
        started_by: true,
        completed_at: true,
        completed_by: true,
        cancelled_at: true,
        cancelled_by: true,
        cancellation_reason: true,
        paused_at: true,
        paused_by: true,
        pause_reason: true,
        vehicles: {
          select: {
            id: true,
            domain: true,
            serie: true,
            intern_number: true,
            kilometer: true,
            engine_hours: true,
            condition: true,
            types_of_vehicles: {
              select: { name: true },
            },
          },
        },
        workshops: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        workshop_sectors: {
          select: {
            id: true,
            name: true,
          },
        },
        profile_work_orders_paused_byToprofile: {
          select: { fullname: true },
        },
      },
    });

    if (!wo) {
      logger.error('Orden de trabajo no encontrada', { data: { workOrderId } });
      return null;
    }

    // Obtener total_paused_time por separado (tipo Unsupported "interval" en Prisma)
    const pausedTimeMap = await getPausedTimeForOrders([workOrderId]);

    // Obtener los items con sus detalles y repairs
    const items = await prisma.work_order_items.findMany({
      where: { work_order_id: workOrderId },
      select: {
        id: true,
        status: true,
        technician_notes: true,
        completed_at: true,
        maintenance_order_item_id: true,
        work_order_item_repairs: {
          select: {
            id: true,
            repair_type_id: true,
            status: true,
            technician_notes: true,
            completed_at: true,
            completed_by: true,
            types_of_repairs: {
              select: { id: true, name: true },
            },
          },
        },
        maintenance_order_items: {
          select: {
            id: true,
            description: true,
            repair_type_id: true,
            types_of_repairs: {
              select: { id: true, name: true },
            },
            maintenance_order_item_repair_types: {
              select: {
                repair_type_id: true,
                types_of_repairs: {
                  select: { id: true, name: true },
                },
              },
            },
            maintenance_request_items: {
              select: {
                id: true,
                description: true,
                driver_comment: true,
                validator_comment: true,
                checklist_deviations: {
                  select: {
                    id: true,
                    item_code: true,
                    item_label: true,
                    section_code: true,
                    driver_comment: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Transformar items
    const workOrderItems: WorkOrderItemDetail[] = items.map((item) => {
      const moi = item.maintenance_order_items;
      const mri = moi?.maintenance_request_items;
      const deviation = mri?.checklist_deviations;

      // Extraer tipos de reparación de la tabla pivot (prioridad) o del campo legacy
      const pivotRepairTypes = moi?.maintenance_order_item_repair_types || [];
      const repairTypeIds: string[] =
        pivotRepairTypes.length > 0
          ? pivotRepairTypes.map((rt) => rt.repair_type_id).filter(Boolean)
          : moi?.repair_type_id
            ? [moi.repair_type_id]
            : [];
      const repairTypeNames: string[] =
        pivotRepairTypes.length > 0
          ? pivotRepairTypes.map((rt) => rt.types_of_repairs?.name).filter((n): n is string => Boolean(n))
          : moi?.types_of_repairs?.name
            ? [moi.types_of_repairs.name]
            : [];

      // Extraer trabajos individuales de work_order_item_repairs
      const rawRepairs = item.work_order_item_repairs || [];
      const repairs: WorkOrderItemDetail['repairs'] = rawRepairs.map((r) => ({
        id: r.id,
        repairTypeId: r.repair_type_id,
        repairTypeName: r.types_of_repairs?.name || 'Sin nombre',
        status: r.status as WorkOrderItemDetail['status'],
        technicianNotes: r.technician_notes,
        completedAt: r.completed_at?.toISOString() ?? null,
        completedBy: r.completed_by,
      }));

      // Si no hay repairs en la nueva tabla, usar los legacy
      const effectiveRepairs =
        repairs.length > 0
          ? repairs
          : repairTypeIds.map((id, idx) => ({
              id: `legacy-${id}`,
              repairTypeId: id,
              repairTypeName: repairTypeNames[idx] || 'Sin nombre',
              status: item.status as WorkOrderItemDetail['status'],
              technicianNotes: null,
              completedAt: null,
              completedBy: null,
            }));

      return {
        id: item.id,
        status: item.status as WorkOrderItemDetail['status'],
        technicianNotes: item.technician_notes,
        completedAt: item.completed_at?.toISOString() ?? null,
        maintenanceOrderItemId: item.maintenance_order_item_id,
        repairTypeId: moi?.repair_type_id || null,
        repairTypeName: moi?.types_of_repairs?.name || null,
        repairTypeIds,
        repairTypeNames,
        repairs: effectiveRepairs,
        totalRepairs: effectiveRepairs.length,
        completedRepairs: effectiveRepairs.filter((r) => r.status === 'completed').length,
        description: moi?.description || null,
        driverComment: mri?.driver_comment || deviation?.driver_comment || null,
        validatorComment: mri?.validator_comment || null,
        deviationId: deviation?.id || null,
        itemLabel: deviation?.item_label || moi?.types_of_repairs?.name || 'Sin descripción',
        itemCode: deviation?.item_code || null,
        sectionCode: deviation?.section_code || null,
      };
    });

    // Construir el detalle
    const workOrderDetail: WorkOrderDetail = {
      id: wo.id,
      orderNumber: wo.order_number,
      sequenceNumber: wo.sequence_number,
      status: wo.status as WorkOrderDetail['status'],
      priority: wo.priority as WorkOrderDetail['priority'],
      equipmentId: wo.equipment_id,
      vehicleDomain: wo.vehicles?.domain || null,
      vehicleSerie: wo.vehicles?.serie || null,
      vehicleInternNumber: wo.vehicles?.intern_number || null,
      vehicleType: wo.vehicles?.types_of_vehicles?.name || null,
      vehicleKilometer: wo.vehicles?.kilometer || null,
      vehicleEngineHours: wo.vehicles?.engine_hours != null ? Number(wo.vehicles.engine_hours) : null,
      vehicleCondition: wo.vehicles?.condition || null,
      workshopId: wo.workshop_id,
      workshopName: wo.workshops?.name || '',
      workshopType: (wo.workshops?.type || 'interno') as WorkOrderDetail['workshopType'],
      sectorId: wo.sector_id,
      sectorName: wo.workshop_sectors?.name || null,
      plannedStartDate: wo.planned_start_date?.toISOString() ?? null,
      plannedEndDate: wo.planned_end_date?.toISOString() ?? null,
      actualStartDate: wo.actual_start_date?.toISOString() ?? null,
      actualEndDate: wo.actual_end_date?.toISOString() ?? null,
      // totalItems y completedItems cuentan repairs individuales
      totalItems: workOrderItems.reduce((sum, item) => sum + item.totalRepairs, 0),
      completedItems: workOrderItems.reduce((sum, item) => sum + item.completedRepairs, 0),
      notes: wo.notes,
      createdAt: wo.created_at?.toISOString() ?? null,
      createdBy: wo.created_by,
      items: workOrderItems,
      startedAt: wo.started_at?.toISOString() ?? null,
      startedBy: wo.started_by,
      completedAt: wo.completed_at?.toISOString() ?? null,
      completedBy: wo.completed_by,
      cancelledAt: wo.cancelled_at?.toISOString() ?? null,
      cancelledBy: wo.cancelled_by,
      cancellationReason: wo.cancellation_reason,
      pausedAt: wo.paused_at?.toISOString() ?? null,
      pausedBy: wo.profile_work_orders_paused_byToprofile?.fullname || wo.paused_by,
      pauseReason: wo.pause_reason,
      totalPausedTime: pausedTimeMap.get(workOrderId) ?? null,
    };

    return workOrderDetail;
  } catch (error) {
    logger.error('Error obteniendo detalle de OT', { data: { error, workOrderId } });
    return null;
  }
}

// =============================================================================
// ACCIONES
// =============================================================================

/**
 * Inicia una orden de trabajo (pending → in_progress)
 */
export async function startWorkOrder(workOrderId: string) {
  logger.info('Iniciando orden de trabajo', { data: { workOrderId } });

  const profile = await requireServerAuthProfile();

  try {
    // Verificar estado actual
    const wo = await prisma.work_orders.findUnique({
      where: { id: workOrderId },
      select: { status: true },
    });

    if (!wo) {
      throw new Error('Orden de trabajo no encontrada');
    }

    if (wo.status !== 'pending') {
      throw new Error(`No se puede iniciar una orden en estado "${wo.status}"`);
    }

    const now = new Date();

    const data = await prisma.work_orders.update({
      where: { id: workOrderId },
      data: {
        status: 'in_progress',
        actual_start_date: now,
        started_by: profile.id,
        started_at: now,
      },
    });

    logger.info('Orden de trabajo iniciada', { data: { workOrderId } });

    await invalidateCacheTags(INVALIDATION_MAP.startWorkOrder);

    return data;
  } catch (error) {
    logger.error('Error iniciando OT', { data: { error, workOrderId } });
    throw error instanceof Error ? error : new Error('Error al iniciar orden de trabajo');
  }
}

/**
 * Completa un item de la orden de trabajo
 */
export async function completeWorkOrderItem(itemId: string, technicianNotes?: string) {
  logger.info('Completando item de OT', { data: { itemId } });

  const profile = await requireServerAuthProfile();

  try {
    const now = new Date();

    const data = await prisma.work_order_items.update({
      where: { id: itemId },
      data: {
        status: 'completed',
        technician_notes: technicianNotes || null,
        completed_at: now,
        completed_by: profile.id,
      },
    });

    await invalidateCacheTags(INVALIDATION_MAP.completeWorkOrderItemRepair);

    return data;
  } catch (error) {
    logger.error('Error completando item', { data: { error, itemId } });
    throw error instanceof Error ? error : new Error('Error al completar item');
  }
}

/**
 * Completa un trabajo individual (tipo de reparación) de un item de OT
 * @param repairId ID del work_order_item_repair
 * @param technicianNotes Notas opcionales del técnico
 */
export async function completeWorkOrderItemRepair(repairId: string, technicianNotes?: string) {
  logger.info('Completando trabajo de reparación', { data: { repairId } });

  const profile = await requireServerAuthProfile();

  try {
    // Verificar que el repair existe y obtener el work_order_item_id
    const repair = await prisma.work_order_item_repairs.findUnique({
      where: { id: repairId },
      select: { id: true, work_order_item_id: true, status: true },
    });

    if (!repair) {
      throw new Error('Trabajo de reparación no encontrado');
    }

    if (repair.status === 'completed') {
      throw new Error('Este trabajo ya está completado');
    }

    const now = new Date();

    // Actualizar el repair y verificar si todos los del item están completados en una transacción
    const data = await prisma.$transaction(async (tx) => {
      // Actualizar el repair
      const updatedRepair = await tx.work_order_item_repairs.update({
        where: { id: repairId },
        data: {
          status: 'completed',
          technician_notes: technicianNotes || null,
          completed_at: now,
          completed_by: profile.id,
        },
      });

      // Verificar si todos los repairs del item están completados
      const allRepairs = await tx.work_order_item_repairs.findMany({
        where: { work_order_item_id: repair.work_order_item_id },
        select: { status: true },
      });

      const allCompleted = allRepairs.every((r) => r.status === 'completed');

      // Si todos los repairs están completados, marcar el work_order_item como completado
      if (allCompleted) {
        await tx.work_order_items.update({
          where: { id: repair.work_order_item_id },
          data: {
            status: 'completed',
            completed_at: now,
            completed_by: profile.id,
          },
        });

        logger.info('Todos los trabajos del item completados, item marcado como completado', {
          data: { workOrderItemId: repair.work_order_item_id },
        });
      }

      return updatedRepair;
    });

    logger.info('Trabajo de reparación completado', { data: { repairId } });

    await invalidateCacheTags(INVALIDATION_MAP.completeWorkOrderItemRepair);

    return data;
  } catch (error) {
    logger.error('Error completando trabajo', { data: { error, repairId } });
    throw error instanceof Error ? error : new Error('Error al completar trabajo de reparación');
  }
}

/**
 * Actualiza las notas del técnico en un item
 */
export async function updateItemNotes(itemId: string, technicianNotes: string) {
  try {
    const data = await prisma.work_order_items.update({
      where: { id: itemId },
      data: { technician_notes: technicianNotes },
    });

    await invalidateCacheTags(INVALIDATION_MAP.completeWorkOrderItemRepair);

    return data;
  } catch (error) {
    logger.error('Error actualizando notas', { data: { error, itemId } });
    throw error instanceof Error ? error : new Error('Error al actualizar notas');
  }
}

/**
 * Completa una orden de trabajo (in_progress → completed)
 * Todos los trabajos (repairs) deben estar completados
 */
export async function completeWorkOrder(workOrderId: string) {
  logger.info('Completando orden de trabajo', { data: { workOrderId } });

  const profile = await requireServerAuthProfile();

  try {
    // Obtener items y sus repairs
    const items = await prisma.work_order_items.findMany({
      where: { work_order_id: workOrderId },
      select: {
        id: true,
        status: true,
        work_order_item_repairs: {
          select: { id: true, status: true },
        },
      },
    });

    // Verificar repairs pendientes
    const allRepairs = items.flatMap((item) => item.work_order_item_repairs || []);
    const pendingRepairs = allRepairs.filter((r) => r.status !== 'completed' && r.status !== 'cancelled');

    if (pendingRepairs.length > 0) {
      throw new Error(`Hay ${pendingRepairs.length} trabajo(s) de reparación sin completar`);
    }

    // Si no hay repairs (OT legacy), verificar items
    if (allRepairs.length === 0) {
      const pendingItems = items.filter((i) => i.status !== 'completed' && i.status !== 'cancelled');
      if (pendingItems.length > 0) {
        throw new Error(`Hay ${pendingItems.length} item(s) sin completar`);
      }
    }

    const now = new Date();

    const data = await prisma.work_orders.update({
      where: { id: workOrderId },
      data: {
        status: 'completed',
        actual_end_date: now,
        completed_by: profile.id,
        completed_at: now,
      },
    });

    logger.info('Orden de trabajo completada', { data: { workOrderId } });

    await invalidateCacheTags(INVALIDATION_MAP.completeWorkOrder);

    return data;
  } catch (error) {
    logger.error('Error completando OT', { data: { error, workOrderId } });
    throw error instanceof Error ? error : new Error('Error al completar orden de trabajo');
  }
}

/**
 * Cancela una orden de trabajo
 */
export async function cancelWorkOrder(workOrderId: string, reason: string) {
  logger.info('Cancelando orden de trabajo', { data: { workOrderId, reason } });

  const profile = await requireServerAuthProfile();

  if (!reason || reason.trim().length < 5) {
    throw new Error('Debe proporcionar una razón de cancelación (mínimo 5 caracteres)');
  }

  try {
    const now = new Date();

    const wo = await prisma.$transaction(async (tx) => {
      // Actualizar estado de la OT
      const updatedWo = await tx.work_orders.update({
        where: { id: workOrderId },
        data: {
          status: 'cancelled',
          cancelled_by: profile.id,
          cancelled_at: now,
          cancellation_reason: reason.trim(),
        },
      });

      // Cancelar todos los items pendientes
      await tx.work_order_items.updateMany({
        where: {
          work_order_id: workOrderId,
          status: { not: 'completed' },
        },
        data: { status: 'cancelled' },
      });

      // Limpiar referencia en maintenance_order_items para que puedan ser reasignados
      await tx.maintenance_order_items.updateMany({
        where: { work_order_id: workOrderId },
        data: { work_order_id: null },
      });

      return updatedWo;
    });

    logger.info('Orden de trabajo cancelada', { data: { workOrderId } });

    await invalidateCacheTags(INVALIDATION_MAP.cancelWorkOrder);

    return wo;
  } catch (error) {
    logger.error('Error cancelando OT', { data: { error, workOrderId } });
    throw error instanceof Error ? error : new Error('Error al cancelar orden de trabajo');
  }
}

/**
 * Actualiza las notas generales de la orden de trabajo
 */
export async function updateWorkOrderNotes(workOrderId: string, notes: string) {
  try {
    const data = await prisma.work_orders.update({
      where: { id: workOrderId },
      data: { notes },
    });

    await invalidateCacheTags(INVALIDATION_MAP.startWorkOrder);

    return data;
  } catch (error) {
    logger.error('Error actualizando notas de OT', { data: { error, workOrderId } });
    throw error instanceof Error ? error : new Error('Error al actualizar notas');
  }
}

/**
 * Pausa una orden de trabajo en progreso (in_progress → paused)
 * Guarda el timestamp de pausa para calcular el tiempo pausado
 */
export async function pauseWorkOrder(workOrderId: string, reason: string) {
  logger.info('Pausando orden de trabajo', { data: { workOrderId, reason } });

  const profile = await requireServerAuthProfile();

  try {
    // Verificar estado actual
    const wo = await prisma.work_orders.findUnique({
      where: { id: workOrderId },
      select: { status: true },
    });

    if (!wo) {
      throw new Error('Orden de trabajo no encontrada');
    }

    if (wo.status !== 'in_progress') {
      throw new Error(
        `No se puede pausar una orden en estado "${wo.status}". Solo se pueden pausar órdenes "En Proceso".`
      );
    }

    const now = new Date();

    const data = await prisma.work_orders.update({
      where: { id: workOrderId },
      data: {
        status: 'paused',
        paused_at: now,
        paused_by: profile.id,
        pause_reason: reason.trim() || null,
      },
    });

    logger.info('Orden de trabajo pausada', { data: { workOrderId } });

    await invalidateCacheTags(INVALIDATION_MAP.startWorkOrder);

    return data;
  } catch (error) {
    logger.error('Error pausando OT', { data: { error, workOrderId } });
    throw error instanceof Error ? error : new Error('Error al pausar orden de trabajo');
  }
}

/**
 * Reanuda una orden de trabajo pausada (paused → in_progress)
 * Calcula y acumula el tiempo pausado usando $executeRaw para manejar el tipo interval de PostgreSQL
 */
export async function resumeWorkOrder(workOrderId: string) {
  logger.info('Reanudando orden de trabajo', { data: { workOrderId } });

  await requireServerAuthProfile();

  try {
    // Obtener datos actuales de la OT
    const wo = await prisma.work_orders.findUnique({
      where: { id: workOrderId },
      select: { status: true, paused_at: true },
    });

    if (!wo) {
      throw new Error('Orden de trabajo no encontrada');
    }

    if (wo.status !== 'paused') {
      throw new Error(
        `No se puede reanudar una orden en estado "${wo.status}". Solo se pueden reanudar órdenes "Pausadas".`
      );
    }

    // Calcular segundos pausados en esta sesión
    const pausedAt = wo.paused_at ? new Date(wo.paused_at) : new Date();
    const now = new Date();
    const pausedSeconds = Math.floor((now.getTime() - pausedAt.getTime()) / 1000);

    // Usar $executeRaw para sumar el intervalo en PostgreSQL.
    // Prisma no soporta el tipo interval nativamente, por eso se requiere SQL raw.
    await prisma.$executeRaw`
      UPDATE work_orders SET
        status = 'in_progress',
        paused_at = NULL,
        paused_by = NULL,
        pause_reason = NULL,
        total_paused_time = COALESCE(total_paused_time, INTERVAL '0') + (${pausedSeconds} * INTERVAL '1 second')
      WHERE id = ${workOrderId}::uuid
    `;

    logger.info('Orden de trabajo reanudada', { data: { workOrderId, pausedSeconds } });

    await invalidateCacheTags(INVALIDATION_MAP.startWorkOrder);

    return { success: true, pausedSeconds };
  } catch (error) {
    logger.error('Error reanudando OT', { data: { error, workOrderId } });
    throw error instanceof Error ? error : new Error('Error al reanudar orden de trabajo');
  }
}

/**
 * Completa múltiples trabajos de reparación de una vez
 * @param repairIds IDs de los work_order_item_repairs a completar
 */
export async function completeMultipleRepairs(repairIds: string[]) {
  logger.info('Completando múltiples trabajos de reparación', { data: { count: repairIds.length } });

  const profile = await requireServerAuthProfile();

  if (repairIds.length === 0) {
    throw new Error('Debe seleccionar al menos un trabajo para completar');
  }

  try {
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      // Actualizar todos los repairs seleccionados que estén pendientes
      await tx.work_order_item_repairs.updateMany({
        where: {
          id: { in: repairIds },
          status: 'pending',
        },
        data: {
          status: 'completed',
          completed_at: now,
          completed_by: profile.id,
        },
      });

      // Obtener los work_order_item_ids afectados
      const affectedRepairs = await tx.work_order_item_repairs.findMany({
        where: { id: { in: repairIds } },
        select: { work_order_item_id: true },
      });

      const workOrderItemIds = [...new Set(affectedRepairs.map((r) => r.work_order_item_id))];

      // Verificar cada item si todos sus repairs están completados
      for (const itemId of workOrderItemIds) {
        const allRepairs = await tx.work_order_item_repairs.findMany({
          where: { work_order_item_id: itemId },
          select: { status: true },
        });

        const allCompleted = allRepairs.every((r) => r.status === 'completed');

        if (allCompleted) {
          await tx.work_order_items.update({
            where: { id: itemId },
            data: {
              status: 'completed',
              completed_at: now,
              completed_by: profile.id,
            },
          });
        }
      }
    });

    logger.info('Múltiples trabajos completados', { data: { count: repairIds.length } });

    await invalidateCacheTags(INVALIDATION_MAP.completeMultipleRepairs);

    return { completed: repairIds.length };
  } catch (error) {
    logger.error('Error completando trabajos', { data: { error, count: repairIds.length } });
    throw error instanceof Error ? error : new Error('Error al completar trabajos de reparación');
  }
}

/**
 * Completa parcialmente una orden de trabajo (in_progress → completed_partial)
 * Al menos un trabajo debe estar completado, pero quedan pendientes
 */
export async function completeWorkOrderPartial(workOrderId: string, reason?: string) {
  logger.info('Completando parcialmente orden de trabajo', { data: { workOrderId } });

  const profile = await requireServerAuthProfile();

  try {
    // Obtener items y sus repairs
    const items = await prisma.work_order_items.findMany({
      where: { work_order_id: workOrderId },
      select: {
        id: true,
        status: true,
        work_order_item_repairs: {
          select: { id: true, status: true },
        },
      },
    });

    // Contar repairs completados y pendientes
    const allRepairs = items.flatMap((item) => item.work_order_item_repairs || []);
    const completedRepairs = allRepairs.filter((r) => r.status === 'completed');
    const pendingRepairs = allRepairs.filter((r) => r.status !== 'completed' && r.status !== 'cancelled');

    if (completedRepairs.length === 0) {
      throw new Error('Debe completar al menos un trabajo antes de finalizar parcialmente');
    }

    if (pendingRepairs.length === 0) {
      throw new Error('No hay trabajos pendientes. Use "Completar Orden" en su lugar.');
    }

    const now = new Date();

    const data = await prisma.work_orders.update({
      where: { id: workOrderId },
      data: {
        status: 'completed_partial',
        actual_end_date: now,
        completed_by: profile.id,
        completed_at: now,
        notes: reason ? `[Finalizado con pendientes] ${reason}` : '[Finalizado con pendientes]',
      },
    });

    logger.info('Orden de trabajo completada parcialmente', {
      data: { workOrderId, completedRepairs: completedRepairs.length, pendingRepairs: pendingRepairs.length },
    });

    await invalidateCacheTags(INVALIDATION_MAP.completeWorkOrder);

    return data;
  } catch (error) {
    logger.error('Error completando parcialmente OT', { data: { error, workOrderId } });
    throw error instanceof Error ? error : new Error('Error al completar parcialmente la orden de trabajo');
  }
}

// =============================================================================
// TIPOS DE RETORNO
// =============================================================================

export type GetWorkOrdersResult = Awaited<ReturnType<typeof getWorkOrders>>;
export type GetWorkOrderDetailResult = Awaited<ReturnType<typeof getWorkOrderDetail>>;
