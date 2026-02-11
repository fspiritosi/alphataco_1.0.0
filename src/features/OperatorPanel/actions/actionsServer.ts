'use server';

import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const logger = new Logger('OperatorPanel/actions');

// =============================================================================
// AUTH
// =============================================================================

export async function operatorLogin(email: string, password: string) {
  const supabase = await supabaseServer();

  const { error, data: authData } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  if (!authData.user) {
    return { error: 'No se pudo autenticar' };
  }

  // Verify profile has employee linked
  const { data: profile } = await supabase.from('profile').select('employee_id').eq('id', authData.user.id).single();

  if (!profile?.employee_id) {
    await supabase.auth.signOut();
    return { error: 'Tu usuario no tiene un empleado vinculado. Contacta al administrador.' };
  }

  // Verify employee has workshop sector
  const { data: employee } = await supabase
    .from('employees')
    .select('id, firstname, lastname, workshop_sector_id, company_id')
    .eq('id', profile.employee_id)
    .single();

  if (!employee) {
    await supabase.auth.signOut();
    return { error: 'No se encontro el empleado vinculado. Contacta al administrador.' };
  }

  if (!employee.workshop_sector_id) {
    await supabase.auth.signOut();
    return { error: 'Tu empleado no tiene un sector de taller asignado. Contacta al administrador.' };
  }

  // Set company cookie
  if (employee.company_id) {
    const cookieStore = await cookies();
    cookieStore.set('actualComp', employee.company_id, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
  }

  return { success: true };
}

export async function operatorLogout() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  const cookieStore = await cookies();
  cookieStore.delete('actualComp');
  revalidatePath('/', 'layout');
  redirect('/operator/login');
}

/**
 * Gets the full operator context: user -> profile -> employee -> sector -> workshop
 * Returns null if any step fails (no session, no employee, no sector)
 */
export async function getOperatorContext() {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase.from('profile').select('employee_id').eq('id', user.id).single();

  if (!profile?.employee_id) return null;

  const { data: employee } = await supabase
    .from('employees')
    .select('id, firstname, lastname, cuil, workshop_sector_id, company_id')
    .eq('id', profile.employee_id)
    .single();

  if (!employee?.workshop_sector_id) return null;

  const { data: sector } = await supabase
    .from('workshop_sectors')
    .select('id, name, workshop_id')
    .eq('id', employee.workshop_sector_id)
    .single();

  if (!sector) return null;

  const { data: workshop } = await supabase.from('workshops').select('id, name').eq('id', sector.workshop_id).single();

  return {
    userId: user.id,
    employeeId: employee.id,
    employeeName: `${employee.firstname} ${employee.lastname}`.trim(),
    sectorId: sector.id,
    sectorName: sector.name,
    workshopId: sector.workshop_id,
    workshopName: workshop?.name || 'Taller',
    companyId: employee.company_id,
  };
}

export type OperatorContext = NonNullable<Awaited<ReturnType<typeof getOperatorContext>>>;

// =============================================================================
// WORK ORDERS - SECTOR SEQUENCE BLOCKING
// =============================================================================

/**
 * Determines which work orders are blocked by sector sequence.
 * A WO is blocked if it belongs to a sector with a higher sequence_order
 * than an incomplete sector in the same maintenance order.
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

    for (const myItem of myItems) {
      if (!myItem.work_order_id || myItem.sector_sequence_order === null) continue;
      const mySeq = myItem.sector_sequence_order;

      // Check all sectors with lower sequence order
      for (const [seq, seqItems] of bySequence) {
        if (seq >= mySeq) continue;

        // Check if any WO in this lower sector is NOT completed
        const hasIncomplete = seqItems.some((si) => {
          const wo = si.work_orders;
          if (!wo || typeof wo !== 'object') return true;
          const status = 'status' in wo ? wo.status : null;
          return status !== 'completed' && status !== 'completed_partial';
        });

        if (hasIncomplete) {
          // Find the sector name from the first item in the blocking sector
          const blockingSectorName = seqItems[0]?.workshop_sectors;
          const sectorName =
            blockingSectorName && typeof blockingSectorName === 'object' && 'name' in blockingSectorName
              ? String(blockingSectorName.name)
              : null;

          result[myItem.work_order_id] = {
            isBlocked: true,
            blockedBySector: sectorName,
          };
          break;
        }
      }
    }
  }

  return result;
}

// =============================================================================
// WORK ORDERS - LIST
// =============================================================================

export async function getWorkOrdersForOperator(sectorId: string) {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('work_orders')
    .select(
      `
      id, order_number, status, priority, planned_start_date, started_at, completed_at,
      vehicles!work_orders_equipment_id_fkey(id, domain, serie, intern_number),
      work_order_items(
        id, status,
        work_order_item_repairs(id, status, is_diagnostico),
        maintenance_order_items(
          maintenance_orders(id, order_number)
        )
      )
    `
    )
    .eq('sector_id', sectorId)
    .in('status', ['pending', 'in_progress', 'paused'])
    .order('priority', { ascending: true })
    .order('planned_start_date', { ascending: true, nullsFirst: false });

  if (error) {
    logger.error('Error fetching operator work orders', { data: { error } });
    throw error;
  }

  const workOrders = data || [];

  // Enrich with sector blocking status
  const woIds = workOrders.map((wo) => wo.id);
  const blockingStatus = await getWorkOrderBlockingStatus(woIds, supabase);

  return workOrders.map((wo) => ({
    ...wo,
    is_blocked: blockingStatus[wo.id]?.isBlocked || false,
    blocked_by_sector: blockingStatus[wo.id]?.blockedBySector || null,
  }));
}

export type OperatorWorkOrder = Awaited<ReturnType<typeof getWorkOrdersForOperator>>[number];

// =============================================================================
// WORK ORDER DETAIL
// =============================================================================

export async function getWorkOrderDetailForOperator(workOrderId: string, sectorId: string) {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('work_orders')
    .select(
      `
      id, order_number, status, priority, planned_start_date, started_at, completed_at, notes,
      sector_id,
      work_order_items(
        id, status, maintenance_order_item_id,
        maintenance_order_items:maintenance_order_item_id(
          id, description, maintenance_order_id,
          maintenance_orders:maintenance_order_id(id, order_number, equipment_id,
            vehicles:equipment_id(id, domain, serie, intern_number, kilometer)
          )
        ),
        work_order_item_repairs(
          id, status, technician_notes, return_reason, is_operator_added, is_diagnostico,
          repair_type_id,
          types_of_repairs(id, name, criticity, autorizable)
        )
      )
    `
    )
    .eq('id', workOrderId)
    .eq('sector_id', sectorId)
    .single();

  if (error) {
    logger.error('Error fetching work order detail', { data: { error, workOrderId } });
    return null;
  }

  return data;
}

export type OperatorWorkOrderDetail = NonNullable<Awaited<ReturnType<typeof getWorkOrderDetailForOperator>>>;

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

  revalidatePath('/operator');
}

export async function completeRepair(repairId: string) {
  const supabase = await supabaseServer();

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
}

export async function uncompleteRepair(repairId: string) {
  const supabase = await supabaseServer();

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
}

export async function updateTechnicianNotes(repairId: string, notes: string) {
  const supabase = await supabaseServer();

  const { error } = await supabase
    .from('work_order_item_repairs')
    .update({ technician_notes: notes })
    .eq('id', repairId);

  if (error) {
    logger.error('Error updating technician notes', { data: { error } });
    throw error;
  }
}

export async function returnTask(repairId: string, returnReason: string) {
  const supabase = await supabaseServer();

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
}

export async function closeWorkOrder(workOrderId: string, notes?: string) {
  const supabase = await supabaseServer();

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
  // Get maintenance_order_id through work_order_items relationship
  const { data: woItem } = await supabase
    .from('work_order_items')
    .select('maintenance_order_items(maintenance_order_id)')
    .eq('work_order_id', workOrderId)
    .limit(1)
    .single();

  const maintenanceOrderId = woItem?.maintenance_order_items?.maintenance_order_id;

  if (maintenanceOrderId) {
    // Get all work_order_items for this maintenance order
    const { data: allItems } = await supabase
      .from('maintenance_order_items')
      .select('work_order_items(work_order_id, work_orders(id, status))')
      .eq('maintenance_order_id', maintenanceOrderId);

    const allWOs = (allItems || [])
      .flatMap((item) => item.work_order_items || [])
      .map((woItem) => woItem.work_orders)
      .filter((wo): wo is NonNullable<typeof wo> => wo !== null);

    const allClosed = allWOs.every((wo) => wo.status === 'completed' || wo.status === 'completed_partial');

    if (allClosed) {
      await supabase
        .from('maintenance_orders')
        .update({ status: 'pending_workshop_validation' })
        .eq('id', maintenanceOrderId);

      logger.info('Maintenance order ready for workshop validation', {
        data: { maintenanceOrderId },
      });
    }
  }

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

  return (data || []).map((d) => d.types_of_repairs).filter((rt): rt is NonNullable<typeof rt> => rt !== null);
}

export async function getAllRepairTypes() {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('types_of_repairs')
    .select('id, name, autorizable, criticity')
    .eq('is_active', true)
    .order('name');

  if (error) {
    logger.error('Error fetching all repair types', { data: { error } });
    throw error;
  }

  return data || [];
}

export async function addTaskToOwnWorkOrder(
  workOrderId: string,
  repairTypeId: string,
  description: string,
  isAutorizable: boolean
) {
  const supabase = await supabaseServer();

  // Get maintenance_order_item_id from an existing work order item (required FK)
  const { data: woItem } = await supabase
    .from('work_order_items')
    .select('maintenance_order_item_id')
    .eq('work_order_id', workOrderId)
    .not('maintenance_order_item_id', 'is', null)
    .limit(1)
    .single();

  if (!woItem?.maintenance_order_item_id) {
    throw new Error('No se encontro un item de referencia para asociar la tarea');
  }

  // Create work order item
  const { data: newItem, error: itemError } = await supabase
    .from('work_order_items')
    .insert({
      work_order_id: workOrderId,
      maintenance_order_item_id: woItem.maintenance_order_item_id,
      status: 'pending',
    })
    .select('id')
    .single();

  if (itemError || !newItem) {
    logger.error('Error creating work order item', { data: { error: itemError } });
    throw itemError || new Error('Failed to create work order item');
  }

  // Create repair entry
  const repairStatus = isAutorizable ? 'pending_approval' : 'pending';

  const { error: repairError } = await supabase.from('work_order_item_repairs').insert({
    work_order_item_id: newItem.id,
    repair_type_id: repairTypeId,
    description,
    status: repairStatus,
    is_operator_added: true,
  });

  if (repairError) {
    logger.error('Error creating repair', { data: { error: repairError } });
    throw repairError;
  }

  revalidatePath('/operator');
  return { requiresApproval: isAutorizable };
}

export async function requestTaskForOtherSector(maintenanceOrderId: string, repairTypeId: string, description: string) {
  const supabase = await supabaseServer();

  // Create a maintenance_order_item without sector assignment (jefe decides)
  const { error } = await supabase.from('maintenance_order_items').insert({
    maintenance_order_id: maintenanceOrderId,
    repair_type_id: repairTypeId,
    description,
    is_diagnostico: false,
    assigned_sector_id: null,
    assigned_workshop_id: null,
  });

  if (error) {
    logger.error('Error requesting task for other sector', { data: { error } });
    throw error;
  }

  revalidatePath('/operator');
}
