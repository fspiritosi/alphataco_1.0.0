'use client';

import {
  getRepairItemDescription,
  getRepairItemGroupName,
  getRepairItemImages,
  getRepairItemLabel,
} from '@/features/Mantenimiento/shared/repair-item-label';
import { getItemComments, getTechnicianComments, type CommentEntry } from '@/features/Mantenimiento/utils/driverInfo';
import { useMemo } from 'react';
import type { MaintenanceOrderData, ValidationHistoryData } from '../../actions/queries.server';
import { getRepairDisplayName } from '../../utils/repairDisplayName';
import type { SectorStatus, SectorTimelineItem } from '../SectorTimeline';
import type { SectorGroup, SelectableRepair, TaskInfo } from './types';

/**
 * Derivaciones del detalle de una orden: agrupación por sector y por taller externo, tareas
 * por ítem, timeline, comentarios y reparaciones seleccionables para rechazo.
 *
 * Se extrajo del diálogo (1.877 líneas) para separar el cálculo de la presentación: acá no
 * hay JSX ni mutaciones, sólo `useMemo` sobre los datos que ya trajo el diálogo.
 */
export function useOrderDetailData(
  items: MaintenanceOrderData['maintenance_order_items'],
  order: MaintenanceOrderData | null,
  validationHistory: ValidationHistoryData | undefined
) {
  // Group items by sector (internal workshops)
  const sectorGroups = useMemo(() => {
    const groups = new Map<string, SectorGroup>();

    items.forEach((item) => {
      const sectorId = item.assigned_sector_id;
      if (!sectorId) return;

      const sectorName =
        item.workshop_sectors && typeof item.workshop_sectors === 'object' && 'name' in item.workshop_sectors
          ? (item.workshop_sectors.name as string)
          : 'Sin sector';

      if (!groups.has(sectorId)) {
        groups.set(sectorId, {
          sectorId,
          sectorName,
          sequenceOrder: item.sector_sequence_order ?? 999,
          items: [],
        });
      }
      groups.get(sectorId)!.items.push(item);
    });

    return Array.from(groups.values()).sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  }, [items]);

  // Group external workshop items
  const externalWorkshopGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        workshopId: string;
        workshopName: string;
        items: MaintenanceOrderData['maintenance_order_items'];
      }
    >();

    items.forEach((item) => {
      if (item.assigned_sector_id) return;
      const workshopId = item.assigned_workshop_id;
      if (!workshopId) return;

      const workshopName =
        item.workshops && typeof item.workshops === 'object' && 'name' in item.workshops
          ? (item.workshops.name as string)
          : 'Taller externo';

      if (!groups.has(workshopId)) {
        groups.set(workshopId, { workshopId, workshopName, items: [] });
      }
      groups.get(workshopId)!.items.push(item);
    });

    return Array.from(groups.values());
  }, [items]);

  // Helper: get repairs for a maintenance_order_item (filtered by matching work_order_item)
  const getRepairsForItem = (item: MaintenanceOrderData['maintenance_order_items'][number]) => {
    const wo = item.work_orders;
    if (!wo || Array.isArray(wo)) return [];
    return (wo.work_order_items || [])
      .filter((woi: { maintenance_order_item_id?: string }) => woi.maintenance_order_item_id === item.id)
      .flatMap(
        (woi: { work_order_item_repairs?: unknown[] }) =>
          (woi.work_order_item_repairs || []) as Array<{
            id: string;
            status: string;
            is_diagnostico?: boolean;
            is_operator_added?: boolean;
            rejection_reason?: string | null;
            types_of_repairs?: { name?: string; autorizable?: boolean } | null;
          }>
      );
  };

  // Helper: get all repairs for a group of items
  const getGroupRepairs = (groupItems: MaintenanceOrderData['maintenance_order_items']) => {
    return groupItems.flatMap(getRepairsForItem);
  };

  // Get all completed (non-diagnostico) repairs across all sectors - for rejection selection
  const selectableRepairs = useMemo((): SelectableRepair[] => {
    const repairs: SelectableRepair[] = [];
    sectorGroups.forEach((group) => {
      group.items.forEach((item) => {
        const itemRepairs = getRepairsForItem(item);
        itemRepairs.forEach((repair) => {
          if (repair.is_diagnostico) return;
          if (repair.status !== 'completed') return;
          repairs.push({
            repairId: repair.id,
            repairName: String(repair.types_of_repairs?.name || getRepairDisplayName(item)),
            sectorName: group.sectorName,
            status: repair.status,
          });
        });
      });
    });
    return repairs;
  }, [sectorGroups]);

  // Count individual tasks for a group (matches getSectorTasks logic)
  const countGroupTasks = (groupItems: MaintenanceOrderData['maintenance_order_items']) => {
    let total = 0;
    let completed = 0;
    for (const item of groupItems) {
      const repairs = getRepairsForItem(item);
      if (repairs.length > 0) {
        // Case A: OT exists — count each work_order_item_repair
        total += repairs.length;
        completed += repairs.filter((r) => r.status === 'completed').length;
      } else {
        // Case B: No OT — count each pivot M:M entry (or 1 fallback)
        const pivotTypes = item.maintenance_order_item_repair_types?.filter((rt) => rt.types_of_repairs?.name);
        total += pivotTypes && pivotTypes.length > 0 ? pivotTypes.length : 1;
      }
    }
    return { total, completed };
  };

  // Build timeline data
  const timelineData = useMemo((): SectorTimelineItem[] => {
    return sectorGroups.map((group, index) => {
      const { total: totalTasks, completed: completedTasks } = countGroupTasks(group.items);
      const diagItem = group.items.find((i) => i.is_diagnostico);
      const diagRepairs = diagItem ? getRepairsForItem(diagItem) : [];
      const diagCompleted = diagRepairs.some((r) => r.status === 'completed');

      // Check if the work order for this sector is paused
      const woStatus = group.items.find((i) => i.work_orders && !Array.isArray(i.work_orders))?.work_orders;
      const isPaused = woStatus && !Array.isArray(woStatus) && woStatus.status === 'paused';

      let sectorStatus: SectorStatus = 'pending';
      if (completedTasks === totalTasks && totalTasks > 0) {
        sectorStatus = 'completed';
      } else if (isPaused) {
        sectorStatus = 'paused';
      } else if (completedTasks > 0) {
        sectorStatus = 'in_progress';
      } else if (index > 0) {
        const prevGroup = sectorGroups[index - 1];
        const { total: prevTotal, completed: prevCompleted } = countGroupTasks(prevGroup.items);
        if (prevCompleted < prevTotal) {
          sectorStatus = 'blocked';
        }
      }

      return {
        sectorId: group.sectorId,
        sectorName: group.sectorName,
        sequenceOrder: group.sequenceOrder,
        status: sectorStatus,
        totalTasks,
        completedTasks,
        diagnosticoCompleted: diagCompleted,
      };
    });
  }, [sectorGroups]);


  /**
   * Tareas de un item: 1 por reparacion individual.
   *
   * Se extrajo de `getSectorTasks` porque el listado de items del pedido necesita
   * exactamente el mismo desglose (el cliente pidio ver "el estado de cada uno").
   */
  const getItemTasks = (item: MaintenanceOrderData['maintenance_order_items'][number]): TaskInfo[] => {
    const tasks: TaskInfo[] = [];
    const repairs = getRepairsForItem(item);

    if (repairs.length > 0) {
      // Caso A: ya existe la OT — 1 tarea por work_order_item_repair (estado propio)
      repairs.forEach((repair) => {
        tasks.push({
          id: repair.id,
          repairTypeName: repair.is_diagnostico ? 'DIAGNOSTICO' : String(repair.types_of_repairs?.name || 'Sin tipo'),
          description: item.description || undefined,
          status: String(repair.status),
          isDiagnostico: repair.is_diagnostico ?? false,
          isAutorizable: repair.types_of_repairs?.autorizable ?? false,
          isOperatorAdded: repair.is_operator_added ?? false,
        });
      });
      return tasks;
    }

    // Caso B: sin OT — cada tipo de reparacion del item es una tarea pendiente
    const pivotTypes = item.maintenance_order_item_repair_types?.filter((rt) => rt.types_of_repairs?.name);

    if (pivotTypes && pivotTypes.length > 0) {
      pivotTypes.forEach((rt, idx) => {
        tasks.push({
          id: `${item.id}-pivot-${idx}`,
          repairTypeName: item.is_diagnostico ? 'DIAGNOSTICO' : String(rt.types_of_repairs?.name),
          description: item.description || undefined,
          status: 'pending',
          isDiagnostico: item.is_diagnostico ?? false,
          isAutorizable: item.types_of_repairs?.autorizable ?? false,
          isOperatorAdded: false,
        });
      });
      return tasks;
    }

    // FK simple o descripcion libre
    tasks.push({
      id: item.id,
      repairTypeName: item.is_diagnostico
        ? 'DIAGNOSTICO'
        : item.types_of_repairs?.name || item.description || 'Sin tipo',
      description: item.description || undefined,
      status: 'pending',
      isDiagnostico: item.is_diagnostico ?? false,
      isAutorizable: item.types_of_repairs?.autorizable ?? false,
      isOperatorAdded: false,
    });

    return tasks;
  };

  // Build task list for each sector card — 1 task per individual repair
  const getSectorTasks = (group: SectorGroup) => group.items.flatMap(getItemTasks);

  /**
   * Items del pedido con su estado (correccion pedida en la demo del cliente).
   *
   * Antes el detalle solo mostraba las tarjetas por sector y un bloque suelto con
   * todas las fotos juntas: no habia forma de ver QUE se pidio ni como quedo cada
   * item si despues se rechazaba. Ahora cada item trae su estado, sus tareas, el
   * motivo del rechazo si lo hubo y sus propias fotos (ya no van agrupadas).
   */
  const detailItems = useMemo(() => {
    return items.map((item) => {
      const tasks = getItemTasks(item);
      const total = tasks.length;
      const completed = tasks.filter((task) => task.status === 'completed').length;
      const hasStarted = tasks.some((task) => task.status === 'in_progress') || completed > 0;

      // El rechazo pisa cualquier otro estado: es lo que el cliente necesita ver primero.
      let statusKey: 'rejected' | 'completed' | 'in_progress' | 'pending';
      if (item.is_rejected) {
        statusKey = 'rejected';
      } else if (total > 0 && completed === total) {
        statusKey = 'completed';
      } else if (hasStarted) {
        statusKey = 'in_progress';
      } else {
        statusKey = 'pending';
      }

      const sectorName =
        item.workshop_sectors && typeof item.workshop_sectors === 'object' && 'name' in item.workshop_sectors
          ? (item.workshop_sectors.name as string)
          : null;
      const workshopName =
        item.workshops && typeof item.workshops === 'object' && 'name' in item.workshops
          ? (item.workshops.name as string)
          : null;

      return {
        id: item.id,
        label: getRepairItemLabel(item, getRepairDisplayName(item)),
        description: getRepairItemDescription(item),
        images: getRepairItemImages(item),
        // Grupo de tareas de origen: el cliente pidio verlo en TODO listado de items
        groupName: getRepairItemGroupName(item),
        sectorName,
        workshopName,
        isDiagnostico: item.is_diagnostico ?? false,
        rejectionReason: item.is_rejected ? item.rejection_reason ?? null : null,
        statusKey,
        tasks,
        total,
        completed,
      };
    });
  }, [items]);

  // Collect per-item comments using getItemComments (handles dedup within each item)
  const itemsWithComments = useMemo(() => {
    const result: Array<{
      itemLabel: string;
      comments: CommentEntry[];
    }> = [];

    items.forEach((item) => {
      // Skip diagnostico items - they are auto-generated and have no user comments
      if (item.is_diagnostico) return;

      const supervisorFallback =
        order?.maintenance_requests?.profile_maintenance_requests_supervisor_idToprofile?.fullname;
      const comments = getItemComments(item, order?.maintenance_requests?.source, supervisorFallback);
      // Add technician notes from work_order_item_repairs
      const techComments = getTechnicianComments(item);
      const allComments = [...comments, ...techComments];

      if (allComments.length === 0) return;

      // Ticket 592: el título sale del helper compartido, que cubre también los
      // ítems de carga manual (free_text / tipo de reparación) sin desvío asociado
      const itemLabel = getRepairItemLabel(item, getRepairDisplayName(item));

      result.push({ itemLabel, comments: allComments });
    });

    return result;
  }, [items, order?.maintenance_requests?.source]);
  // Get rejected items from last operations rejection (for operations_rejected status)
  const lastOpsRejection = useMemo(() => {
    if (!validationHistory) return null;
    return validationHistory.find((entry) => entry.action_type === 'operations_item_rejected') || null;
  }, [validationHistory]);

  const opsRejectedItems = useMemo(() => {
    if (!lastOpsRejection) return [];
    const metadata = lastOpsRejection.metadata as {
      rejected_items?: Array<{ repair_id: string; repair_name: string; sector_name: string; comment: string }>;
    } | null;
    return metadata?.rejected_items || [];
  }, [lastOpsRejection]);

  return {
    sectorGroups,
    externalWorkshopGroups,
    getRepairsForItem,
    getGroupRepairs,
    countGroupTasks,
    selectableRepairs,
    timelineData,
    getItemTasks,
    getSectorTasks,
    detailItems,
    itemsWithComments,
    opsRejectedItems,
  };
}
