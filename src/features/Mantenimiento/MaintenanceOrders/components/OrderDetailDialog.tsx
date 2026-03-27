'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { fetchSupervisorsForChecklist } from '@/features/Checklist/actions/actionsServer';
import { CommentAuthorLine, commentStyleConfig } from '@/features/Mantenimiento/components/ItemComments';
import { getItemComments, getTechnicianComments, type CommentEntry } from '@/features/Mantenimiento/utils/driverInfo';
import { invalidateAllMaintenanceQueries } from '@/features/Mantenimiento/utils/queryInvalidation';
import { PermissionGuard } from '@/features/Permissions/components/PermissionGuard';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Clock,
  HardHat,
  History,
  MessageSquare,
  XCircle,
} from 'lucide-react';
import moment from 'moment';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { MaintenanceOrderData, ValidationHistoryData } from '../actions/actionsServer';
import {
  completeExternalWorkOrder,
  getMaintenanceOrderDetail,
  getValidationHistory,
  operationsRejectItems,
  operationsRejectOrder,
  operationsValidateOrder,
  updateSectorExecutionOrder,
  workshopChiefHandleOperationsRejection,
  workshopChiefRejectItems,
  workshopChiefReturnOrder,
  workshopChiefValidateOrder,
} from '../actions/actionsServer';
import { getRepairDisplayName } from '../utils/repairDisplayName';
import { ExternalWorkshopCard } from './ExternalWorkshopCard';
import { SectorCard } from './SectorCard';
import { SectorTimeline, type SectorStatus, type SectorTimelineItem } from './SectorTimeline';

interface OrderDetailDialogProps {
  /** Pass orderId to fetch full data from server (preferred) */
  orderId?: string | null;
  /** Pass order data directly (legacy — only from MaintenanceOrdersClient that already has full data) */
  order?: MaintenanceOrderData | null;
  open: boolean;
  onClose: () => void;
  /** Called when order data has finished loading (use to dismiss external loading overlays) */
  onLoaded?: () => void;
  /** Controls which validation actions are available:
   * - 'workshop': Workshop chief can validate/return. Operations section is info-only.
   * - 'operations': Operations can validate/reject. Workshop section is hidden.
   */
  context?: 'workshop' | 'operations';
}

interface SectorGroup {
  sectorId: string;
  sectorName: string;
  sequenceOrder: number;
  items: MaintenanceOrderData['maintenance_order_items'];
}

/** Represents a selectable repair item for rejection dialogs */
interface SelectableRepair {
  repairId: string;
  repairName: string;
  sectorName: string;
  status: string;
}

export function OrderDetailDialog({
  orderId: propOrderId,
  order: propOrder,
  open,
  onClose,
  onLoaded,
  context = 'workshop',
}: OrderDetailDialogProps) {
  const queryClient = useQueryClient();
  const [validationNotes, setValidationNotes] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [showItemRejectDialog, setShowItemRejectDialog] = useState(false);
  const [operationsNotes, setOperationsNotes] = useState('');
  const [operationsRejectionReason, setOperationsRejectionReason] = useState('');
  const [showOperationsRejectDialog, setShowOperationsRejectDialog] = useState(false);
  const [showOpsItemRejectDialog, setShowOpsItemRejectDialog] = useState(false);

  // Fetch full order detail — ALWAYS when dialog is open (fresh data from DB)
  const resolvedOrderId = propOrderId ?? propOrder?.id;
  const { data: fetchedOrder, isLoading: isLoadingOrder } = useQuery({
    queryKey: ['maintenance', 'order-detail', resolvedOrderId],
    queryFn: () => getMaintenanceOrderDetail(resolvedOrderId!),
    enabled: !!resolvedOrderId && open,
    staleTime: 30 * 1000,
  });

  // Prioritize fetched data (fresh) over prop data (potentially stale from table cache)
  const order = (fetchedOrder ?? propOrder ?? null) as MaintenanceOrderData | null;

  // Notify parent when data is ready (dismiss loading overlay)
  useEffect(() => {
    if (order && !isLoadingOrder) {
      onLoaded?.();
    }
  }, [order, isLoadingOrder, onLoaded]);

  // Supervisor de operaciones a asignar al validar (Jefe de Taller → Operaciones)
  const [selectedOperationsSupervisorId, setSelectedOperationsSupervisorId] = useState<string | undefined>(undefined);

  // Sync supervisor selection when order data loads
  useEffect(() => {
    if (order?.maintenance_requests && !Array.isArray(order.maintenance_requests)) {
      setSelectedOperationsSupervisorId(order.maintenance_requests.supervisor_id ?? undefined);
    }
  }, [order?.id, order?.maintenance_requests]);

  // Item-level rejection state: { repairId: comment }
  const [selectedRejections, setSelectedRejections] = useState<Record<string, string>>({});

  // Operations rejection handling (agree/disagree)
  const [opsRejectionComment, setOpsRejectionComment] = useState('');

  // Local sector order state for immediate UI updates on reorder
  const [localTimelineData, setLocalTimelineData] = useState<SectorTimelineItem[] | null>(null);

  const vehicle = order?.vehicles;
  const items = order?.maintenance_order_items || [];
  const status = order?.status ?? '';

  // Reset rejection state when dialog opens/closes
  const resetRejectionState = useCallback(() => {
    setSelectedRejections({});
    setOpsRejectionComment('');
  }, []);

  // Validation history query
  const { data: validationHistory } = useQuery({
    queryKey: ['maintenance', 'validation-history', order?.id],
    queryFn: () => (order ? getValidationHistory(order.id) : []),
    enabled: !!order?.id && open,
  });

  // Supervisores de operaciones para el select de validación (Jefe de Taller)
  const { data: operationsSupervisors, isLoading: isLoadingOperationsSupervisors } = useQuery({
    queryKey: ['supervisors-for-checklist'],
    queryFn: () => fetchSupervisorsForChecklist(),
    staleTime: 5 * 60 * 1000,
    enabled: open && context === 'workshop' && status === 'pending_workshop_validation',
  });

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  const workshopValidateMutation = useMutation({
    mutationFn: () =>
      workshopChiefValidateOrder(order!.id, validationNotes || undefined, selectedOperationsSupervisorId || undefined),
    onSuccess: () => {
      toast.success('Orden validada y enviada a operaciones');
      invalidateAllMaintenanceQueries(queryClient);
      setValidationNotes('');
      onClose();
    },
    onError: (error: Error) => {
      toast.error(`Error al validar orden: ${error.message}`);
    },
  });

  const workshopReturnMutation = useMutation({
    mutationFn: () => workshopChiefReturnOrder(order!.id, returnReason),
    onSuccess: () => {
      toast.success('Orden devuelta al taller');
      invalidateAllMaintenanceQueries(queryClient);
      setReturnReason('');
      setShowReturnDialog(false);
      onClose();
    },
    onError: (error: Error) => {
      toast.error(`Error al devolver orden: ${error.message}`);
    },
  });

  const workshopRejectItemsMutation = useMutation({
    mutationFn: (rejections: Array<{ repairId: string; comment: string }>) =>
      workshopChiefRejectItems(order!.id, rejections),
    onSuccess: () => {
      toast.success('Items rechazados y devueltos al operador');
      invalidateAllMaintenanceQueries(queryClient);
      resetRejectionState();
      setShowItemRejectDialog(false);
      onClose();
    },
    onError: (error: Error) => {
      toast.error(`Error al rechazar items: ${error.message}`);
    },
  });

  const completeExternalWOMutation = useMutation({
    mutationFn: (workOrderId: string) => completeExternalWorkOrder(workOrderId),
    onSuccess: () => {
      toast.success('OT externa marcada como completada');
      invalidateAllMaintenanceQueries(queryClient);
    },
    onError: (error: Error) => {
      toast.error(`Error al completar OT externa: ${error.message}`);
    },
  });

  const operationsValidateMutation = useMutation({
    mutationFn: () => operationsValidateOrder(order!.id, operationsNotes || undefined),
    onSuccess: () => {
      toast.success('Orden validada por operaciones. Equipo restaurado a operativo.');
      invalidateAllMaintenanceQueries(queryClient);
      setOperationsNotes('');
      onClose();
    },
    onError: (error: Error) => {
      toast.error(`Error al validar orden: ${error.message}`);
    },
  });

  const operationsRejectMutation = useMutation({
    mutationFn: () => operationsRejectOrder(order!.id, operationsRejectionReason),
    onSuccess: () => {
      toast.success('Orden devuelta a validacion de taller');
      invalidateAllMaintenanceQueries(queryClient);
      setOperationsRejectionReason('');
      setShowOperationsRejectDialog(false);
      onClose();
    },
    onError: (error: Error) => {
      toast.error(`Error al rechazar orden: ${error.message}`);
    },
  });

  const operationsRejectItemsMutation = useMutation({
    mutationFn: (rejections: Array<{ repairId: string; comment: string }>) =>
      operationsRejectItems(order!.id, rejections),
    onSuccess: () => {
      toast.success('Items rechazados por operaciones');
      invalidateAllMaintenanceQueries(queryClient);
      resetRejectionState();
      setShowOpsItemRejectDialog(false);
      onClose();
    },
    onError: (error: Error) => {
      toast.error(`Error al rechazar items: ${error.message}`);
    },
  });

  const handleOpsRejectionMutation = useMutation({
    mutationFn: ({ agree, comment }: { agree: boolean; comment?: string }) =>
      workshopChiefHandleOperationsRejection(order!.id, agree, comment),
    onSuccess: (_data, variables) => {
      toast.success(
        variables.agree
          ? 'Items enviados al operador para correccion'
          : 'Orden devuelta a operaciones para reconsideracion'
      );
      invalidateAllMaintenanceQueries(queryClient);
      setOpsRejectionComment('');
      onClose();
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (sectorOrders: Array<{ sectorId: string; sequenceOrder: number }>) =>
      updateSectorExecutionOrder(order!.id, sectorOrders),
    onSuccess: () => {
      toast.success('Orden de ejecucion actualizado');
      invalidateAllMaintenanceQueries(queryClient);
    },
    onError: (error: Error) => {
      // Revert local state on error
      setLocalTimelineData(null);
      toast.error(`Error al cambiar el orden: ${error.message}`);
    },
  });

  // ============================================================================
  // DATA PROCESSING
  // ============================================================================

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

  // Reset local timeline override cuando cambia la orden
  useEffect(() => {
    setLocalTimelineData(null);
    // Pre-cargar el supervisor actual de la maintenance_request
    const currentSupervisorId =
      order?.maintenance_requests && !Array.isArray(order.maintenance_requests)
        ? order.maintenance_requests.supervisor_id ?? undefined
        : undefined;
    setSelectedOperationsSupervisorId(currentSupervisorId);
  }, [order?.id]);

  // Build task list for each sector card — 1 task per individual repair
  const getSectorTasks = (group: SectorGroup) => {
    const tasks: Array<{
      id: string;
      repairTypeName: string;
      description?: string;
      status: string;
      isDiagnostico: boolean;
      isAutorizable: boolean;
      isOperatorAdded: boolean;
    }> = [];

    group.items.forEach((item) => {
      const wo = item.work_orders;
      const matchingWoItems =
        wo && !Array.isArray(wo)
          ? (wo.work_order_items || []).filter(
              (woi: { maintenance_order_item_id?: string }) => woi.maintenance_order_item_id === item.id
            )
          : [];
      const repairs = matchingWoItems.flatMap(
        (woi: { work_order_item_repairs?: unknown[] }) =>
          (woi.work_order_item_repairs || []) as Array<{
            id: string;
            status: string;
            is_diagnostico?: boolean;
            is_operator_added?: boolean;
            types_of_repairs?: { name?: string; autorizable?: boolean } | null;
          }>
      );

      if (repairs.length > 0) {
        // Case A: OT exists — 1 task per work_order_item_repair (individual status)
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
      } else {
        // Case B: No OT yet — expand each repair type from the item as individual pending tasks
        const pivotTypes = item.maintenance_order_item_repair_types?.filter((rt) => rt.types_of_repairs?.name);

        if (pivotTypes && pivotTypes.length > 0) {
          // M:M pivot: 1 task per repair type
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
        } else {
          // Single FK or description fallback
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
        }
      }
    });

    return tasks;
  };

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

      // Get a meaningful label for this item (deviation label > repair type > generic)
      const reqItem = item.maintenance_request_items as
        | { checklist_deviations?: { item_label?: string; item_code?: string } | null }
        | null
        | undefined;
      const deviation = reqItem?.checklist_deviations;

      const itemLabel = deviation?.item_label || getRepairDisplayName(item);

      result.push({ itemLabel, comments: allComments });
    });

    return result;
  }, [items, order?.maintenance_requests?.source]);

  // ============================================================================
  // REJECTION DIALOG HELPERS
  // ============================================================================

  const toggleRejection = (repairId: string) => {
    setSelectedRejections((prev) => {
      if (repairId in prev) {
        const next = { ...prev };
        delete next[repairId];
        return next;
      }
      return { ...prev, [repairId]: '' };
    });
  };

  const updateRejectionComment = (repairId: string, comment: string) => {
    setSelectedRejections((prev) => ({ ...prev, [repairId]: comment }));
  };

  const selectedCount = Object.keys(selectedRejections).length;
  const allHaveComments = Object.values(selectedRejections).every((c) => c.trim().length > 0);
  const canSubmitRejections = selectedCount > 0 && allHaveComments;

  const buildRejectionPayload = () =>
    Object.entries(selectedRejections).map(([repairId, comment]) => ({ repairId, comment }));

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

  const handleSectorReorder = useCallback(
    (sectorId: string, direction: 'up' | 'down') => {
      // Use current local state if available, otherwise compute from sectorGroups
      const currentTimeline = localTimelineData ?? timelineData;
      // Sort then normalize to guarantee unique sequential values (handles duplicate sequenceOrder)
      const sorted = [...currentTimeline]
        .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
        .map((s, i) => ({ ...s, sequenceOrder: i + 1 }));

      const currentIndex = sorted.findIndex((s) => s.sectorId === sectorId);
      if (currentIndex === -1) return;

      const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (swapIndex < 0 || swapIndex >= sorted.length) return;

      // Build new order by swapping the two sectors' sequence orders
      const newOrders = sorted.map((s, i) => {
        if (i === currentIndex) return { ...s, sequenceOrder: sorted[swapIndex].sequenceOrder };
        if (i === swapIndex) return { ...s, sequenceOrder: sorted[currentIndex].sequenceOrder };
        return s;
      });

      // Apply optimistic update: update local timeline state immediately
      setLocalTimelineData(newOrders);

      // Persist to DB
      reorderMutation.mutate(newOrders.map((s) => ({ sectorId: s.sectorId, sequenceOrder: s.sequenceOrder })));
    },
    [localTimelineData, timelineData, reorderMutation]
  );

  const canReorderSectors = status === 'in_workshop' && context === 'workshop' && sectorGroups.length > 1;

  if (!order) return null;

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  /** Renders the item rejection selector (used by both workshop and operations reject dialogs) */
  const renderItemRejectionSelector = () => {
    // Group selectable repairs by sector
    const bySector = new Map<string, SelectableRepair[]>();
    selectableRepairs.forEach((r) => {
      if (!bySector.has(r.sectorName)) bySector.set(r.sectorName, []);
      bySector.get(r.sectorName)!.push(r);
    });

    if (selectableRepairs.length === 0) {
      return (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No hay items completados disponibles para rechazar.
        </p>
      );
    }

    return (
      <div className="space-y-4 max-h-[50vh] overflow-y-auto">
        {Array.from(bySector.entries()).map(([sectorName, repairs]) => (
          <div key={sectorName}>
            <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{sectorName}</h5>
            <div className="space-y-2">
              {repairs.map((repair) => {
                const isSelected = repair.repairId in selectedRejections;
                return (
                  <div
                    key={repair.repairId}
                    className={`rounded-md border p-3 transition-colors ${isSelected ? 'border-destructive/50 bg-destructive/5' : 'border-border'}`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox checked={isSelected} onCheckedChange={() => toggleRejection(repair.repairId)} />
                      <span className="text-sm font-medium flex-1">{repair.repairName}</span>
                      <Badge variant="success" className="text-[10px]">
                        Completada
                      </Badge>
                    </div>
                    {isSelected && (
                      <Textarea
                        placeholder="Motivo del rechazo (requerido)"
                        value={selectedRejections[repair.repairId]}
                        onChange={(e) => updateRejectionComment(repair.repairId, e.target.value)}
                        className="mt-2 text-sm"
                        rows={2}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  /** Renders the validation history as a vertical timeline with connecting line */
  const renderValidationHistory = (history: ValidationHistoryData) => {
    if (history.length === 0) return null;

    // Action config: label describes the action, role identifies the performer type
    const actionConfig: Record<
      string,
      {
        label: string;
        icon: typeof CheckCircle2;
        color: string;
        dotColor: string;
        role: string;
        roleIcon: typeof HardHat;
      }
    > = {
      workshop_approved: {
        label: 'Aprobacion de Taller',
        icon: CheckCircle2,
        color: 'text-emerald-600',
        dotColor: 'bg-emerald-500',
        role: 'Jefe de Taller',
        roleIcon: HardHat,
      },
      operations_approved: {
        label: 'Aprobacion de Operaciones',
        icon: CheckCircle2,
        color: 'text-emerald-600',
        dotColor: 'bg-emerald-500',
        role: 'Operaciones',
        roleIcon: ClipboardList,
      },
      workshop_item_rejected: {
        label: 'Items rechazados',
        icon: XCircle,
        color: 'text-red-600',
        dotColor: 'bg-red-500',
        role: 'Jefe de Taller',
        roleIcon: HardHat,
      },
      operations_item_rejected: {
        label: 'Items rechazados',
        icon: XCircle,
        color: 'text-red-600',
        dotColor: 'bg-red-500',
        role: 'Operaciones',
        roleIcon: ClipboardList,
      },
      workshop_agreed_ops_rejection: {
        label: 'De acuerdo con rechazo',
        icon: AlertTriangle,
        color: 'text-amber-600',
        dotColor: 'bg-amber-500',
        role: 'Jefe de Taller',
        roleIcon: HardHat,
      },
      workshop_disagreed_ops_rejection: {
        label: 'En desacuerdo con rechazo',
        icon: AlertTriangle,
        color: 'text-amber-600',
        dotColor: 'bg-amber-500',
        role: 'Jefe de Taller',
        roleIcon: HardHat,
      },
      workshop_rejected_all_items: {
        label: 'Todos los items rechazados',
        icon: XCircle,
        color: 'text-red-600',
        dotColor: 'bg-red-500',
        role: 'Jefe de Taller',
        roleIcon: HardHat,
      },
      workshop_restored_from_rejected: {
        label: 'Orden restaurada',
        icon: CheckCircle2,
        color: 'text-emerald-600',
        dotColor: 'bg-emerald-500',
        role: 'Jefe de Taller',
        roleIcon: HardHat,
      },
      status_change: {
        label: 'Cambio de estado',
        icon: Clock,
        color: 'text-blue-600',
        dotColor: 'bg-blue-500',
        role: 'Sistema',
        roleIcon: Clock,
      },
    };

    const defaultConfig = {
      label: 'Evento',
      icon: Clock,
      color: 'text-muted-foreground',
      dotColor: 'bg-muted-foreground',
      role: 'Sistema',
      roleIcon: Clock as typeof HardHat,
    };

    return (
      <>
        <Separator />
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <History className="h-4 w-4" />
            Historial de Validaciones
          </h4>
          {/* Timeline con línea conectora */}
          <div className="relative pl-6">
            {/* Línea vertical conectora */}
            <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border" />

            <div className="space-y-0">
              {history.map((entry, index) => {
                const cfg = actionConfig[entry.action_type] || defaultConfig;
                const Icon = cfg.icon;
                const RoleIcon = cfg.roleIcon;
                const performer = entry.performed_by_profile as { fullname?: string | null } | null;
                const performerName = performer?.fullname || 'Sistema';
                const isLast = index === history.length - 1;

                const metadata = entry.metadata as {
                  rejected_items?: Array<{ repair_name: string; sector_name: string; comment: string }>;
                } | null;
                const rejectedItems = metadata?.rejected_items || [];

                return (
                  <div key={entry.id} className={`relative ${!isLast ? 'pb-4' : ''}`}>
                    {/* Dot en la línea */}
                    <div
                      className={`absolute -left-6 top-2.5 h-[18px] w-[18px] rounded-full border-2 border-background ${cfg.dotColor} flex items-center justify-center`}
                    >
                      <Icon className="h-2.5 w-2.5 text-white" />
                    </div>

                    {/* Contenido del evento */}
                    <div className="border rounded-md p-3 text-sm ml-1">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className={`font-medium ${cfg.color}`}>{cfg.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {moment(entry.performed_at).format('DD/MM/YYYY HH:mm')}
                        </span>
                      </div>

                      {/* Autor: [icono] Nombre [Badge Rol] */}
                      <div className="flex items-center gap-1.5 mt-1">
                        <RoleIcon className={`h-3 w-3 shrink-0 ${cfg.color}`} />
                        <span className="text-xs font-semibold">{performerName}</span>
                        <Badge variant="outline" className={`text-[9px] px-1 py-0 ${cfg.color} border-current/30`}>
                          {cfg.role}
                        </Badge>
                      </div>

                      {entry.notes && <p className="text-xs mt-1.5 text-muted-foreground italic">{entry.notes}</p>}

                      {rejectedItems.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {rejectedItems.map((item, idx) => (
                            <div
                              key={idx}
                              className="text-xs bg-destructive/5 border border-destructive/10 rounded px-2 py-1"
                            >
                              <span className="font-medium">{item.repair_name}</span>
                              <span className="text-muted-foreground"> ({item.sector_name})</span>
                              {item.comment && <span className="text-destructive/80"> &ndash; {item.comment}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </>
    );
  };

  // Loading state when fetching order detail
  if (isLoadingOrder && !propOrder) {
    return (
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm text-muted-foreground">Cargando detalle de orden...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 flex-wrap">
            <span>Detalle de Orden</span>
            {order.order_number && (
              <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded">#{order.order_number}</code>
            )}
            <Badge variant="outline">{vehicle?.domain || vehicle?.serie || 'Sin patente'}</Badge>
            {vehicle?.vehicle_type?.name && <Badge variant="secondary">{vehicle.vehicle_type.name}</Badge>}
            <Badge
              variant={
                status === 'completed'
                  ? 'success'
                  : status === 'in_workshop'
                    ? 'warning'
                    : status === 'operations_rejected' || status === 'workshop_rejected'
                      ? 'destructive'
                      : 'default'
              }
            >
              {status === 'in_workshop'
                ? 'En taller'
                : status === 'pending_workshop_validation'
                  ? 'Pend. validacion taller'
                  : status === 'pending_operations_validation'
                    ? 'Pend. validacion operaciones'
                    : status === 'operations_rejected'
                      ? 'Rechazada por operaciones'
                      : status === 'workshop_rejected'
                        ? 'Rechazada por taller'
                        : status === 'completed'
                          ? 'Completada'
                          : status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          <div className="space-y-4 pb-4">
            {/* Info del equipo */}
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block">N. Interno</span>
                  <span className="font-medium">{vehicle?.intern_number || '-'}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Ingreso a taller</span>
                  <span className="font-medium">
                    {order.workshop_entry_date ? moment(order.workshop_entry_date).format('DD/MM/YYYY') : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Km al ingreso</span>
                  <span className="font-medium">
                    {order.kilometer_at_entry != null ? String(order.kilometer_at_entry) : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Horometro</span>
                  <span className="font-medium">
                    {order.engine_hours_at_entry != null ? `${order.engine_hours_at_entry} hs` : '-'}
                  </span>
                </div>
                {vehicle?.condition && (
                  <div>
                    <span className="text-xs text-muted-foreground block">Condicion</span>
                    <span className="font-medium capitalize">{String(vehicle.condition).replace(/_/g, ' ')}</span>
                  </div>
                )}
                {order.source && (
                  <div>
                    <span className="text-xs text-muted-foreground block">Origen</span>
                    <span className="font-medium capitalize">
                      {order.source === 'checklist'
                        ? 'Checklist'
                        : order.source === 'preventive'
                          ? 'Preventivo'
                          : 'Manual'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Timeline de sectores */}
            <div>
              <h4 className="text-sm font-medium mb-2">
                Secuencia de Sectores
                {canReorderSectors && (
                  <span className="text-xs text-muted-foreground font-normal ml-2">
                    (usa las flechas para cambiar el orden)
                  </span>
                )}
              </h4>
              <SectorTimeline
                sectors={localTimelineData ?? timelineData}
                onReorder={canReorderSectors ? handleSectorReorder : undefined}
                isReordering={reorderMutation.isPending}
              />
            </div>

            <Separator />

            {/* Sector cards */}
            <div className="space-y-3">
              {sectorGroups.length === 0 && externalWorkshopGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No hay sectores asignados a esta orden</p>
              ) : (
                <>
                  {sectorGroups.map((group) => {
                    const timelineItem = timelineData.find((t) => t.sectorId === group.sectorId);
                    // Extract OT info from the first item that has a work_order
                    const woInfo = group.items.find((i) => i.work_orders && !Array.isArray(i.work_orders))?.work_orders;
                    const workOrderNumber =
                      woInfo && typeof woInfo === 'object' && 'order_number' in woInfo
                        ? (woInfo.order_number as string) ?? undefined
                        : undefined;
                    const workOrderStatus =
                      woInfo && typeof woInfo === 'object' && 'status' in woInfo
                        ? (woInfo.status as string) ?? undefined
                        : undefined;
                    return (
                      <SectorCard
                        key={group.sectorId}
                        sectorName={group.sectorName}
                        sequenceOrder={group.sequenceOrder}
                        status={timelineItem?.status || 'pending'}
                        tasks={getSectorTasks(group)}
                        diagnosticoCompleted={timelineItem?.diagnosticoCompleted || false}
                        workOrderNumber={workOrderNumber}
                        workOrderStatus={workOrderStatus}
                      />
                    );
                  })}

                  {/* External workshop cards */}
                  {externalWorkshopGroups.map((group) => (
                    <ExternalWorkshopCard
                      key={group.workshopId}
                      workshopName={group.workshopName}
                      items={group.items}
                      orderStatus={status}
                      readOnly={context === 'operations'}
                      onCompleteWorkOrder={(workOrderId) => completeExternalWOMutation.mutate(workOrderId)}
                      isCompleting={completeExternalWOMutation.isPending}
                    />
                  ))}
                </>
              )}
            </div>

            {/* Comentarios de la solicitud (por item) */}
            {itemsWithComments.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Comentarios de la Solicitud
                  </h4>
                  {itemsWithComments.map((group, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {group.itemLabel}
                      </span>
                      {group.comments.map((comment, cidx) => {
                        const cfg = commentStyleConfig[comment.style];
                        return (
                          <div key={cidx} className={`text-sm p-2.5 rounded-md border ${cfg.container} ${cfg.border}`}>
                            <CommentAuthorLine comment={comment} />
                            <p className={`text-sm mt-0.5 ${comment.style !== 'description' ? 'italic' : ''}`}>
                              {comment.text}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ================================================================ */}
            {/* WORKSHOP VALIDATION - pending_workshop_validation + workshop ctx */}
            {/* ================================================================ */}
            {status === 'pending_workshop_validation' && context === 'workshop' && (
              <>
                <Separator />
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Validacion de Jefe de Taller</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Revisa que todas las ordenes de trabajo esten completadas y los trabajos realizados correctamente.
                    </p>

                    {/* Summary of work orders */}
                    <div className="bg-muted p-3 rounded-md mb-3 text-sm">
                      <div className="font-medium mb-2">Resumen de Ordenes de Trabajo:</div>
                      <div className="space-y-2">
                        {items.map((item) => {
                          const wo = item.work_orders;
                          if (!wo || Array.isArray(wo)) return null;
                          const woStatus = wo.status;
                          const isExternal = !item.assigned_sector_id && !!item.assigned_workshop_id;
                          return (
                            <div key={item.id} className="flex items-center gap-2 text-xs">
                              <Badge
                                variant={
                                  woStatus === 'completed'
                                    ? 'success'
                                    : woStatus === 'completed_partial'
                                      ? 'yellow'
                                      : 'default'
                                }
                                className="text-xs"
                              >
                                {wo.order_number || 'Sin N'}
                              </Badge>
                              {isExternal && (
                                <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-700">
                                  Externo
                                </Badge>
                              )}
                              <span className="truncate">{getRepairDisplayName(item)}</span>
                              <Badge
                                variant={
                                  woStatus === 'completed'
                                    ? 'success'
                                    : woStatus === 'completed_partial'
                                      ? 'yellow'
                                      : woStatus === 'in_progress'
                                        ? 'info'
                                        : 'secondary'
                                }
                                className="text-[10px] ml-auto shrink-0"
                              >
                                {woStatus === 'completed'
                                  ? 'Completada'
                                  : woStatus === 'completed_partial'
                                    ? 'Parcial'
                                    : woStatus === 'in_progress'
                                      ? 'En progreso'
                                      : woStatus === 'pending'
                                        ? 'Pendiente'
                                        : woStatus || 'Sin estado'}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ================================================================ */}
            {/* OPERATIONS VALIDATION                                            */}
            {/* ================================================================ */}
            {status === 'pending_operations_validation' && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Validacion de Operaciones</h4>

                  {order.workshop_validated_at && (
                    <div className="bg-muted p-3 rounded-md text-sm">
                      <div className="font-medium mb-1">Validado por Jefe de Taller</div>
                      <div className="text-xs text-muted-foreground">
                        Fecha: {moment(order.workshop_validated_at).format('DD/MM/YYYY HH:mm')}
                      </div>
                      {order.workshop_validation_notes && (
                        <div className="text-xs mt-1">Notas: {order.workshop_validation_notes}</div>
                      )}
                    </div>
                  )}

                  {context === 'operations' ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Al validar, la orden se cerrara y el equipo volvera a condicion &quot;Operativo&quot;.
                      </p>

                      <Textarea
                        placeholder="Notas de validacion de operaciones (opcional)"
                        value={operationsNotes}
                        onChange={(e) => setOperationsNotes(e.target.value)}
                      />

                      <PermissionGuard module="mantenimiento" tab="seguimiento_taller" action="update">
                        <div className="flex gap-2">
                          <Button
                            onClick={() => operationsValidateMutation.mutate()}
                            disabled={operationsValidateMutation.isPending}
                            className="flex-1"
                          >
                            {operationsValidateMutation.isPending ? 'Validando...' : 'Validar y Cerrar Orden'}
                          </Button>
                          <Button
                            onClick={() => {
                              resetRejectionState();
                              setShowOpsItemRejectDialog(true);
                            }}
                            variant="destructive"
                            disabled={operationsRejectItemsMutation.isPending}
                          >
                            Rechazar Items
                          </Button>
                          <Button
                            onClick={() => setShowOperationsRejectDialog(true)}
                            variant="outline"
                            disabled={operationsRejectMutation.isPending}
                            size="sm"
                          >
                            Rechazar Todo
                          </Button>
                        </div>
                      </PermissionGuard>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Pendiente de validacion por el area de Operaciones.</p>
                  )}
                </div>
              </>
            )}

            {/* ================================================================ */}
            {/* OPERATIONS REJECTED - workshop chief must decide                 */}
            {/* ================================================================ */}
            {status === 'operations_rejected' && context === 'workshop' && (
              <>
                <Separator />
                <div className="space-y-4">
                  <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
                    <h4 className="text-sm font-semibold text-destructive flex items-center gap-2 mb-2">
                      <XCircle className="h-4 w-4" />
                      Items Rechazados por Operaciones
                    </h4>
                    <p className="text-xs text-muted-foreground mb-3">
                      Operaciones rechazo los siguientes items. Decide si estas de acuerdo (se envian al operador para
                      correccion) o en desacuerdo (vuelve a operaciones).
                    </p>

                    {opsRejectedItems.length > 0 ? (
                      <div className="space-y-2 mb-4">
                        {opsRejectedItems.map((item, idx) => (
                          <div key={idx} className="bg-background border rounded-md p-2.5 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{item.repair_name}</span>
                              <Badge variant="outline" className="text-[10px]">
                                {item.sector_name}
                              </Badge>
                            </div>
                            {item.comment && (
                              <p className="text-xs text-muted-foreground mt-1 italic">&quot;{item.comment}&quot;</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground mb-4">No se encontraron detalles del rechazo.</p>
                    )}

                    <Textarea
                      placeholder="Comentario (requerido si no estas de acuerdo)"
                      value={opsRejectionComment}
                      onChange={(e) => setOpsRejectionComment(e.target.value)}
                      className="mb-3"
                    />

                    <PermissionGuard module="mantenimiento" tab="ordenes_mantenimiento" action="update">
                      <div className="flex gap-2">
                        <Button
                          onClick={() =>
                            handleOpsRejectionMutation.mutate({
                              agree: true,
                              comment: opsRejectionComment || undefined,
                            })
                          }
                          disabled={handleOpsRejectionMutation.isPending}
                          variant="destructive"
                          className="flex-1"
                        >
                          {handleOpsRejectionMutation.isPending ? 'Procesando...' : 'De acuerdo - Enviar al operador'}
                        </Button>
                        <Button
                          onClick={() =>
                            handleOpsRejectionMutation.mutate({
                              agree: false,
                              comment: opsRejectionComment,
                            })
                          }
                          disabled={handleOpsRejectionMutation.isPending || !opsRejectionComment.trim()}
                          variant="outline"
                        >
                          No estoy de acuerdo
                        </Button>
                      </div>
                    </PermissionGuard>
                  </div>
                </div>
              </>
            )}

            {/* Operations sees their own rejection status */}
            {status === 'operations_rejected' && context === 'operations' && (
              <>
                <Separator />
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-4">
                  <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4" />
                    Pendiente de revision por Jefe de Taller
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Los items rechazados estan siendo revisados por el jefe de taller.
                  </p>
                </div>
              </>
            )}

            {/* ================================================================ */}
            {/* WORKSHOP REJECTED - show rejected items with reasons             */}
            {/* ================================================================ */}
            {status === 'workshop_rejected' && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
                    <h4 className="text-sm font-semibold text-destructive flex items-center gap-2 mb-2">
                      <XCircle className="h-4 w-4" />
                      Items Rechazados por Taller
                    </h4>
                    <p className="text-xs text-muted-foreground mb-3">
                      El jefe de taller rechazo los siguientes items de esta orden.
                    </p>
                    {(() => {
                      const rejectedItems = items.filter((item) => item.is_rejected);
                      if (rejectedItems.length === 0) {
                        return <p className="text-xs text-muted-foreground">No se encontraron detalles del rechazo.</p>;
                      }
                      return (
                        <div className="space-y-3">
                          {rejectedItems.map((item) => {
                            const reqItem = item.maintenance_request_items as
                              | { checklist_deviations?: { item_label?: string; item_code?: string } | null }
                              | null
                              | undefined;
                            const deviation = reqItem?.checklist_deviations;
                            const itemLabel =
                              deviation?.item_label ||
                              (item.types_of_repairs?.name ? String(item.types_of_repairs.name) : null) ||
                              'Item sin nombre';

                            const sectorName =
                              item.workshop_sectors &&
                              typeof item.workshop_sectors === 'object' &&
                              'name' in item.workshop_sectors
                                ? (item.workshop_sectors.name as string)
                                : null;

                            const itemComments = getItemComments(
                              item,
                              order?.maintenance_requests?.source,
                              order?.maintenance_requests?.profile_maintenance_requests_supervisor_idToprofile?.fullname
                            );

                            // Get rejected_by profile name
                            const rejectedByProfile = (item as Record<string, unknown>)?.rejected_by_profile as {
                              fullname?: string | null;
                            } | null;
                            const rejectedByName = rejectedByProfile?.fullname || null;

                            return (
                              <div key={item.id} className="bg-background border rounded-md p-3 text-sm space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{itemLabel}</span>
                                  {sectorName && (
                                    <Badge variant="outline" className="text-[10px]">
                                      {sectorName}
                                    </Badge>
                                  )}
                                </div>

                                {itemComments.length > 0 && (
                                  <div className="space-y-1">
                                    {itemComments.map((comment, cidx) => {
                                      const cfg = commentStyleConfig[comment.style];
                                      return (
                                        <div
                                          key={cidx}
                                          className={`text-xs p-2 rounded border ${cfg.container} ${cfg.border}`}
                                        >
                                          <CommentAuthorLine comment={comment} size="xs" />
                                          <span
                                            className={`mt-0.5 block ${comment.style !== 'description' ? 'italic' : ''}`}
                                          >
                                            {comment.text}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {item.rejection_reason && (
                                  <div className="bg-destructive/5 border border-destructive/10 rounded px-2.5 py-2 text-xs space-y-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-medium text-destructive">Motivo del rechazo:</span>
                                    </div>
                                    {rejectedByName && (
                                      <div className="flex items-center gap-1.5">
                                        <HardHat className="h-3 w-3 shrink-0 text-destructive" />
                                        <span className="font-semibold text-destructive">{rejectedByName}</span>
                                        <Badge
                                          variant="outline"
                                          className="text-[9px] px-1 py-0 border-destructive/30 text-destructive"
                                        >
                                          Jefe de Taller
                                        </Badge>
                                      </div>
                                    )}
                                    <p className="italic">{item.rejection_reason}</p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </>
            )}

            {/* ================================================================ */}
            {/* COMPLETED - basic validation info                                */}
            {/* ================================================================ */}
            {status === 'completed' && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Informacion de Cierre</h4>

                  {order.workshop_validated_at && (
                    <div className="bg-muted p-3 rounded-md text-sm">
                      <div className="font-medium mb-1">Validado por Jefe de Taller</div>
                      <div className="text-xs text-muted-foreground">
                        Fecha: {moment(order.workshop_validated_at).format('DD/MM/YYYY HH:mm')}
                      </div>
                      {order.workshop_validation_notes && (
                        <div className="text-xs mt-1">Notas: {order.workshop_validation_notes}</div>
                      )}
                    </div>
                  )}

                  {order.operations_validated_at && (
                    <div className="bg-muted p-3 rounded-md text-sm">
                      <div className="font-medium mb-1">Validado por Operaciones</div>
                      <div className="text-xs text-muted-foreground">
                        Fecha: {moment(order.operations_validated_at).format('DD/MM/YYYY HH:mm')}
                      </div>
                      {order.operations_validation_notes && (
                        <div className="text-xs mt-1">Notas: {order.operations_validation_notes}</div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ================================================================ */}
            {/* VALIDATION HISTORY TIMELINE                                      */}
            {/* ================================================================ */}
            {validationHistory && validationHistory.length > 0 && renderValidationHistory(validationHistory)}
          </div>
        </div>

        {/* Footer fijo: Supervisor de Operaciones (solo en pending_workshop_validation + workshop) */}
        {status === 'pending_workshop_validation' && context === 'workshop' && (
          <div className="border-t pt-4 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="ops-supervisor-select">Supervisor de Operaciones que validará</Label>
              {isLoadingOperationsSupervisors ? (
                <div className="text-sm text-muted-foreground">Cargando supervisores...</div>
              ) : (
                <Select
                  value={selectedOperationsSupervisorId}
                  onValueChange={setSelectedOperationsSupervisorId}
                  disabled={workshopValidateMutation.isPending}
                >
                  <SelectTrigger id="ops-supervisor-select">
                    <SelectValue placeholder="Seleccionar supervisor de operaciones..." />
                  </SelectTrigger>
                  <SelectContent>
                    {operationsSupervisors && operationsSupervisors.length > 0 ? (
                      operationsSupervisors.map((supervisor) => (
                        <SelectItem key={supervisor.id} value={supervisor.id} disabled={!supervisor.isAvailable}>
                          <div className="flex items-center gap-2">
                            <span>{supervisor.fullName}</span>
                            {!supervisor.hasLinkedEmployee && (
                              <Badge variant="outline" className="text-[10px]">
                                Sin empleado vinculado
                              </Badge>
                            )}
                            {supervisor.hasLinkedEmployee && !supervisor.hasActiveDiagram && (
                              <Badge variant="warning" className="text-[10px]">
                                Sin diagrama activo
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="__none__" disabled>
                        No hay supervisores disponibles
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>

            <Textarea
              placeholder="Notas de validacion (opcional)"
              value={validationNotes}
              onChange={(e) => setValidationNotes(e.target.value)}
            />

            <PermissionGuard module="mantenimiento" tab="ordenes_mantenimiento" action="update">
              <div className="flex gap-2">
                <Button
                  onClick={() => workshopValidateMutation.mutate()}
                  disabled={workshopValidateMutation.isPending}
                  className="flex-1"
                >
                  {workshopValidateMutation.isPending ? 'Validando...' : 'Validar y Enviar a Operaciones'}
                </Button>
                <Button
                  onClick={() => {
                    resetRejectionState();
                    setShowItemRejectDialog(true);
                  }}
                  variant="destructive"
                  disabled={workshopRejectItemsMutation.isPending}
                >
                  Rechazar Items
                </Button>
                <Button
                  onClick={() => setShowReturnDialog(true)}
                  variant="outline"
                  disabled={workshopReturnMutation.isPending}
                  size="sm"
                >
                  Devolver Todo
                </Button>
              </div>
            </PermissionGuard>
          </div>
        )}
      </DialogContent>

      {/* ================================================================ */}
      {/* WORKSHOP: Item-level rejection dialog                            */}
      {/* ================================================================ */}
      <AlertDialog open={showItemRejectDialog} onOpenChange={setShowItemRejectDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Rechazar Items Especificos</AlertDialogTitle>
            <AlertDialogDescription>
              Selecciona los items que no fueron realizados correctamente. Cada item requiere un comentario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {renderItemRejectionSelector()}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={resetRejectionState}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => workshopRejectItemsMutation.mutate(buildRejectionPayload())}
              disabled={!canSubmitRejections || workshopRejectItemsMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {workshopRejectItemsMutation.isPending
                ? 'Rechazando...'
                : `Rechazar ${selectedCount} item${selectedCount !== 1 ? 's' : ''}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ================================================================ */}
      {/* WORKSHOP: Bulk return dialog (legacy)                            */}
      {/* ================================================================ */}
      <AlertDialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Devolver Orden Completa al Taller</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion reabrira todas las ordenes de trabajo completadas. Indica el motivo:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Motivo de devolucion (requerido)"
            value={returnReason}
            onChange={(e) => setReturnReason(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setReturnReason('')}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => workshopReturnMutation.mutate()}
              disabled={!returnReason.trim() || workshopReturnMutation.isPending}
            >
              {workshopReturnMutation.isPending ? 'Devolviendo...' : 'Devolver Todo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ================================================================ */}
      {/* OPERATIONS: Item-level rejection dialog                          */}
      {/* ================================================================ */}
      <AlertDialog open={showOpsItemRejectDialog} onOpenChange={setShowOpsItemRejectDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Rechazar Items Especificos</AlertDialogTitle>
            <AlertDialogDescription>
              Selecciona los items que no cumplen con los requisitos. El jefe de taller decidira como proceder.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {renderItemRejectionSelector()}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={resetRejectionState}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => operationsRejectItemsMutation.mutate(buildRejectionPayload())}
              disabled={!canSubmitRejections || operationsRejectItemsMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {operationsRejectItemsMutation.isPending
                ? 'Rechazando...'
                : `Rechazar ${selectedCount} item${selectedCount !== 1 ? 's' : ''}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ================================================================ */}
      {/* OPERATIONS: Bulk reject dialog (legacy)                          */}
      {/* ================================================================ */}
      <AlertDialog open={showOperationsRejectDialog} onOpenChange={setShowOperationsRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rechazar Orden Completa</AlertDialogTitle>
            <AlertDialogDescription>
              La orden volvera al estado de validacion de taller. Indica el motivo:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Motivo de rechazo (requerido)"
            value={operationsRejectionReason}
            onChange={(e) => setOperationsRejectionReason(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOperationsRejectionReason('')}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => operationsRejectMutation.mutate()}
              disabled={!operationsRejectionReason.trim() || operationsRejectMutation.isPending}
            >
              {operationsRejectMutation.isPending ? 'Rechazando...' : 'Rechazar Todo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
