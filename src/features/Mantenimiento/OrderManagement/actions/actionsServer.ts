'use server';

import { ACTIVITY_LOG } from '@/features/Mantenimiento/shared/activity-log/action-types';
import { logActivity } from '@/features/Mantenimiento/shared/activity-log/log-activity';
import { Logger } from '@/lib/logger';
import { requireServerAuthProfile } from '@/shared/actions/auth.actions';
import { INVALIDATION_MAP } from '@/shared/constants/cache-invalidation-map';
import { prisma } from '@/shared/lib/prisma';
import { invalidateCacheTags } from '@/shared/utils/cache-invalidation';
import { DIAGNOSTICO_REPAIR_TYPE_ID } from '../../utils/constants';
import { getSupervisorFilterInfo } from '../../utils/supervisorFilter';

const logger = new Logger('OrderManagement/actions');

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Obtiene los pedidos de mantenimiento en taller (in_workshop)
 * para la vista de Gestion de Ordenes del Jefe de Taller.
 * Incluye items con tipos de reparacion y datos del equipo.
 */
export async function getMaintenanceOrdersForManagement() {
  const filterInfo = await getSupervisorFilterInfo();

  try {
    const whereClause: {
      status: string;
      maintenance_requests?: { supervisor_id: string };
    } = { status: 'in_workshop' };

    if (filterInfo?.shouldFilterBySupervisor) {
      whereClause.maintenance_requests = { supervisor_id: filterInfo.userId };
    }

    const orders = await prisma.maintenance_orders.findMany({
      where: whereClause,
      orderBy: { created_at: 'desc' },
      include: {
        vehicles: {
          select: {
            id: true,
            domain: true,
            serie: true,
            intern_number: true,
            condition: true,
            kilometer: true,
            type_vehicles_typeTotype: { select: { id: true, name: true } },
          },
        },
        maintenance_requests: {
          select: {
            id: true,
            kilometer: true,
            created_at: true,
            supervisor_id: true,
            source: true,
            profile_maintenance_requests_supervisor_idToprofile: {
              select: { id: true, fullname: true },
            },
          },
        },
        maintenance_order_items: {
          include: {
            profile_maintenance_order_items_rejected_byToprofile: {
              select: { id: true, fullname: true },
            },
            profile_maintenance_order_items_workshop_chief_comment_byToprofile: {
              select: { id: true, fullname: true },
            },
            maintenance_request_items: {
              include: {
                profile_maintenance_request_items_driver_comment_byToprofile: {
                  select: { id: true, fullname: true },
                },
                profile_maintenance_request_items_validator_comment_byToprofile: {
                  select: { id: true, fullname: true },
                },
                profile_maintenance_request_items_supervisor_comment_byToprofile: {
                  select: { id: true, fullname: true },
                },
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
            types_of_repairs: { select: { id: true, name: true, autorizable: true } },
            maintenance_order_item_repair_types: {
              include: {
                types_of_repairs: { select: { id: true, name: true, autorizable: true } },
              },
            },
            workshop_sectors: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Mapear para compatibilidad con componentes existentes
    return orders.map((order) => ({
      ...order,
      vehicles: order.vehicles
        ? {
            ...order.vehicles,
            vehicle_type: order.vehicles.type_vehicles_typeTotype,
          }
        : null,
      maintenance_requests: order.maintenance_requests
        ? {
            ...order.maintenance_requests,
            supervisor_name:
              order.maintenance_requests.profile_maintenance_requests_supervisor_idToprofile?.fullname || null,
          }
        : null,
      maintenance_order_items: order.maintenance_order_items.map((item) => ({
        ...item,
        rejected_by_profile: item.profile_maintenance_order_items_rejected_byToprofile,
        workshop_chief_comment_profile: item.profile_maintenance_order_items_workshop_chief_comment_byToprofile,
        maintenance_request_items: item.maintenance_request_items
          ? {
              id: item.maintenance_request_items.id,
              maintenance_request_id: item.maintenance_request_items.maintenance_request_id,
              checklist_deviation_id: item.maintenance_request_items.checklist_deviation_id,
              repair_type_id: item.maintenance_request_items.repair_type_id,
              status: item.maintenance_request_items.status,
              rejection_reason: item.maintenance_request_items.rejection_reason,
              created_at: item.maintenance_request_items.created_at,
              description: item.maintenance_request_items.description,
              driver_comment: item.maintenance_request_items.driver_comment,
              validator_comment: item.maintenance_request_items.validator_comment,
              driver_comment_by: item.maintenance_request_items.driver_comment_by,
              validator_comment_by: item.maintenance_request_items.validator_comment_by,
              supervisor_comment: item.maintenance_request_items.supervisor_comment,
              supervisor_comment_by: item.maintenance_request_items.supervisor_comment_by,
              checklist_deviations: item.maintenance_request_items.checklist_deviations,
              driver_comment_profile:
                item.maintenance_request_items.profile_maintenance_request_items_driver_comment_byToprofile,
              validator_comment_profile:
                item.maintenance_request_items.profile_maintenance_request_items_validator_comment_byToprofile,
              supervisor_comment_profile:
                item.maintenance_request_items.profile_maintenance_request_items_supervisor_comment_byToprofile,
            }
          : null,
      })),
    }));
  } catch (error) {
    logger.error('Error al obtener pedidos para gestion', { data: { error } });
    throw error;
  }
}

export type OrderManagementData = Awaited<ReturnType<typeof getMaintenanceOrdersForManagement>>;
export type OrderManagementItem = OrderManagementData[number];

/**
 * Obtiene un pedido específico con el detalle necesario para la gestión.
 * Usado desde Órdenes de Mantenimiento al hacer click en "Gestionar".
 */
export async function getOrderForManagement(orderId: string) {
  try {
    const order = await prisma.maintenance_orders.findUnique({
      where: { id: orderId },
      include: {
        vehicles: {
          select: {
            id: true,
            domain: true,
            serie: true,
            intern_number: true,
            condition: true,
            kilometer: true,
            type_vehicles_typeTotype: { select: { id: true, name: true } },
          },
        },
        maintenance_requests: {
          select: {
            id: true,
            kilometer: true,
            created_at: true,
            supervisor_id: true,
            source: true,
            profile_maintenance_requests_supervisor_idToprofile: {
              select: { id: true, fullname: true },
            },
          },
        },
        maintenance_order_items: {
          include: {
            profile_maintenance_order_items_rejected_byToprofile: {
              select: { id: true, fullname: true },
            },
            profile_maintenance_order_items_workshop_chief_comment_byToprofile: {
              select: { id: true, fullname: true },
            },
            maintenance_request_items: {
              include: {
                profile_maintenance_request_items_driver_comment_byToprofile: {
                  select: { id: true, fullname: true },
                },
                profile_maintenance_request_items_validator_comment_byToprofile: {
                  select: { id: true, fullname: true },
                },
                profile_maintenance_request_items_supervisor_comment_byToprofile: {
                  select: { id: true, fullname: true },
                },
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
            types_of_repairs: { select: { id: true, name: true, autorizable: true } },
            maintenance_order_item_repair_types: {
              include: {
                types_of_repairs: { select: { id: true, name: true, autorizable: true } },
              },
            },
            workshop_sectors: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!order) {
      throw new Error('Orden no encontrada');
    }

    // Mapear para compatibilidad con componentes existentes
    return {
      ...order,
      vehicles: order.vehicles
        ? {
            ...order.vehicles,
            vehicle_type: order.vehicles.type_vehicles_typeTotype,
          }
        : null,
      maintenance_requests: order.maintenance_requests
        ? {
            ...order.maintenance_requests,
            supervisor_name:
              order.maintenance_requests.profile_maintenance_requests_supervisor_idToprofile?.fullname || null,
          }
        : null,
      maintenance_order_items: order.maintenance_order_items.map((item) => ({
        ...item,
        rejected_by_profile: item.profile_maintenance_order_items_rejected_byToprofile,
        workshop_chief_comment_profile: item.profile_maintenance_order_items_workshop_chief_comment_byToprofile,
        maintenance_request_items: item.maintenance_request_items
          ? {
              id: item.maintenance_request_items.id,
              maintenance_request_id: item.maintenance_request_items.maintenance_request_id,
              checklist_deviation_id: item.maintenance_request_items.checklist_deviation_id,
              repair_type_id: item.maintenance_request_items.repair_type_id,
              status: item.maintenance_request_items.status,
              rejection_reason: item.maintenance_request_items.rejection_reason,
              created_at: item.maintenance_request_items.created_at,
              description: item.maintenance_request_items.description,
              driver_comment: item.maintenance_request_items.driver_comment,
              validator_comment: item.maintenance_request_items.validator_comment,
              driver_comment_by: item.maintenance_request_items.driver_comment_by,
              validator_comment_by: item.maintenance_request_items.validator_comment_by,
              supervisor_comment: item.maintenance_request_items.supervisor_comment,
              supervisor_comment_by: item.maintenance_request_items.supervisor_comment_by,
              checklist_deviations: item.maintenance_request_items.checklist_deviations,
              driver_comment_profile:
                item.maintenance_request_items.profile_maintenance_request_items_driver_comment_byToprofile,
              validator_comment_profile:
                item.maintenance_request_items.profile_maintenance_request_items_validator_comment_byToprofile,
              supervisor_comment_profile:
                item.maintenance_request_items.profile_maintenance_request_items_supervisor_comment_byToprofile,
            }
          : null,
      })),
    };
  } catch (error) {
    logger.error('Error al obtener pedido para gestion', { data: { error, orderId } });
    throw error;
  }
}

/**
 * Obtiene todos los sectores activos de todos los talleres
 */
export async function getActiveWorkshopSectors() {
  try {
    const sectors = await prisma.workshop_sectors.findMany({
      where: { is_active: true },
      select: { id: true, name: true, workshop_id: true, max_capacity: true },
      orderBy: { name: 'asc' },
    });

    return sectors;
  } catch (error) {
    logger.error('Error al obtener sectores', { data: { error } });
    throw error;
  }
}

export type WorkshopSector = Awaited<ReturnType<typeof getActiveWorkshopSectors>>[number];

/**
 * Obtiene talleres externos activos
 */
export async function getActiveExternalWorkshops() {
  try {
    const workshops = await prisma.workshops.findMany({
      where: { type: 'externo', is_active: true },
      select: { id: true, name: true, provider_name: true },
      orderBy: { name: 'asc' },
    });

    return workshops;
  } catch (error) {
    logger.error('Error al obtener talleres externos', { data: { error } });
    throw error;
  }
}

export type ExternalWorkshop = Awaited<ReturnType<typeof getActiveExternalWorkshops>>[number];

// =============================================================================
// MUTATIONS
// =============================================================================

export interface AssignSectorInput {
  maintenanceOrderItemIds: string[];
  sectorId: string;
  sequenceOrder: number;
}

/**
 * Asigna items a un sector con un orden de secuencia.
 * Ademas, crea automaticamente un item DIAGNOSTICO para cada sector asignado.
 */
export async function assignItemsToSectors(maintenanceOrderId: string, assignments: AssignSectorInput[]) {
  const profile = await requireServerAuthProfile();

  logger.info('Asignando items a sectores', {
    data: { maintenanceOrderId, assignmentCount: assignments.length },
  });

  try {
    await prisma.$transaction(async (tx) => {
      for (const assignment of assignments) {
        // Actualizar items existentes con sector y secuencia
        await tx.maintenance_order_items.updateMany({
          where: { id: { in: assignment.maintenanceOrderItemIds } },
          data: {
            assigned_sector_id: assignment.sectorId,
            sector_sequence_order: assignment.sequenceOrder,
            assigned_by: profile.id,
            assigned_at: new Date(),
          },
        });

        // Verificar si ya existe un item DIAGNOSTICO para este sector + orden
        const existingDiag = await tx.maintenance_order_items.findFirst({
          where: {
            maintenance_order_id: maintenanceOrderId,
            assigned_sector_id: assignment.sectorId,
            is_diagnostico: true,
          },
          select: { id: true },
        });

        // Crear item DIAGNOSTICO si no existe
        if (!existingDiag) {
          await tx.maintenance_order_items.create({
            data: {
              maintenance_order_id: maintenanceOrderId,
              assigned_sector_id: assignment.sectorId,
              sector_sequence_order: assignment.sequenceOrder,
              is_diagnostico: true,
              description: 'DIAGNOSTICO',
              assigned_by: profile.id,
              assigned_at: new Date(),
            },
          });
        }
      }

      await logActivity(tx, {
        maintenanceOrderId,
        actionType: ACTIVITY_LOG.ORDER_ITEMS_ASSIGNED,
        performedBy: profile.id,
        metadata: {
          assignments: assignments.map((a) => ({
            itemIds: a.maintenanceOrderItemIds,
            sectorId: a.sectorId,
            sequenceOrder: a.sequenceOrder,
          })),
        },
      });
    });

    logger.info('Items asignados a sectores exitosamente', {
      data: { maintenanceOrderId },
    });

    await invalidateCacheTags(INVALIDATION_MAP.assignItemsToSectors);
  } catch (error) {
    logger.error('Error asignando sector a items', { data: { error } });
    throw error;
  }
}

/**
 * Agrega un nuevo item manualmente a un pedido de mantenimiento.
 * Soporta multiples tipos de reparacion via tabla pivot.
 */
export async function addItemToOrder(
  maintenanceOrderId: string,
  data: {
    description: string;
    repairTypeIds?: string[];
  }
) {
  const profile = await requireServerAuthProfile();

  try {
    const newItem = await prisma.$transaction(async (tx) => {
      const item = await tx.maintenance_order_items.create({
        data: {
          maintenance_order_id: maintenanceOrderId,
          description: data.description,
          repair_type_id: data.repairTypeIds?.[0] ?? null,
        },
      });

      // Insertar en tabla pivot si hay tipos de reparacion
      if (data.repairTypeIds && data.repairTypeIds.length > 0) {
        await tx.maintenance_order_item_repair_types.createMany({
          data: data.repairTypeIds.map((repairTypeId) => ({
            maintenance_order_item_id: item.id,
            repair_type_id: repairTypeId,
          })),
          skipDuplicates: true,
        });
      }

      await logActivity(tx, {
        maintenanceOrderId,
        actionType: ACTIVITY_LOG.ORDER_ITEM_ADDED,
        performedBy: profile.id,
        metadata: {
          itemId: item.id,
          description: data.description,
          repairTypeIds: data.repairTypeIds ?? [],
        },
      });

      return item;
    });

    logger.info('Item agregado exitosamente', { data: { itemId: newItem.id } });
    await invalidateCacheTags(INVALIDATION_MAP.addItemToOrder);
    return newItem;
  } catch (error) {
    logger.error('Error agregando item', { data: { error } });
    throw new Error(`Error al agregar item: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Actualiza los tipos de reparacion asignados a un item.
 * Actualiza tanto el campo legacy como la tabla pivot.
 */
export async function updateItemRepairTypes(maintenanceOrderItemId: string, repairTypeIds: string[]) {
  const profile = await requireServerAuthProfile();

  try {
    const item = await prisma.maintenance_order_items.findUnique({
      where: { id: maintenanceOrderItemId },
      select: { maintenance_order_id: true },
    });
    if (!item?.maintenance_order_id) {
      throw new Error('Item no encontrado o sin orden asociada');
    }

    await prisma.$transaction(async (tx) => {
      // Actualizar campo legacy con el primer tipo
      await tx.maintenance_order_items.update({
        where: { id: maintenanceOrderItemId },
        data: { repair_type_id: repairTypeIds[0] ?? null },
      });

      // Eliminar registros anteriores de la tabla pivot
      await tx.maintenance_order_item_repair_types.deleteMany({
        where: { maintenance_order_item_id: maintenanceOrderItemId },
      });

      // Insertar nuevos registros en la tabla pivot
      if (repairTypeIds.length > 0) {
        await tx.maintenance_order_item_repair_types.createMany({
          data: repairTypeIds.map((repairTypeId) => ({
            maintenance_order_item_id: maintenanceOrderItemId,
            repair_type_id: repairTypeId,
          })),
          skipDuplicates: true,
        });
      }

      await logActivity(tx, {
        maintenanceOrderId: item.maintenance_order_id,
        actionType: ACTIVITY_LOG.ORDER_ITEM_REPAIR_TYPES_UPDATED,
        performedBy: profile.id,
        metadata: { itemId: maintenanceOrderItemId, repairTypeIds },
      });
    });

    logger.info('Tipos de reparacion actualizados', {
      data: { maintenanceOrderItemId, repairTypeCount: repairTypeIds.length },
    });

    await invalidateCacheTags(INVALIDATION_MAP.saveOrderChanges);
  } catch (error) {
    logger.error('Error actualizando repair_type_id', { data: { error } });
    throw new Error(
      `Error al actualizar tipo de reparacion: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Elimina un item que fue agregado manualmente (no tiene maintenance_request_item_id)
 */
export async function removeManualItem(itemId: string) {
  const profile = await requireServerAuthProfile();

  try {
    // Verificar que el item no tiene origen de solicitud
    const item = await prisma.maintenance_order_items.findUnique({
      where: { id: itemId },
      select: { id: true, maintenance_order_id: true, maintenance_request_item_id: true, is_diagnostico: true },
    });

    if (!item) {
      throw new Error('Item no encontrado');
    }

    if (item.maintenance_request_item_id && !item.is_diagnostico) {
      throw new Error('No se puede eliminar un item que proviene de una solicitud');
    }

    // Las relaciones tienen ON DELETE CASCADE, por lo que el delete borra el pivot automáticamente
    await prisma.$transaction(async (tx) => {
      await tx.maintenance_order_items.delete({ where: { id: itemId } });
      if (item.maintenance_order_id) {
        await logActivity(tx, {
          maintenanceOrderId: item.maintenance_order_id,
          actionType: ACTIVITY_LOG.ORDER_ITEM_REMOVED,
          performedBy: profile.id,
          metadata: { itemId },
        });
      }
    });

    logger.info('Item eliminado exitosamente', { data: { itemId } });

    await invalidateCacheTags(INVALIDATION_MAP.saveOrderChanges);
  } catch (error) {
    logger.error('Error eliminando item', { data: { error } });
    throw new Error(`Error al eliminar item: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export type AddItemResult = Awaited<ReturnType<typeof addItemToOrder>>;

// =============================================================================
// ORDER NUMBER GENERATION
// =============================================================================

/**
 * Generates and assigns an order number to a maintenance order.
 * Format: OM-{SEQUENCE} (e.g. OM-000001)
 * Called when the OM enters the workshop (status = 'in_workshop').
 */
export async function generateMaintenanceOrderNumber(orderId: string) {
  const profile = await requireServerAuthProfile();

  try {
    // Check if already has a number
    const existing = await prisma.maintenance_orders.findUnique({
      where: { id: orderId },
      select: { order_number: true },
    });

    if (!existing) throw new Error('Orden no encontrada');
    if (existing.order_number) return existing.order_number;

    // Get next sequence number (global) — count de órdenes que ya tienen número
    const count = await prisma.maintenance_orders.count({
      where: { order_number: { not: null } },
    });

    const nextSeq = count + 1;
    const paddedSeq = String(nextSeq).padStart(6, '0');
    const orderNumber = `OM-${paddedSeq}`;

    // Update the order
    await prisma.$transaction(async (tx) => {
      await tx.maintenance_orders.update({
        where: { id: orderId },
        data: { order_number: orderNumber },
      });
      await logActivity(tx, {
        maintenanceOrderId: orderId,
        actionType: ACTIVITY_LOG.ORDER_NUMBER_GENERATED,
        performedBy: profile.id,
        metadata: { orderNumber },
      });
    });

    logger.info('Numero de orden generado', { data: { orderId, orderNumber } });
    await invalidateCacheTags(INVALIDATION_MAP.saveOrderChanges);
    return orderNumber;
  } catch (error) {
    logger.error('Error generando numero de orden', { data: { error } });
    throw error;
  }
}

// =============================================================================
// BATCH SAVE
// =============================================================================

export interface OrderChangeSet {
  /** Items to delete (only manual items, not from request) */
  deletes: string[];
  /** Items to add */
  adds: Array<{ description: string; repairTypeIds: string[] }>;
  /** Sector assignments (item -> sector + sequence) */
  sectorAssignments: Array<{
    itemIds: string[];
    sectorId: string;
    sequenceOrder: number;
  }>;
  /** Repair type updates per item */
  repairTypeUpdates: Array<{
    itemId: string;
    repairTypeIds: string[];
  }>;
  /** Sequence order updates for already-assigned items */
  sequenceUpdates: Array<{
    itemId: string;
    sequenceOrder: number;
  }>;
  /** Description updates per item */
  descriptionUpdates: Array<{
    itemId: string;
    description: string;
  }>;
  /** Workshop chief comment updates per item */
  chiefCommentUpdates: Array<{
    itemId: string;
    comment: string;
  }>;
  /** External workshop assignments (no sector) */
  workshopAssignments: Array<{
    itemIds: string[];
    workshopId: string;
  }>;
  /** Items rejected by workshop chief (won't travel to WO) */
  rejections?: Array<{
    itemId: string;
    reason: string;
  }>;
  /** Items restored from rejected state */
  restorations?: string[];
}

/**
 * Batch save: procesa todos los cambios pendientes en una sola accion.
 * Procesa en orden: deletes -> adds -> sector assignments -> repair type updates -> sequence updates.
 */
export async function saveOrderChanges(orderId: string, changes: OrderChangeSet) {
  const profile = await requireServerAuthProfile();

  logger.info('Guardando cambios batch en orden', {
    data: {
      orderId,
      deletes: changes.deletes.length,
      adds: changes.adds.length,
      sectorAssignments: changes.sectorAssignments.length,
      repairTypeUpdates: changes.repairTypeUpdates.length,
      sequenceUpdates: changes.sequenceUpdates.length,
      descriptionUpdates: changes.descriptionUpdates.length,
      chiefCommentUpdates: changes.chiefCommentUpdates.length,
      workshopAssignments: changes.workshopAssignments.length,
    },
  });

  try {
    await prisma.$transaction(async (tx) => {
      // 1. DELETES - Eliminar items manuales
      for (const itemId of changes.deletes) {
        const item = await tx.maintenance_order_items.findUnique({
          where: { id: itemId },
          select: { id: true, maintenance_request_item_id: true, is_diagnostico: true },
        });

        if (item && (!item.maintenance_request_item_id || item.is_diagnostico)) {
          // ON DELETE CASCADE elimina el pivot automáticamente
          await tx.maintenance_order_items.delete({ where: { id: itemId } });
        }
      }

      // 2. ADDS - Agregar nuevos items
      for (const add of changes.adds) {
        const newItem = await tx.maintenance_order_items.create({
          data: {
            maintenance_order_id: orderId,
            description: add.description,
            repair_type_id: add.repairTypeIds[0] ?? null,
          },
        });

        if (add.repairTypeIds.length > 0) {
          await tx.maintenance_order_item_repair_types.createMany({
            data: add.repairTypeIds.map((repairTypeId) => ({
              maintenance_order_item_id: newItem.id,
              repair_type_id: repairTypeId,
            })),
            skipDuplicates: true,
          });
        }
      }

      // 3. SECTOR ASSIGNMENTS
      // Backend safeguard: normalize sequence orders to avoid duplicates
      const existingSeqData = await tx.maintenance_order_items.findMany({
        where: {
          maintenance_order_id: orderId,
          work_order_id: { not: null },
          assigned_sector_id: { not: null },
          sector_sequence_order: { not: null },
        },
        select: { sector_sequence_order: true },
      });

      const maxExistingSeqBatch = existingSeqData.reduce(
        (max, item) => Math.max(max, item.sector_sequence_order ?? 0),
        0
      );

      // Normalize assignments: sort by their sequence order and re-assign sequential values
      const sortedAssignments = [...changes.sectorAssignments].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
      const normalizedAssignments = sortedAssignments.map((assignment, idx) => ({
        ...assignment,
        sequenceOrder: maxExistingSeqBatch + idx + 1,
      }));

      for (const assignment of normalizedAssignments) {
        await tx.maintenance_order_items.updateMany({
          where: { id: { in: assignment.itemIds } },
          data: {
            assigned_sector_id: assignment.sectorId,
            sector_sequence_order: assignment.sequenceOrder,
            assigned_by: profile.id,
            assigned_at: new Date(),
          },
        });

        // Crear item DIAGNOSTICO si no existe para este sector
        const existingDiag = await tx.maintenance_order_items.findFirst({
          where: {
            maintenance_order_id: orderId,
            assigned_sector_id: assignment.sectorId,
            is_diagnostico: true,
          },
          select: { id: true },
        });

        if (!existingDiag) {
          await tx.maintenance_order_items.create({
            data: {
              maintenance_order_id: orderId,
              assigned_sector_id: assignment.sectorId,
              sector_sequence_order: assignment.sequenceOrder,
              is_diagnostico: true,
              description: 'DIAGNOSTICO',
              assigned_by: profile.id,
              assigned_at: new Date(),
            },
          });
        }
      }

      // 4. REPAIR TYPE UPDATES
      for (const update of changes.repairTypeUpdates) {
        // Actualizar campo legacy
        await tx.maintenance_order_items.update({
          where: { id: update.itemId },
          data: { repair_type_id: update.repairTypeIds[0] ?? null },
        });

        // Reemplazar pivot records
        await tx.maintenance_order_item_repair_types.deleteMany({
          where: { maintenance_order_item_id: update.itemId },
        });

        if (update.repairTypeIds.length > 0) {
          await tx.maintenance_order_item_repair_types.createMany({
            data: update.repairTypeIds.map((repairTypeId) => ({
              maintenance_order_item_id: update.itemId,
              repair_type_id: repairTypeId,
            })),
            skipDuplicates: true,
          });
        }
      }

      // 5. SEQUENCE ORDER UPDATES
      for (const seqUpdate of changes.sequenceUpdates) {
        await tx.maintenance_order_items.update({
          where: { id: seqUpdate.itemId },
          data: { sector_sequence_order: seqUpdate.sequenceOrder },
        });
      }

      // 6. DESCRIPTION UPDATES
      for (const descUpdate of changes.descriptionUpdates) {
        await tx.maintenance_order_items.update({
          where: { id: descUpdate.itemId },
          data: { description: descUpdate.description },
        });
      }

      // 7. CHIEF COMMENT UPDATES
      for (const commentUpdate of changes.chiefCommentUpdates) {
        await tx.maintenance_order_items.update({
          where: { id: commentUpdate.itemId },
          data: {
            workshop_chief_comment: commentUpdate.comment,
            workshop_chief_comment_by: profile.id,
          },
        });
      }

      // 8. EXTERNAL WORKSHOP ASSIGNMENTS (no sector, no diagnostico)
      for (const wsAssignment of changes.workshopAssignments) {
        await tx.maintenance_order_items.updateMany({
          where: { id: { in: wsAssignment.itemIds } },
          data: {
            assigned_workshop_id: wsAssignment.workshopId,
            assigned_sector_id: null,
            sector_sequence_order: null,
            assigned_by: profile.id,
            assigned_at: new Date(),
          },
        });
      }

      // 9. REJECTIONS - Marcar items como rechazados
      if (changes.rejections && changes.rejections.length > 0) {
        for (const rejection of changes.rejections) {
          await tx.maintenance_order_items.update({
            where: { id: rejection.itemId },
            data: {
              is_rejected: true,
              rejection_reason: rejection.reason,
              rejected_by: profile.id,
              rejected_at: new Date(),
            },
          });
        }
      }

      // 10. RESTORATIONS - Restaurar items rechazados
      if (changes.restorations && changes.restorations.length > 0) {
        await tx.maintenance_order_items.updateMany({
          where: { id: { in: changes.restorations } },
          data: {
            is_rejected: false,
            rejection_reason: null,
            rejected_by: null,
            rejected_at: null,
          },
        });
      }

      // After rejections/restorations, check if order needs status transition
      if (
        (changes.rejections && changes.rejections.length > 0) ||
        (changes.restorations && changes.restorations.length > 0) ||
        changes.adds.length > 0
      ) {
        const currentOrder = await tx.maintenance_orders.findUnique({
          where: { id: orderId },
          select: { status: true },
        });

        const allItems = await tx.maintenance_order_items.findMany({
          where: { maintenance_order_id: orderId },
          select: { id: true, is_rejected: true, is_diagnostico: true },
        });

        const regularItems = allItems.filter((item) => !item.is_diagnostico);
        const allRejected = regularItems.length > 0 && regularItems.every((item) => item.is_rejected);
        const hasNonRejected = regularItems.some((item) => !item.is_rejected);

        if (allRejected && currentOrder?.status !== 'workshop_rejected') {
          // All items rejected → mark as workshop_rejected
          await tx.maintenance_orders.update({
            where: { id: orderId },
            data: { status: 'workshop_rejected', updated_at: new Date() },
          });

          await logActivity(tx, {
            maintenanceOrderId: orderId,
            actionType: ACTIVITY_LOG.WORKSHOP_REJECTED_ALL_ITEMS,
            performedBy: profile.id,
            previousStatus: currentOrder?.status ?? 'in_workshop',
            newStatus: 'workshop_rejected',
            notes: `Todos los items rechazados por taller (${regularItems.length} item(s))`,
          });
        } else if (hasNonRejected && currentOrder?.status === 'workshop_rejected') {
          // Some items restored or new items added → back to in_workshop
          await tx.maintenance_orders.update({
            where: { id: orderId },
            data: { status: 'in_workshop', updated_at: new Date() },
          });

          await logActivity(tx, {
            maintenanceOrderId: orderId,
            actionType: ACTIVITY_LOG.WORKSHOP_RESTORED_FROM_REJECTED,
            performedBy: profile.id,
            previousStatus: 'workshop_rejected',
            newStatus: 'in_workshop',
            notes: 'Orden restaurada - items disponibles para gestionar',
          });
        }
      }

      // Grouped audit log: one entry capturing ALL changes from this save session
      const groupedMetadata: Record<string, unknown> = {};
      if (changes.deletes.length > 0) groupedMetadata.deletes = changes.deletes;
      if (changes.adds.length > 0) groupedMetadata.adds = changes.adds;
      if (changes.sectorAssignments.length > 0) groupedMetadata.sectorAssignments = changes.sectorAssignments;
      if (changes.repairTypeUpdates.length > 0) groupedMetadata.repairTypeUpdates = changes.repairTypeUpdates;
      if (changes.sequenceUpdates.length > 0) groupedMetadata.sequenceUpdates = changes.sequenceUpdates;
      if (changes.descriptionUpdates.length > 0) groupedMetadata.descriptionUpdates = changes.descriptionUpdates;
      if (changes.chiefCommentUpdates.length > 0) groupedMetadata.chiefCommentUpdates = changes.chiefCommentUpdates;
      if (changes.workshopAssignments.length > 0) groupedMetadata.workshopAssignments = changes.workshopAssignments;
      if (changes.rejections && changes.rejections.length > 0) groupedMetadata.rejections = changes.rejections;
      if (changes.restorations && changes.restorations.length > 0) groupedMetadata.restorations = changes.restorations;

      if (Object.keys(groupedMetadata).length > 0) {
        await logActivity(tx, {
          maintenanceOrderId: orderId,
          actionType: ACTIVITY_LOG.ORDER_ITEMS_UPDATED,
          performedBy: profile.id,
          metadata: groupedMetadata,
        });
      }
    });

    logger.info('Cambios batch guardados exitosamente', { data: { orderId } });

    await invalidateCacheTags(INVALIDATION_MAP.saveOrderChanges);
  } catch (error) {
    logger.error('Error guardando cambios batch', { data: { error, orderId } });
    throw error;
  }
}

// =============================================================================
// GENERAR ORDENES DE TRABAJO
// =============================================================================

/**
 * Retorna un resumen agrupado por sector de los items listos para generar OT.
 * Solo incluye items regulares (no diagnostico) que tienen sector asignado.
 */
export async function getOrderGenerationPreview(orderId: string) {
  try {
    const order = await prisma.maintenance_orders.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        equipment_id: true,
        vehicles: {
          select: { id: true, domain: true, serie: true, company_id: true },
        },
        maintenance_order_items: {
          select: {
            id: true,
            description: true,
            assigned_sector_id: true,
            assigned_workshop_id: true,
            sector_sequence_order: true,
            is_diagnostico: true,
            is_rejected: true,
            work_order_id: true,
            workshop_sectors: { select: { id: true, name: true } },
            workshops: { select: { id: true, name: true, type: true } },
            maintenance_order_item_repair_types: {
              include: {
                types_of_repairs: { select: { id: true, name: true, autorizable: true } },
              },
            },
            types_of_repairs: { select: { id: true, name: true, autorizable: true } },
          },
        },
      },
    });

    if (!order) {
      logger.error('Error obteniendo preview de generacion', { data: { orderId } });
      throw new Error('Error al obtener datos de la orden');
    }

    // Filtrar items regulares sin OT generada, no rechazados, con sector o taller externo asignado
    const eligibleItems = order.maintenance_order_items.filter(
      (item) =>
        !item.is_diagnostico &&
        !item.is_rejected &&
        (item.assigned_sector_id ?? item.assigned_workshop_id) &&
        !item.work_order_id
    );

    // Agrupar por sector (internos) o por workshop (externos)
    const sectorMap = new Map<
      string,
      {
        sectorId: string;
        sectorName: string;
        isExternal: boolean;
        workshopId: string | null;
        workshopName: string | null;
        items: typeof eligibleItems;
        totalRepairs: number;
      }
    >();

    for (const item of eligibleItems) {
      const isExternal = !item.assigned_sector_id && !!item.assigned_workshop_id;
      const groupKey = isExternal ? `ext-${item.assigned_workshop_id}` : item.assigned_sector_id!;

      let groupName: string;
      let workshopId: string | null = null;
      let workshopName: string | null = null;

      if (isExternal) {
        workshopId = item.assigned_workshop_id;
        workshopName = item.workshops?.name ?? 'Taller Externo';
        groupName = workshopName;
      } else {
        groupName = item.workshop_sectors?.name ?? 'Sin nombre';
      }

      if (!sectorMap.has(groupKey)) {
        sectorMap.set(groupKey, {
          sectorId: isExternal ? '' : item.assigned_sector_id!,
          sectorName: groupName,
          isExternal,
          workshopId,
          workshopName,
          items: [],
          totalRepairs: 0,
        });
      }

      const sector = sectorMap.get(groupKey)!;
      sector.items.push(item);

      // Contar repair types del item
      const pivotTypes = item.maintenance_order_item_repair_types ?? [];
      sector.totalRepairs += pivotTypes.length > 0 ? pivotTypes.length : item.types_of_repairs ? 1 : 0;
    }

    return {
      orderId: order.id,
      equipmentId: order.equipment_id,
      vehicle: order.vehicles,
      sectors: Array.from(sectorMap.values()),
    };
  } catch (error) {
    logger.error('Error obteniendo preview de generacion', { data: { error, orderId } });
    throw error;
  }
}

export type OrderGenerationPreview = Awaited<ReturnType<typeof getOrderGenerationPreview>>;

/**
 * Genera ordenes de trabajo agrupando items por sector.
 * Crea una OT por sector, con sus work_order_items y work_order_item_repairs.
 */
export async function generateWorkOrdersForOrder(
  orderId: string,
  dates: { plannedStartDate: string; plannedEndDate: string }
) {
  const profile = await requireServerAuthProfile();

  logger.info('Generando ordenes de trabajo para orden', { data: { orderId } });

  try {
    // 1. Obtener preview para saber que generar
    const preview = await getOrderGenerationPreview(orderId);

    if (preview.sectors.length === 0) {
      throw new Error('No hay items elegibles para generar ordenes de trabajo');
    }

    const vehicle = preview.vehicle;
    if (!vehicle) {
      throw new Error('No se pudo obtener informacion del vehiculo');
    }

    const companyId = vehicle.company_id;
    const domain = vehicle.domain;
    const serie = vehicle.serie;

    if (!companyId) throw new Error('No se pudo determinar la empresa');

    // 2. Obtener el workshop_id de la primera asignacion que tenga sector asignado
    const workshopItem = await prisma.maintenance_order_items.findFirst({
      where: {
        maintenance_order_id: orderId,
        assigned_sector_id: { not: null },
      },
      select: { assigned_workshop_id: true, assigned_sector_id: true },
    });

    // Si no hay workshop asignado directamente, obtenerlo del sector
    let workshopId: string | null = workshopItem?.assigned_workshop_id ?? null;
    if (!workshopId && preview.sectors.length > 0 && preview.sectors[0].sectorId) {
      const sectorData = await prisma.workshop_sectors.findUnique({
        where: { id: preview.sectors[0].sectorId },
        select: { workshop_id: true },
      });
      workshopId = sectorData?.workshop_id ?? null;
    }

    if (!workshopId) throw new Error('No se pudo determinar el taller');

    const createdOrders: Array<{ orderNumber: string; sectorName: string; itemCount: number }> = [];

    // 3. Por cada sector/taller externo, crear una OT
    for (const sector of preview.sectors) {
      // Obtener siguiente numero de secuencia
      const lastWorkOrder = await prisma.work_orders.findFirst({
        orderBy: { sequence_number: 'desc' },
        select: { sequence_number: true },
      });

      const sequenceNumber = (lastWorkOrder?.sequence_number ?? 0) + 1;

      // Formatear numero de OT: OT-{EQUIPO}-{SECTOR/TALLER}-{SECUENCIA}
      const identifier = domain ?? serie ?? 'EQUIPO';
      const cleanIdentifier = identifier.replace(/[^A-Z0-9]/gi, '').toUpperCase();
      const cleanSector = sector.sectorName
        .replace(/[^A-Z]/gi, '')
        .toUpperCase()
        .slice(0, 12);
      const paddedNumber = String(sequenceNumber).padStart(6, '0');
      const orderNumber = `OT-${cleanIdentifier}-${cleanSector}-${paddedNumber}`;

      // Determinar workshop_id y sector_id para la OT
      const woWorkshopId = sector.isExternal && sector.workshopId ? sector.workshopId : workshopId;
      const woSectorId = sector.isExternal ? null : sector.sectorId;

      // Crear la OT y sus items en una transacción por sector
      const workOrder = await prisma.$transaction(async (tx) => {
        // Crear la OT
        const wo = await tx.work_orders.create({
          data: {
            order_number: orderNumber,
            sequence_number: sequenceNumber,
            company_id: companyId,
            equipment_id: preview.equipmentId,
            workshop_id: woWorkshopId,
            sector_id: woSectorId ?? undefined,
            status: 'pending',
            priority: 'medium',
            planned_start_date: new Date(dates.plannedStartDate),
            planned_end_date: new Date(dates.plannedEndDate),
            created_by: profile.id,
          },
        });

        // Crear work_order_items — usando create individual para obtener IDs
        const itemIds = sector.items.map((i) => i.id);
        const createdWoItems = await Promise.all(
          itemIds.map((itemId) =>
            tx.work_order_items.create({
              data: {
                work_order_id: wo.id,
                maintenance_order_item_id: itemId,
                status: 'pending',
              },
              select: { id: true, maintenance_order_item_id: true },
            })
          )
        );

        // Crear work_order_item_repairs (uno por repair type del item)
        const repairRecords: Array<{
          work_order_item_id: string;
          repair_type_id: string;
          status: 'pending';
        }> = [];

        for (const woItem of createdWoItems) {
          const originalItem = sector.items.find((i) => i.id === woItem.maintenance_order_item_id);
          if (!originalItem) continue;

          const pivotTypes = originalItem.maintenance_order_item_repair_types ?? [];
          if (pivotTypes.length > 0) {
            for (const pt of pivotTypes) {
              repairRecords.push({
                work_order_item_id: woItem.id,
                repair_type_id: pt.repair_type_id,
                status: 'pending',
              });
            }
          } else if (originalItem.types_of_repairs) {
            // Fallback al legacy repair type
            repairRecords.push({
              work_order_item_id: woItem.id,
              repair_type_id: originalItem.types_of_repairs.id,
              status: 'pending',
            });
          }
        }

        if (repairRecords.length > 0) {
          await tx.work_order_item_repairs.createMany({
            data: repairRecords,
            skipDuplicates: true,
          });
        }

        // Actualizar maintenance_order_items con work_order_id
        await tx.maintenance_order_items.updateMany({
          where: { id: { in: itemIds } },
          data: { work_order_id: wo.id },
        });

        // Incluir item DIAGNÓSTICO del sector (si existe)
        if (sector.sectorId) {
          const diagItem = await tx.maintenance_order_items.findFirst({
            where: {
              maintenance_order_id: orderId,
              assigned_sector_id: sector.sectorId,
              is_diagnostico: true,
              work_order_id: null,
            },
            select: { id: true },
          });

          if (diagItem) {
            const diagWoItem = await tx.work_order_items.create({
              data: {
                work_order_id: wo.id,
                maintenance_order_item_id: diagItem.id,
                status: 'pending',
              },
              select: { id: true },
            });

            await tx.work_order_item_repairs.create({
              data: {
                work_order_item_id: diagWoItem.id,
                repair_type_id: DIAGNOSTICO_REPAIR_TYPE_ID,
                status: 'pending',
                is_diagnostico: true,
              },
            });

            // Vincular maintenance_order_item DIAGNÓSTICO con la OT
            await tx.maintenance_order_items.update({
              where: { id: diagItem.id },
              data: { work_order_id: wo.id },
            });

            logger.info('Item DIAGNÓSTICO incluido en OT', {
              data: { workOrderId: wo.id, diagItemId: diagItem.id },
            });
          }
        }

        await logActivity(tx, {
          workOrderId: wo.id,
          maintenanceOrderId: orderId,
          actionType: ACTIVITY_LOG.WORK_ORDER_CREATED,
          performedBy: profile.id,
          newStatus: 'pending',
          metadata: {
            orderNumber: wo.order_number,
            sectorName: sector.sectorName,
            plannedStartDate: dates.plannedStartDate,
            plannedEndDate: dates.plannedEndDate,
            isExternal: sector.isExternal,
          },
        });

        return wo;
      });

      createdOrders.push({
        orderNumber,
        sectorName: sector.sectorName,
        itemCount: sector.items.length,
      });

      logger.info('OT creada para sector', {
        data: {
          orderNumber,
          sector: sector.sectorName,
          items: sector.items.length,
        },
      });
    }

    await prisma.$transaction(async (tx) => {
      await logActivity(tx, {
        maintenanceOrderId: orderId,
        actionType: ACTIVITY_LOG.WORK_ORDERS_GENERATED,
        performedBy: profile.id,
        metadata: {
          workOrders: createdOrders.map((co) => ({
            orderNumber: co.orderNumber,
            sectorName: co.sectorName,
            itemCount: co.itemCount,
          })),
        },
      });
    });

    logger.info('Ordenes de trabajo generadas exitosamente', {
      data: { orderId, count: createdOrders.length },
    });

    await invalidateCacheTags(INVALIDATION_MAP.generateWorkOrdersForOrder);
    return createdOrders;
  } catch (error) {
    logger.error('Error generando ordenes de trabajo', { data: { error, orderId } });
    throw error;
  }
}

// =============================================================================
// WIZARD: SECTOR CANDIDATES
// =============================================================================

/**
 * Obtiene los sectores candidatos para cada repair type usando la tabla sector_repair_types.
 * Retorna un map de repairTypeId → sectorIds[]
 */
export async function getSectorCandidatesForRepairTypes(repairTypeIds: string[]) {
  if (repairTypeIds.length === 0) return [];

  try {
    const data = await prisma.sector_repair_types.findMany({
      where: { repair_type_id: { in: repairTypeIds } },
      select: {
        workshop_sector_id: true,
        repair_type_id: true,
        workshop_sectors: { select: { id: true, name: true } },
      },
    });

    return data;
  } catch (error) {
    logger.error('Error obteniendo candidatos de sector', { data: { error } });
    throw error;
  }
}

export type SectorCandidateData = Awaited<ReturnType<typeof getSectorCandidatesForRepairTypes>>;

// =============================================================================
// WIZARD: BATCH SETUP + GENERATE WORK ORDERS
// =============================================================================

/**
 * Ejecuta todo el flujo del wizard en una sola acción:
 * 1. Aplica cambios de items (adds, deletes, repair type updates, description updates)
 * 2. Asigna items a sectores + crea DIAGNOSTICO por sector
 * 3. Actualiza el sector_sequence_order de todos los items
 * 4. Genera las OTs agrupadas por sector
 */
export async function setupAndGenerateWorkOrders(
  orderId: string,
  itemChanges: OrderChangeSet,
  sectorAssignments: Array<{ itemIds: string[]; sectorId: string }>,
  sectorOrder: Array<{ sectorId: string; sequenceOrder: number }>,
  dates: { plannedStartDate: string; plannedEndDate: string }
) {
  const profile = await requireServerAuthProfile();

  logger.info('Wizard: iniciando setup y generacion de OTs', {
    data: {
      orderId,
      itemChanges: {
        adds: itemChanges.adds.length,
        deletes: itemChanges.deletes.length,
        repairTypeUpdates: itemChanges.repairTypeUpdates.length,
        descriptionUpdates: itemChanges.descriptionUpdates.length,
      },
      sectorAssignments: sectorAssignments.length,
      sectorOrder: sectorOrder.length,
    },
  });

  try {
    await prisma.$transaction(async (tx) => {
      // ──────────────────────────────────────────────
      // 1. APLICAR CAMBIOS DE ITEMS
      // ──────────────────────────────────────────────

      // 1a. DELETES
      for (const itemId of itemChanges.deletes) {
        const item = await tx.maintenance_order_items.findUnique({
          where: { id: itemId },
          select: { id: true, maintenance_request_item_id: true, is_diagnostico: true },
        });

        if (item && (!item.maintenance_request_item_id || item.is_diagnostico)) {
          await tx.maintenance_order_items.delete({ where: { id: itemId } });
        }
      }

      // 1b. ADDS - Guardar nuevos items y retornar IDs reales
      const tempToRealIdMap = new Map<number, string>(); // index → real id
      for (let i = 0; i < itemChanges.adds.length; i++) {
        const add = itemChanges.adds[i];
        const newItem = await tx.maintenance_order_items.create({
          data: {
            maintenance_order_id: orderId,
            description: add.description,
            repair_type_id: add.repairTypeIds[0] ?? null,
          },
        });

        tempToRealIdMap.set(i, newItem.id);

        if (add.repairTypeIds.length > 0) {
          await tx.maintenance_order_item_repair_types.createMany({
            data: add.repairTypeIds.map((repairTypeId) => ({
              maintenance_order_item_id: newItem.id,
              repair_type_id: repairTypeId,
            })),
            skipDuplicates: true,
          });
        }
      }

      // 1c. REPAIR TYPE UPDATES
      for (const update of itemChanges.repairTypeUpdates) {
        await tx.maintenance_order_items.update({
          where: { id: update.itemId },
          data: { repair_type_id: update.repairTypeIds[0] ?? null },
        });

        await tx.maintenance_order_item_repair_types.deleteMany({
          where: { maintenance_order_item_id: update.itemId },
        });

        if (update.repairTypeIds.length > 0) {
          await tx.maintenance_order_item_repair_types.createMany({
            data: update.repairTypeIds.map((repairTypeId) => ({
              maintenance_order_item_id: update.itemId,
              repair_type_id: repairTypeId,
            })),
            skipDuplicates: true,
          });
        }
      }

      // 1d. DESCRIPTION UPDATES
      for (const descUpdate of itemChanges.descriptionUpdates) {
        await tx.maintenance_order_items.update({
          where: { id: descUpdate.itemId },
          data: { description: descUpdate.description },
        });
      }

      // 1e. CHIEF COMMENT UPDATES
      for (const commentUpdate of itemChanges.chiefCommentUpdates) {
        await tx.maintenance_order_items.update({
          where: { id: commentUpdate.itemId },
          data: {
            workshop_chief_comment: commentUpdate.comment,
            workshop_chief_comment_by: profile.id,
          },
        });
      }

      // ──────────────────────────────────────────────
      // 2. ASIGNAR ITEMS A SECTORES + CREAR DIAGNOSTICO
      // ──────────────────────────────────────────────

      // Backend safeguard: normalize sector order considering sectors that already have work orders
      const existingSequences = await tx.maintenance_order_items.findMany({
        where: {
          maintenance_order_id: orderId,
          work_order_id: { not: null },
          assigned_sector_id: { not: null },
          sector_sequence_order: { not: null },
        },
        select: { sector_sequence_order: true },
      });

      const maxExistingSeq = existingSequences.reduce((max, item) => Math.max(max, item.sector_sequence_order ?? 0), 0);

      // Sort incoming sector order and re-normalize starting from maxExistingSeq + 1
      const sortedSectorOrder = [...sectorOrder].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
      const normalizedSectorOrder = sortedSectorOrder.map((so, idx) => ({
        ...so,
        sequenceOrder: maxExistingSeq + idx + 1,
      }));

      // Construir mapa de sectorId → sequenceOrder (normalized)
      const sectorSequenceMap = new Map<string, number>();
      for (const so of normalizedSectorOrder) {
        sectorSequenceMap.set(so.sectorId, so.sequenceOrder);
      }

      for (const assignment of sectorAssignments) {
        const seqOrder = sectorSequenceMap.get(assignment.sectorId) ?? 1;

        // Filtrar IDs reales (descartar temp IDs que no se pudieron resolver)
        const realIds = assignment.itemIds.filter((id) => !id.startsWith('temp-'));
        if (realIds.length > 0) {
          await tx.maintenance_order_items.updateMany({
            where: { id: { in: realIds } },
            data: {
              assigned_sector_id: assignment.sectorId,
              sector_sequence_order: seqOrder,
              assigned_by: profile.id,
              assigned_at: new Date(),
            },
          });
        }

        // Crear item DIAGNOSTICO si no existe para este sector
        const existingDiag = await tx.maintenance_order_items.findFirst({
          where: {
            maintenance_order_id: orderId,
            assigned_sector_id: assignment.sectorId,
            is_diagnostico: true,
          },
          select: { id: true },
        });

        if (!existingDiag) {
          await tx.maintenance_order_items.create({
            data: {
              maintenance_order_id: orderId,
              assigned_sector_id: assignment.sectorId,
              sector_sequence_order: seqOrder,
              is_diagnostico: true,
              description: 'DIAGNOSTICO',
              assigned_by: profile.id,
              assigned_at: new Date(),
            },
          });
        }
      }

      // Grouped audit log: capture all wizard changes in a single entry (gestión)
      const groupedMetadata: Record<string, unknown> = {};
      if (itemChanges.deletes.length > 0) groupedMetadata.deletes = itemChanges.deletes;
      if (itemChanges.adds.length > 0) groupedMetadata.adds = itemChanges.adds;
      if (itemChanges.repairTypeUpdates.length > 0) groupedMetadata.repairTypeUpdates = itemChanges.repairTypeUpdates;
      if (itemChanges.descriptionUpdates.length > 0)
        groupedMetadata.descriptionUpdates = itemChanges.descriptionUpdates;
      if (itemChanges.chiefCommentUpdates.length > 0)
        groupedMetadata.chiefCommentUpdates = itemChanges.chiefCommentUpdates;
      if (sectorAssignments.length > 0) {
        groupedMetadata.sectorAssignments = sectorAssignments.map((a) => ({
          itemIds: a.itemIds,
          sectorId: a.sectorId,
          sequenceOrder: sectorSequenceMap.get(a.sectorId) ?? null,
        }));
      }
      if (Object.keys(groupedMetadata).length > 0) {
        await logActivity(tx, {
          maintenanceOrderId: orderId,
          actionType: ACTIVITY_LOG.ORDER_ITEMS_UPDATED,
          performedBy: profile.id,
          metadata: { ...groupedMetadata, source: 'wizard' },
        });
      }
    });

    // ──────────────────────────────────────────────
    // 3. GENERAR OTs (fuera de la transacción anterior para evitar timeouts)
    // ──────────────────────────────────────────────

    const result = await generateWorkOrdersForOrder(orderId, dates);

    logger.info('Wizard: setup y generacion completados', {
      data: { orderId, workOrdersCreated: result.length },
    });

    await invalidateCacheTags(INVALIDATION_MAP.setupAndGenerateWorkOrders);
    return result;
  } catch (error) {
    logger.error('Error en wizard setup y generacion', { data: { error, orderId } });
    throw error;
  }
}

/**
 * Devuelve los Grupos de Tareas activos con sus tipos de reparacion asociados.
 * Se utiliza en el dialogo de agregar items para que el usuario pueda elegir un
 * grupo y pre-tildar todas sus tareas, con la posibilidad de destildar las que
 * no quiera cargar antes de confirmar.
 */
export async function getMaintenanceTaskGroupsWithRepairTypes() {
  logger.debug('Obteniendo grupos de tareas con repair_types');

  try {
    const groups = await prisma.maintenance_request_groups.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        maintenance_group_type_of_repairs: {
          select: {
            types_of_repairs: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    return groups.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      repairTypes: g.maintenance_group_type_of_repairs
        .map((rel) => rel.types_of_repairs)
        .filter((rt): rt is { id: string; name: string } => rt !== null),
    }));
  } catch (error) {
    logger.error('Error al obtener grupos de tareas', { data: { error } });
    throw error;
  }
}

export type MaintenanceTaskGroupsWithRepairTypes = Awaited<
  ReturnType<typeof getMaintenanceTaskGroupsWithRepairTypes>
>;
export type MaintenanceTaskGroupWithRepairTypes = MaintenanceTaskGroupsWithRepairTypes[number];
