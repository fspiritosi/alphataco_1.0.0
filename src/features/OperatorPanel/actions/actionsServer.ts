'use server';

import { ACTIVITY_LOG } from '@/features/Mantenimiento/shared/activity-log/action-types';
import { logActivity } from '@/features/Mantenimiento/shared/activity-log/log-activity';
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
