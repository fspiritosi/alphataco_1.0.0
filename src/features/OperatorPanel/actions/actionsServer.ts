'use server';

import { ACTIVITY_LOG } from '@/features/Mantenimiento/shared/activity-log/action-types';
import { logActivity } from '@/features/Mantenimiento/shared/activity-log/log-activity';
import { logWorkOrderCompletedOnMaintenanceOrder } from '@/features/Mantenimiento/shared/activity-log/log-work-order-completed';
import { getMaintenanceOrderCompanyId } from '@/features/Mantenimiento/shared/resource-company';
import { DIAGNOSTICO_REPAIR_TYPE_ID } from '@/features/Mantenimiento/utils/constants';
import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import { prisma } from '@/shared/lib/prisma';
import { revalidatePath } from 'next/cache';

const logger = new Logger('OperatorPanel/actions');

// =============================================================================
// WORK ORDERS - SECTOR SEQUENCE BLOCKING
// =============================================================================

/**
 * TEMPORAL: sólo la usa `startWorkOrder`, que se migra en el commit siguiente.
 * La versión en Prisma ya vive en `actions/blocking.ts` + `lib/sector-blocking.ts`.
 */
async function getWorkOrderBlockingStatus(
  workOrderIds: string[],
  supabase: Awaited<ReturnType<typeof supabaseServer>>
): Promise<Record<string, { isBlocked: boolean; blockedBySector: string | null }>> {
  if (workOrderIds.length === 0) return {};

  const result: Record<string, { isBlocked: boolean; blockedBySector: string | null }> = {};
  for (const id of workOrderIds) {
    result[id] = { isBlocked: false, blockedBySector: null };
  }

  // Get maintenance_order_items for these work orders to find maintenance_order_id and sector_sequence_order
  const { data: woMoItems } = await supabase
    .from('maintenance_order_items')
    .select('maintenance_order_id, work_order_id, sector_sequence_order, assigned_sector_id')
    .in('work_order_id', workOrderIds)
    .not('sector_sequence_order', 'is', null);

  if (!woMoItems || woMoItems.length === 0) return result;

  // Group by maintenance_order_id to process each maintenance order
  const moGroups = new Map<string, typeof woMoItems>();
  for (const item of woMoItems) {
    if (!item.maintenance_order_id) continue;
    const existing = moGroups.get(item.maintenance_order_id) || [];
    existing.push(item);
    moGroups.set(item.maintenance_order_id, existing);
  }

  // For each maintenance order, get ALL maintenance_order_items with work_order_id to check completion
  const moIds = Array.from(moGroups.keys());
  const { data: allMoItems } = await supabase
    .from('maintenance_order_items')
    .select(
      `
      maintenance_order_id, work_order_id, sector_sequence_order, assigned_sector_id,
      workshop_sectors:assigned_sector_id(name),
      work_orders:work_order_id(id, status)
    `
    )
    .in('maintenance_order_id', moIds)
    .not('work_order_id', 'is', null)
    .not('sector_sequence_order', 'is', null);

  if (!allMoItems) return result;

  // Group all items by maintenance_order_id
  const allMoGroups = new Map<string, typeof allMoItems>();
  for (const item of allMoItems) {
    if (!item.maintenance_order_id) continue;
    const existing = allMoGroups.get(item.maintenance_order_id) || [];
    existing.push(item);
    allMoGroups.set(item.maintenance_order_id, existing);
  }

  // For each WO, check if any sector with lower sequence_order has incomplete WOs
  // KEY: Only use the WO's MINIMUM sequence_order to check blocking.
  // If a WO has items at seq=1 AND seq=3, it can start working on seq=1 items
  // regardless of whether seq=3 items would be blocked.
  for (const [moId, myItems] of moGroups) {
    const allItems = allMoGroups.get(moId) || [];

    // Group by sector_sequence_order
    const bySequence = new Map<number, typeof allItems>();
    for (const item of allItems) {
      if (item.sector_sequence_order === null) continue;
      const existing = bySequence.get(item.sector_sequence_order) || [];
      existing.push(item);
      bySequence.set(item.sector_sequence_order, existing);
    }

    // Find the minimum sequence_order per WO
    const woMinSeq = new Map<string, { minSeq: number; sectorId: string | null }>();
    for (const myItem of myItems) {
      if (!myItem.work_order_id || myItem.sector_sequence_order === null) continue;
      const current = woMinSeq.get(myItem.work_order_id);
      if (!current || myItem.sector_sequence_order < current.minSeq) {
        woMinSeq.set(myItem.work_order_id, {
          minSeq: myItem.sector_sequence_order,
          sectorId: myItem.assigned_sector_id,
        });
      }
    }

    // Check blocking only at each WO's minimum sequence
    for (const [woId, { minSeq, sectorId }] of woMinSeq) {
      let blocked = false;
      let blockingSectorName: string | null = null;

      for (const [seq, seqItems] of bySequence) {
        if (seq >= minSeq) continue;

        // Find incomplete items from DIFFERENT sectors at this lower sequence
        const blockingItem = seqItems.find((si) => {
          if (si.assigned_sector_id === sectorId) return false;

          const wo = si.work_orders;
          if (!wo || typeof wo !== 'object') return true;
          const status = 'status' in wo ? wo.status : null;
          // paused OTs don't block other sectors (enables "one at a time" workflow)
          return status !== 'completed' && status !== 'completed_partial' && status !== 'paused';
        });

        if (blockingItem) {
          // Use the ACTUAL blocking item's sector name (not seqItems[0])
          const sectorData = blockingItem.workshop_sectors;
          blockingSectorName =
            sectorData && typeof sectorData === 'object' && 'name' in sectorData ? String(sectorData.name) : null;
          blocked = true;
          break;
        }
      }

      if (blocked) {
        result[woId] = { isBlocked: true, blockedBySector: blockingSectorName };
      }
    }
  }

  return result;
}

// =============================================================================
// WORK ORDER ACTIONS
// =============================================================================

export async function startWorkOrder(workOrderId: string) {
  const supabase = await supabaseServer();

  // Verify sector sequence is not blocking this WO
  const blockingStatus = await getWorkOrderBlockingStatus([workOrderId], supabase);
  if (blockingStatus[workOrderId]?.isBlocked) {
    const blockedBy = blockingStatus[workOrderId].blockedBySector;
    throw new Error(`No se puede iniciar: el sector ${blockedBy || 'anterior'} no ha completado sus tareas`);
  }

  // Validate "one at a time" rule: no other WO of the same OM can be in_progress
  const { data: moItem } = await supabase
    .from('maintenance_order_items')
    .select('maintenance_order_id')
    .eq('work_order_id', workOrderId)
    .limit(1)
    .single();

  if (moItem?.maintenance_order_id) {
    const { data: allMoItems } = await supabase
      .from('maintenance_order_items')
      .select('work_order_id')
      .eq('maintenance_order_id', moItem.maintenance_order_id)
      .not('work_order_id', 'is', null);

    const otherWoIds = [...new Set((allMoItems || []).map((i) => i.work_order_id).filter(Boolean))].filter(
      (id) => id !== workOrderId
    );

    if (otherWoIds.length > 0) {
      const { data: activeWos } = await supabase
        .from('work_orders')
        .select('id, sector:workshop_sectors!work_orders_sector_id_fkey(name)')
        .in('id', otherWoIds)
        .eq('status', 'in_progress');

      if (activeWos && activeWos.length > 0) {
        const sectorName =
          activeWos[0].sector && typeof activeWos[0].sector === 'object' && 'name' in activeWos[0].sector
            ? String(activeWos[0].sector.name)
            : 'otro sector';
        throw new Error(`No se puede iniciar: ${sectorName} tiene una OT en progreso`);
      }
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('work_orders')
    .update({
      status: 'in_progress',
      started_at: new Date().toISOString(),
      started_by: user?.id || null,
    })
    .eq('id', workOrderId);

  if (error) {
    logger.error('Error starting work order', { data: { error } });
    throw error;
  }

  try {
    await logActivity(prisma, {
      workOrderId,
      actionType: ACTIVITY_LOG.WO_STARTED,
      performedBy: user?.id ?? null,
      previousStatus: 'pending',
      newStatus: 'in_progress',
      metadata: {},
    });
  } catch (logErr) {
    logger.error('Error logging wo_started', { data: { logErr } });
  }

  revalidatePath('/operator');
}

/**
 * Pausa una OT en progreso.
 * Al pausar, las OTs de los siguientes sectores quedan desbloqueadas
 * para que otro sector pueda trabajar (UNO A LA VEZ).
 */
export async function pauseWorkOrder(workOrderId: string) {
  const supabase = await supabaseServer();

  // Validate work order is in_progress
  const { data: woData } = await supabase.from('work_orders').select('status').eq('id', workOrderId).single();

  if (woData?.status !== 'in_progress') {
    throw new Error('Solo se puede pausar una OT que esté en progreso');
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('work_orders')
    .update({
      status: 'paused',
    })
    .eq('id', workOrderId);

  if (error) {
    logger.error('Error pausing work order', { data: { error } });
    throw error;
  }

  try {
    await logActivity(prisma, {
      workOrderId,
      actionType: ACTIVITY_LOG.WO_PAUSED,
      performedBy: user?.id ?? null,
      previousStatus: 'in_progress',
      newStatus: 'paused',
      metadata: {},
    });
  } catch (logErr) {
    logger.error('Error logging wo_paused', { data: { logErr } });
  }

  revalidatePath('/operator');
}

/**
 * Reanuda una OT pausada.
 * Valida que no haya otra OT de la misma OM en progreso (UNO A LA VEZ).
 */
export async function resumeWorkOrder(workOrderId: string) {
  const supabase = await supabaseServer();

  // Validate work order is paused
  const { data: woData } = await supabase
    .from('work_orders')
    .select('status, sector_id')
    .eq('id', workOrderId)
    .single();

  if (woData?.status !== 'paused') {
    throw new Error('Solo se puede reanudar una OT que esté pausada');
  }

  // Check that no other WO of the same maintenance_order is in_progress
  // Get the maintenance_order_id through maintenance_order_items
  const { data: moItem } = await supabase
    .from('maintenance_order_items')
    .select('maintenance_order_id')
    .eq('work_order_id', workOrderId)
    .limit(1)
    .single();

  if (moItem?.maintenance_order_id) {
    // Find all work_order_ids for this maintenance_order
    const { data: allMoItems } = await supabase
      .from('maintenance_order_items')
      .select('work_order_id')
      .eq('maintenance_order_id', moItem.maintenance_order_id)
      .not('work_order_id', 'is', null);

    const otherWoIds = [...new Set((allMoItems || []).map((i) => i.work_order_id).filter(Boolean))].filter(
      (id) => id !== workOrderId
    );

    if (otherWoIds.length > 0) {
      const { data: activeWos } = await supabase
        .from('work_orders')
        .select('id, sector:workshop_sectors!work_orders_sector_id_fkey(name)')
        .in('id', otherWoIds)
        .eq('status', 'in_progress');

      if (activeWos && activeWos.length > 0) {
        const sectorName =
          activeWos[0].sector && typeof activeWos[0].sector === 'object' && 'name' in activeWos[0].sector
            ? String(activeWos[0].sector.name)
            : 'otro sector';
        throw new Error(`No se puede reanudar: ${sectorName} tiene una OT en progreso`);
      }
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('work_orders')
    .update({
      status: 'in_progress',
    })
    .eq('id', workOrderId);

  if (error) {
    logger.error('Error resuming work order', { data: { error } });
    throw error;
  }

  try {
    await logActivity(prisma, {
      workOrderId,
      actionType: ACTIVITY_LOG.WO_RESUMED,
      performedBy: user?.id ?? null,
      previousStatus: 'paused',
      newStatus: 'in_progress',
      metadata: {},
    });
  } catch (logErr) {
    logger.error('Error logging wo_resumed', { data: { logErr } });
  }

  revalidatePath('/operator');
}

export async function completeRepair(repairId: string) {
  const supabase = await supabaseServer();

  // Verify work order is not in pending status
  const { data: repairData } = await supabase
    .from('work_order_item_repairs')
    .select('work_order_item_id, work_order_items!inner(work_order_id, work_orders!inner(status))')
    .eq('id', repairId)
    .single();

  const woStatus = (repairData?.work_order_items as { work_orders: { status: string } } | undefined)?.work_orders
    ?.status;

  if (woStatus === 'pending') {
    throw new Error('No se puede completar la tarea: primero debe iniciar la Orden de Trabajo');
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('work_order_item_repairs')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      completed_by: user?.id || null,
    })
    .eq('id', repairId);

  if (error) {
    logger.error('Error completing repair', { data: { error } });
    throw error;
  }

  try {
    const ctx = await prisma.work_order_item_repairs.findUnique({
      where: { id: repairId },
      select: {
        types_of_repairs: { select: { name: true } },
        work_order_items: { select: { work_order_id: true } },
      },
    });
    if (ctx?.work_order_items?.work_order_id) {
      await logActivity(prisma, {
        workOrderId: ctx.work_order_items.work_order_id,
        actionType: ACTIVITY_LOG.REPAIR_COMPLETED,
        performedBy: user?.id ?? null,
        metadata: { repairId, repairTypeName: ctx.types_of_repairs?.name ?? null },
      });
    }
  } catch (logErr) {
    logger.error('Error logging repair_completed', { data: { logErr } });
  }
}

export async function uncompleteRepair(repairId: string) {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('work_order_item_repairs')
    .update({
      status: 'in_progress',
      completed_at: null,
      completed_by: null,
    })
    .eq('id', repairId);

  if (error) {
    logger.error('Error uncompleting repair', { data: { error } });
    throw error;
  }

  try {
    const ctx = await prisma.work_order_item_repairs.findUnique({
      where: { id: repairId },
      select: {
        types_of_repairs: { select: { name: true } },
        work_order_items: { select: { work_order_id: true } },
      },
    });
    if (ctx?.work_order_items?.work_order_id) {
      await logActivity(prisma, {
        workOrderId: ctx.work_order_items.work_order_id,
        actionType: ACTIVITY_LOG.REPAIR_UNCOMPLETED,
        performedBy: user?.id ?? null,
        metadata: { repairId, repairTypeName: ctx.types_of_repairs?.name ?? null },
      });
    }
  } catch (logErr) {
    logger.error('Error logging repair_uncompleted', { data: { logErr } });
  }
}

export async function updateTechnicianNotes(repairId: string, notes: string) {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('work_order_item_repairs')
    .update({ technician_notes: notes, technician_notes_by: user?.id ?? null })
    .eq('id', repairId);

  if (error) {
    logger.error('Error updating technician notes', { data: { error } });
    throw error;
  }

  try {
    const ctx = await prisma.work_order_item_repairs.findUnique({
      where: { id: repairId },
      select: {
        types_of_repairs: { select: { name: true } },
        work_order_items: { select: { work_order_id: true } },
      },
    });
    if (ctx?.work_order_items?.work_order_id) {
      await logActivity(prisma, {
        workOrderId: ctx.work_order_items.work_order_id,
        actionType: ACTIVITY_LOG.REPAIR_TECHNICIAN_NOTES_UPDATED,
        performedBy: user?.id ?? null,
        metadata: {
          repairId,
          repairTypeName: ctx.types_of_repairs?.name ?? null,
          notesPreview: notes.slice(0, 100),
        },
      });
    }
  } catch (logErr) {
    logger.error('Error logging repair_technician_notes_updated', { data: { logErr } });
  }
}

export async function returnTask(repairId: string, returnReason: string) {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('work_order_item_repairs')
    .update({
      status: 'reassignment_requested',
      return_reason: returnReason,
    })
    .eq('id', repairId);

  if (error) {
    logger.error('Error returning task', { data: { error } });
    throw error;
  }

  try {
    const ctx = await prisma.work_order_item_repairs.findUnique({
      where: { id: repairId },
      select: {
        types_of_repairs: { select: { name: true } },
        work_order_items: { select: { work_order_id: true } },
      },
    });
    if (ctx?.work_order_items?.work_order_id) {
      await logActivity(prisma, {
        workOrderId: ctx.work_order_items.work_order_id,
        actionType: ACTIVITY_LOG.REPAIR_RETURNED_TO_CHIEF,
        performedBy: user?.id ?? null,
        metadata: {
          repairId,
          repairTypeName: ctx.types_of_repairs?.name ?? null,
          return_reason: returnReason,
        },
      });
    }
  } catch (logErr) {
    logger.error('Error logging repair_returned_to_chief', { data: { logErr } });
  }
}

export async function closeWorkOrder(workOrderId: string, notes?: string) {
  const supabase = await supabaseServer();

  // Validate work order is started (in_progress or paused) before allowing close
  const { data: woData } = await supabase.from('work_orders').select('status').eq('id', workOrderId).single();

  if (woData?.status === 'pending') {
    throw new Error('No se puede cerrar la OT: primero debe iniciarla');
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get all repairs for this work order
  const { data: items } = await supabase
    .from('work_order_items')
    .select('id, work_order_item_repairs(id, status)')
    .eq('work_order_id', workOrderId);

  const allRepairs = (items || []).flatMap((i) => i.work_order_item_repairs || []);
  const allCompleted = allRepairs.every((r) => r.status === 'completed');
  const finalStatus = allCompleted ? 'completed' : 'completed_partial';

  const { error } = await supabase
    .from('work_orders')
    .update({
      status: finalStatus,
      completed_at: new Date().toISOString(),
      completed_by: user?.id || null,
      notes: notes || null,
    })
    .eq('id', workOrderId);

  if (error) {
    logger.error('Error closing work order', { data: { error } });
    throw error;
  }

  // Check if all work orders for the maintenance order are closed
  // Get maintenance_order_id through work_order_items → maintenance_order_items relationship
  const { data: woItems, error: woItemError } = await supabase
    .from('work_order_items')
    .select('maintenance_order_item_id, maintenance_order_items(maintenance_order_id)')
    .eq('work_order_id', workOrderId)
    .limit(1);

  if (woItemError) {
    logger.error('Error getting maintenance_order_id from work_order_items', { data: { error: woItemError } });
  }

  const firstWoItem = woItems?.[0];
  const moItemData = firstWoItem?.maintenance_order_items;
  const maintenanceOrderId = Array.isArray(moItemData)
    ? moItemData[0]?.maintenance_order_id
    : moItemData?.maintenance_order_id;

  if (maintenanceOrderId) {
    // Use maintenance_order_items.work_order_id (direct FK) to get all work_orders
    const { data: moItems, error: moItemsError } = await supabase
      .from('maintenance_order_items')
      .select('work_order_id')
      .eq('maintenance_order_id', maintenanceOrderId)
      .not('work_order_id', 'is', null);

    if (moItemsError) {
      logger.error('Error getting work_orders for maintenance order', { data: { error: moItemsError } });
    }

    // Get unique work_order_ids
    const workOrderIds = [...new Set((moItems || []).map((item) => item.work_order_id).filter(Boolean))];

    if (workOrderIds.length > 0) {
      const { data: allWOs, error: allWOsError } = await supabase
        .from('work_orders')
        .select('id, status')
        .in('id', workOrderIds as string[]);

      if (allWOsError) {
        logger.error('Error getting work_order statuses', { data: { error: allWOsError } });
      }

      const allClosed = (allWOs || []).every((wo) => wo.status === 'completed' || wo.status === 'completed_partial');

      logger.info('Checking if all work orders are closed', {
        data: { maintenanceOrderId, totalWOs: allWOs?.length, allClosed, statuses: allWOs?.map((wo) => wo.status) },
      });

      if (allClosed && (allWOs || []).length > 0) {
        const { error: updateMoError } = await supabase
          .from('maintenance_orders')
          .update({ status: 'pending_workshop_validation' })
          .eq('id', maintenanceOrderId);

        if (updateMoError) {
          logger.error('Error updating maintenance order to pending_workshop_validation', {
            data: { error: updateMoError },
          });
        } else {
          logger.info('Maintenance order ready for workshop validation', {
            data: { maintenanceOrderId },
          });
        }
      }
    }
  } else {
    logger.warn('No maintenance_order_id found for work_order', { data: { workOrderId } });
  }

  try {
    await logActivity(prisma, {
      workOrderId,
      actionType: ACTIVITY_LOG.WO_CLOSED,
      performedBy: user?.id ?? null,
      previousStatus: woData?.status ?? null,
      newStatus: finalStatus,
      notes: notes ?? null,
      metadata: { status: finalStatus },
    });
  } catch (logErr) {
    logger.error('Error logging wo_closed', { data: { logErr } });
  }

  // El cierre tambien se registra contra el PEDIDO: el historial del pedido filtra
  // por maintenance_order_id, asi que sin esto el evento solo se veia dentro de la OT.
  await logWorkOrderCompletedOnMaintenanceOrder(prisma, {
    workOrderId,
    finalStatus,
    performedBy: user?.id ?? null,
    notes: notes ?? null,
    maintenanceOrderId: maintenanceOrderId ?? null,
  });

  revalidatePath('/operator');
}

// =============================================================================
// ADD TASK
// =============================================================================

export async function getRepairTypesForSector(sectorId: string) {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('sector_repair_types')
    .select('repair_type_id, types_of_repairs(id, name, autorizable, criticity)')
    .eq('workshop_sector_id', sectorId);

  if (error) {
    logger.error('Error fetching sector repair types', { data: { error } });
    throw error;
  }

  return (data || [])
    .map((d) => d.types_of_repairs)
    .filter((rt): rt is NonNullable<typeof rt> => rt !== null && rt.id !== DIAGNOSTICO_REPAIR_TYPE_ID);
}

export async function getAllRepairTypes() {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('types_of_repairs')
    .select('id, name, autorizable, criticity')
    .eq('is_active', true)
    .neq('id', DIAGNOSTICO_REPAIR_TYPE_ID)
    .order('name');

  if (error) {
    logger.error('Error fetching all repair types', { data: { error } });
    throw error;
  }

  return data || [];
}

// Tipo inferido del retorno — compartido por ambos selectores de tipo de reparacion
export type OperatorRepairType = Awaited<ReturnType<typeof getRepairTypesForSector>>[number];

export async function addTaskToOwnWorkOrder(
  workOrderId: string,
  repairTypeId: string,
  description: string,
  isAutorizable: boolean
) {
  try {
    // Get work order with sector_id and maintenance_order_id from existing item
    const workOrder = await prisma.work_orders.findUniqueOrThrow({
      where: { id: workOrderId },
      select: {
        sector_id: true,
        company_id: true,
        work_order_items: {
          take: 1,
          select: {
            maintenance_order_items: {
              select: { maintenance_order_id: true },
            },
          },
        },
      },
    });

    const maintenanceOrderId = workOrder.work_order_items[0]?.maintenance_order_items?.maintenance_order_id;
    if (!maintenanceOrderId) {
      throw new Error('No se encontró la orden de mantenimiento asociada a esta OT');
    }

    const repairStatus = isAutorizable ? 'pending_approval' : 'pending';

    // Transaction: create maintenance_order_item → work_order_item → repair
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create new maintenance_order_item (with sector assigned + linked to this WO)
      const newMoItem = await tx.maintenance_order_items.create({
        data: {
          maintenance_order_id: maintenanceOrderId,
          company_id: workOrder.company_id,
          repair_type_id: repairTypeId,
          description,
          is_diagnostico: false,
          assigned_sector_id: workOrder.sector_id,
          work_order_id: workOrderId,
        },
        select: { id: true },
      });

      // 2. Create work_order_item pointing to the new maintenance_order_item
      const newWoItem = await tx.work_order_items.create({
        data: {
          work_order_id: workOrderId,
          maintenance_order_item_id: newMoItem.id,
          status: 'pending',
        },
        select: { id: true },
      });

      // 3. Create repair entry
      await tx.work_order_item_repairs.create({
        data: {
          work_order_item_id: newWoItem.id,
          company_id: workOrder.company_id,
          repair_type_id: repairTypeId,
          status: repairStatus,
          is_operator_added: true,
        },
      });

      return newWoItem;
    });

    logger.info('Task added to own work order', { data: { workOrderId, woItemId: result.id } });

    try {
      const supabase = await supabaseServer();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      await logActivity(prisma, {
        workOrderId,
        actionType: ACTIVITY_LOG.TASK_ADDED_BY_OPERATOR,
        performedBy: user?.id ?? null,
        metadata: { description, repairTypeId, isAutorizable },
      });
    } catch (logErr) {
      logger.error('Error logging task_added_by_operator', { data: { logErr } });
    }

    revalidatePath('/operator');
    return { requiresApproval: isAutorizable };
  } catch (error) {
    logger.error('Error adding task to own work order', { data: { error, workOrderId } });
    throw error;
  }
}

export async function requestTaskForOtherSector(maintenanceOrderId: string, repairTypeId: string, description: string) {
  try {
    await prisma.maintenance_order_items.create({
      data: {
        maintenance_order_id: maintenanceOrderId,
        company_id: await getMaintenanceOrderCompanyId(prisma, maintenanceOrderId),
        repair_type_id: repairTypeId,
        description,
        is_diagnostico: false,
      },
    });

    try {
      const supabase = await supabaseServer();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      await logActivity(prisma, {
        maintenanceOrderId,
        actionType: ACTIVITY_LOG.TASK_REQUESTED_FOR_OTHER_SECTOR,
        performedBy: user?.id ?? null,
        metadata: { description, repairTypeId },
      });
    } catch (logErr) {
      logger.error('Error logging task_requested_for_other_sector', { data: { logErr } });
    }

    revalidatePath('/operator');
  } catch (error) {
    logger.error('Error requesting task for other sector', { data: { error } });
    throw error;
  }
}
