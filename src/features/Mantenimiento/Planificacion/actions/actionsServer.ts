'use server';

import type { WorkOrderPriority } from '@/features/Mantenimiento/shared/work-order-types';
import { Logger } from '@/lib/logger';
import { requireServerAuthProfile } from '@/shared/actions/auth.actions';
import { CACHE_TAGS } from '@/shared/constants/cache';
import { INVALIDATION_MAP } from '@/shared/constants/cache-invalidation-map';
import { prisma } from '@/shared/lib/prisma';
import { invalidateCacheTags } from '@/shared/utils/cache-invalidation';
import { cacheLife, cacheTag } from 'next/cache';

const logger = new Logger('Planificacion/actions');

// =============================================================================
// TIPOS
// =============================================================================

export interface AssignWorkshopInput {
  maintenanceOrderItemId: string;
  workshopId: string;
  sectorId?: string | null;
  plannedStartDate: string; // ISO date string
  plannedEndDate: string; // ISO date string
  repairTypeIds: string[]; // Tipos de reparación seleccionados
}

export interface AssignWorkshopBulkInput {
  itemIds: string[];
  workshopId: string;
  sectorId?: string | null;
  plannedStartDate: string;
  plannedEndDate: string;
  repairTypeIds: string[]; // Tipos de reparación seleccionados
}

export interface CreateWorkOrderInput {
  itemIds: string[];
  workshopId: string;
  sectorId?: string | null;
  plannedStartDate: string;
  plannedEndDate: string;
  notes?: string;
  repairTypeIds?: string[]; // Tipos de reparación (opcional si ya están asignados)
  priority?: WorkOrderPriority; // Prioridad de la orden de trabajo
}

// =============================================================================
// UTILIDADES PARA NOMENCLATURA DE OT
// =============================================================================

/**
 * Formatea el número de orden de trabajo
 * Formato: OT-{NUMERO} (e.g. OT-000001)
 *
 * NOTA: Función interna, no exportada porque 'use server' requiere async
 */
function formatWorkOrderNumber(
  _domain: string | null,
  _serie: string | null,
  _sectorName: string | null,
  sequenceNumber: number
): string {
  const paddedNumber = String(sequenceNumber).padStart(6, '0');
  return `OT-${paddedNumber}`;
}

/**
 * Obtiene el siguiente número de secuencia global para OT
 * NO tiene cache — se llama antes de la transacción para evitar deadlocks
 */
async function getNextSequenceNumber(): Promise<number> {
  const last = await prisma.work_orders.findFirst({
    orderBy: { sequence_number: 'desc' },
    select: { sequence_number: true },
  });

  return (last?.sequence_number ?? 0) + 1;
}

// =============================================================================
// SERVER ACTIONS
// =============================================================================

/**
 * Asigna taller, sector, período y tipos de reparación a un item de maintenance_order
 * NO crea la orden de trabajo, solo guarda la asignación
 */
export async function assignWorkshopToItem(input: AssignWorkshopInput) {
  logger.info('Asignando taller a item', { data: { ...input } });

  const profile = await requireServerAuthProfile();

  const updatedItem = await prisma.$transaction(async (tx) => {
    // 1. Actualizar el item con el taller, sector y primer tipo de reparación (legacy)
    const item = await tx.maintenance_order_items.update({
      where: { id: input.maintenanceOrderItemId },
      data: {
        assigned_workshop_id: input.workshopId,
        assigned_sector_id: input.sectorId ?? null,
        planned_start_date: new Date(input.plannedStartDate),
        planned_end_date: new Date(input.plannedEndDate),
        assigned_by: profile.id,
        assigned_at: new Date(),
        repair_type_id: input.repairTypeIds[0] ?? null, // Campo legacy: primer tipo
      },
    });

    // 2. Guardar tipos de reparación en tabla pivot
    if (input.repairTypeIds.length > 0) {
      // Eliminar registros anteriores
      await tx.maintenance_order_item_repair_types.deleteMany({
        where: { maintenance_order_item_id: input.maintenanceOrderItemId },
      });

      // Insertar nuevos registros
      await tx.maintenance_order_item_repair_types.createMany({
        data: input.repairTypeIds.map((repairTypeId) => ({
          maintenance_order_item_id: input.maintenanceOrderItemId,
          repair_type_id: repairTypeId,
        })),
      });
    }

    return item;
  });

  logger.info('Taller y tipos de reparación asignados exitosamente', {
    data: { itemId: input.maintenanceOrderItemId, repairTypeCount: input.repairTypeIds.length },
  });

  await invalidateCacheTags(INVALIDATION_MAP.assignWorkshopToItems);

  return updatedItem;
}

/**
 * Asigna taller, sector, período y tipos de reparación a múltiples items
 */
export async function assignWorkshopToItemsBulk(input: AssignWorkshopBulkInput) {
  logger.info('Asignando taller a múltiples items', {
    data: {
      itemCount: input.itemIds.length,
      workshopId: input.workshopId,
      repairTypeCount: input.repairTypeIds.length,
    },
  });

  const profile = await requireServerAuthProfile();

  const updatedItems = await prisma.$transaction(async (tx) => {
    // 1. Actualizar múltiples items con updateMany
    await tx.maintenance_order_items.updateMany({
      where: { id: { in: input.itemIds } },
      data: {
        assigned_workshop_id: input.workshopId,
        assigned_sector_id: input.sectorId ?? null,
        planned_start_date: new Date(input.plannedStartDate),
        planned_end_date: new Date(input.plannedEndDate),
        assigned_by: profile.id,
        assigned_at: new Date(),
        repair_type_id: input.repairTypeIds[0] ?? null, // Campo legacy: primer tipo
      },
    });

    // 2. Guardar tipos de reparación en tabla pivot para cada item
    if (input.repairTypeIds.length > 0) {
      // Eliminar registros anteriores de todos los items
      await tx.maintenance_order_item_repair_types.deleteMany({
        where: { maintenance_order_item_id: { in: input.itemIds } },
      });

      // Construir registros pivot para todos los items × todos los tipos
      const pivotRecords: { maintenance_order_item_id: string; repair_type_id: string }[] = [];
      for (const itemId of input.itemIds) {
        for (const repairTypeId of input.repairTypeIds) {
          pivotRecords.push({ maintenance_order_item_id: itemId, repair_type_id: repairTypeId });
        }
      }

      await tx.maintenance_order_item_repair_types.createMany({ data: pivotRecords });
    }

    // Retornar los items actualizados para consistencia con el retorno original
    return tx.maintenance_order_items.findMany({
      where: { id: { in: input.itemIds } },
    });
  });

  logger.info('Taller y tipos de reparación asignados a múltiples items', {
    data: { count: updatedItems.length, repairTypeCount: input.repairTypeIds.length },
  });

  await invalidateCacheTags(INVALIDATION_MAP.assignWorkshopToItems);

  return updatedItems;
}

/**
 * Crea una orden de trabajo a partir de items asignados
 * Los items deben pertenecer al mismo equipo
 */
export async function createWorkOrder(input: CreateWorkOrderInput) {
  logger.info('Creando orden de trabajo', {
    data: { itemCount: input.itemIds.length, workshopId: input.workshopId },
  });

  const profile = await requireServerAuthProfile();

  // Obtener siguiente número de secuencia ANTES de la transacción para evitar deadlocks
  const sequenceNumber = await getNextSequenceNumber();

  const result = await prisma.$transaction(async (tx) => {
    // 1. Obtener los items y verificar que son del mismo equipo
    const items = await tx.maintenance_order_items.findMany({
      where: { id: { in: input.itemIds } },
      select: {
        id: true,
        maintenance_order_id: true,
        maintenance_orders: {
          select: {
            id: true,
            equipment_id: true,
            vehicles: {
              select: {
                id: true,
                domain: true,
                serie: true,
                company_id: true,
              },
            },
          },
        },
      },
    });

    if (!items || items.length === 0) {
      throw new Error('No se encontraron los items seleccionados');
    }

    // Verificar que todos los items son del mismo equipo
    const equipmentIds = [...new Set(items.map((item) => item.maintenance_orders.equipment_id))];
    if (equipmentIds.length > 1) {
      throw new Error('Todos los items deben ser del mismo equipo para crear una orden de trabajo');
    }

    const equipmentId = equipmentIds[0];
    const vehicle = items[0].maintenance_orders.vehicles;

    if (!vehicle) {
      throw new Error('No se encontró el vehículo asociado a los items');
    }

    if (!vehicle.company_id) {
      throw new Error('El vehículo no tiene empresa asignada');
    }

    const companyId = vehicle.company_id;

    // 2. Obtener el nombre del sector (si existe)
    let sectorName: string | null = null;
    if (input.sectorId) {
      const sector = await tx.workshop_sectors.findUnique({
        where: { id: input.sectorId },
        select: { name: true },
      });
      sectorName = sector?.name ?? null;
    }

    // 3. Generar número de orden
    const orderNumber = formatWorkOrderNumber(vehicle.domain, vehicle.serie, sectorName, sequenceNumber);

    // 4. Crear la orden de trabajo
    const workOrder = await tx.work_orders.create({
      data: {
        order_number: orderNumber,
        sequence_number: sequenceNumber,
        company_id: companyId,
        equipment_id: equipmentId,
        workshop_id: input.workshopId,
        sector_id: input.sectorId ?? null,
        status: 'pending',
        priority: input.priority ?? 'medium',
        planned_start_date: new Date(input.plannedStartDate),
        planned_end_date: new Date(input.plannedEndDate),
        notes: input.notes ?? null,
        created_by: profile.id,
      },
    });

    // 5. Crear los work_order_items (con create individual para obtener IDs)
    const createdWoItems = await Promise.all(
      input.itemIds.map((itemId) =>
        tx.work_order_items.create({
          data: {
            work_order_id: workOrder.id,
            maintenance_order_item_id: itemId,
            status: 'pending',
          },
          select: { id: true, maintenance_order_item_id: true },
        })
      )
    );

    // 6. Crear los work_order_item_repairs (cada tipo de reparación es un trabajo individual)
    if (input.repairTypeIds && input.repairTypeIds.length > 0) {
      const repairRecords: { work_order_item_id: string; repair_type_id: string; status: 'pending' }[] = [];

      for (const woItem of createdWoItems) {
        for (const repairTypeId of input.repairTypeIds) {
          repairRecords.push({
            work_order_item_id: woItem.id,
            repair_type_id: repairTypeId,
            status: 'pending',
          });
        }
      }

      await tx.work_order_item_repairs.createMany({ data: repairRecords });

      logger.info('Trabajos de reparación creados', {
        data: { count: repairRecords.length, workOrderId: workOrder.id },
      });
    }

    // 7. Actualizar los maintenance_order_items con la referencia a la OT
    await tx.maintenance_order_items.updateMany({
      where: { id: { in: input.itemIds } },
      data: {
        work_order_id: workOrder.id,
        assigned_workshop_id: input.workshopId,
        assigned_sector_id: input.sectorId ?? null,
        planned_start_date: new Date(input.plannedStartDate),
        planned_end_date: new Date(input.plannedEndDate),
        assigned_by: profile.id,
        assigned_at: new Date(),
        repair_type_id: input.repairTypeIds?.[0] ?? null, // Campo legacy: primer tipo
      },
    });

    // 8. Guardar tipos de reparación en tabla pivot (si se proporcionaron)
    if (input.repairTypeIds && input.repairTypeIds.length > 0) {
      // Eliminar registros anteriores de todos los items
      await tx.maintenance_order_item_repair_types.deleteMany({
        where: { maintenance_order_item_id: { in: input.itemIds } },
      });

      const pivotRecords: { maintenance_order_item_id: string; repair_type_id: string }[] = [];
      for (const itemId of input.itemIds) {
        for (const repairTypeId of input.repairTypeIds) {
          pivotRecords.push({ maintenance_order_item_id: itemId, repair_type_id: repairTypeId });
        }
      }

      await tx.maintenance_order_item_repair_types.createMany({ data: pivotRecords });
    }

    return { workOrder, orderNumber };
  });

  logger.info('Orden de trabajo creada exitosamente', {
    data: {
      workOrderId: result.workOrder.id,
      orderNumber: result.orderNumber,
      itemCount: input.itemIds.length,
      repairTypeCount: input.repairTypeIds?.length ?? 0,
      priority: input.priority ?? 'medium',
    },
  });

  await invalidateCacheTags(INVALIDATION_MAP.createWorkOrder);

  return {
    workOrder: result.workOrder,
    orderNumber: result.orderNumber,
    itemCount: input.itemIds.length,
  };
}

/**
 * Asigna y crea orden de trabajo en una sola operación
 * Útil cuando se quiere asignar y generar OT directamente
 */
export async function assignAndCreateWorkOrder(input: CreateWorkOrderInput) {
  // Primero asignar los items (con tipos de reparación)
  await assignWorkshopToItemsBulk({
    itemIds: input.itemIds,
    workshopId: input.workshopId,
    sectorId: input.sectorId,
    plannedStartDate: input.plannedStartDate,
    plannedEndDate: input.plannedEndDate,
    repairTypeIds: input.repairTypeIds ?? [],
  });

  // Luego crear la orden de trabajo
  const result = await createWorkOrder(input);

  await invalidateCacheTags(INVALIDATION_MAP.createWorkOrder);

  return result;
}

// =============================================================================
// OCUPACIÓN DE SECTORES
// =============================================================================

/**
 * Obtiene la ocupación de todos los sectores de un taller
 * Retorna cuántas OT activas hay por sector vs el cupo máximo
 */
export async function getSectorOccupancy(workshopId: string) {
  'use cache';
  cacheTag(CACHE_TAGS.TAB_IN_WORKSHOP);
  cacheLife({ expire: 30, revalidate: 30, stale: 10 });

  // Obtener todos los sectores del taller con su cupo
  const sectors = await prisma.workshop_sectors.findMany({
    where: { workshop_id: workshopId, is_active: true },
    select: { id: true, name: true, max_capacity: true },
  });

  if (sectors.length === 0) {
    return [];
  }

  // Obtener IDs de sectores para filtrar las OTs
  const sectorIds = sectors.map((s) => s.id);

  // Contar OTs activas por sector (pending, in_progress, paused)
  const occupancyRaw = await prisma.work_orders.groupBy({
    by: ['sector_id'],
    where: {
      workshop_id: workshopId,
      status: { in: ['pending', 'in_progress', 'paused'] },
      sector_id: { in: sectorIds, not: null },
    },
    _count: { id: true },
  });

  // Construir mapa de ocupación por sector
  const occupancyCount: Record<string, number> = {};
  for (const row of occupancyRaw) {
    if (row.sector_id) {
      occupancyCount[row.sector_id] = row._count.id;
    }
  }

  return sectors.map((s) => ({
    id: s.id,
    name: s.name,
    maxCapacity: s.max_capacity,
    currentOccupancy: occupancyCount[s.id] ?? 0,
  }));
}

export type SectorOccupancy = Awaited<ReturnType<typeof getSectorOccupancy>>[number];

// =============================================================================
// TIPOS DE RETORNO
// =============================================================================

export type AssignWorkshopResult = Awaited<ReturnType<typeof assignWorkshopToItem>>;
export type CreateWorkOrderResult = Awaited<ReturnType<typeof createWorkOrder>>;
