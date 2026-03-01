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
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { getItemComments, type CommentEntry } from '@/features/Mantenimiento/utils/driverInfo';
import { invalidateAllMaintenanceQueries } from '@/features/Mantenimiento/utils/queryInvalidation';
import { PermissionGuard } from '@/features/Permissions/components/PermissionGuard';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Clock, History, MessageSquare, XCircle } from 'lucide-react';
import moment from 'moment';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { MaintenanceOrderData, ValidationHistoryData } from '../actions/actionsServer';
import {
  completeExternalWorkOrder,
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
import { ExternalWorkshopCard } from './ExternalWorkshopCard';
import { SectorCard } from './SectorCard';
import { SectorTimeline, type SectorStatus, type SectorTimelineItem } from './SectorTimeline';

interface OrderDetailDialogProps {
  order: MaintenanceOrderData | null;
  open: boolean;
  onClose: () => void;
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

export function OrderDetailDialog({ order, open, onClose, context = 'workshop' }: OrderDetailDialogProps) {
  const queryClient = useQueryClient();
  const [validationNotes, setValidationNotes] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [showItemRejectDialog, setShowItemRejectDialog] = useState(false);
  const [operationsNotes, setOperationsNotes] = useState('');
  const [operationsRejectionReason, setOperationsRejectionReason] = useState('');
  const [showOperationsRejectDialog, setShowOperationsRejectDialog] = useState(false);
  const [showOpsItemRejectDialog, setShowOpsItemRejectDialog] = useState(false);

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

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  const workshopValidateMutation = useMutation({
    mutationFn: () => workshopChiefValidateOrder(order!.id, validationNotes || undefined),
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
            repairName: String(repair.types_of_repairs?.name || item.description || 'Sin descripcion'),
            sectorName: group.sectorName,
            status: repair.status,
          });
        });
      });
    });
    return repairs;
  }, [sectorGroups]);

  // Build timeline data
  const timelineData = useMemo((): SectorTimelineItem[] => {
    return sectorGroups.map((group, index) => {
      const allRepairs = getGroupRepairs(group.items);

      const totalTasks = allRepairs.length || group.items.length;
      const completedTasks = allRepairs.filter((r) => r.status === 'completed').length;
      const diagItem = group.items.find((i) => i.is_diagnostico);
      const diagRepairs = diagItem ? getRepairsForItem(diagItem) : [];
      const diagCompleted = diagRepairs.some((r) => r.status === 'completed');

      let sectorStatus: SectorStatus = 'pending';
      if (completedTasks === totalTasks && totalTasks > 0) {
        sectorStatus = 'completed';
      } else if (completedTasks > 0) {
        sectorStatus = 'in_progress';
      } else if (index > 0) {
        const prevGroup = sectorGroups[index - 1];
        const prevRepairs = getGroupRepairs(prevGroup.items);
        const prevTotal = prevRepairs.length || prevGroup.items.length;
        const prevCompleted = prevRepairs.filter((r) => r.status === 'completed').length;
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

  // Reset local timeline override when switching to a different order
  useEffect(() => {
    setLocalTimelineData(null);
  }, [order?.id]);

  // Build task list for each sector card
  const getSectorTasks = (group: SectorGroup) => {
    const tasks: Array<{
      id: string;
      repairTypeName: string;
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
        repairs.forEach((repair) => {
          tasks.push({
            id: repair.id,
            repairTypeName: repair.is_diagnostico
              ? 'DIAGNOSTICO'
              : String(repair.types_of_repairs?.name || item.description || 'Sin descripcion'),
            status: String(repair.status),
            isDiagnostico: repair.is_diagnostico ?? false,
            isAutorizable: repair.types_of_repairs?.autorizable ?? false,
            isOperatorAdded: repair.is_operator_added ?? false,
          });
        });
      } else {
        tasks.push({
          id: item.id,
          repairTypeName: item.is_diagnostico
            ? 'DIAGNOSTICO'
            : String(item.types_of_repairs?.name || item.description || 'Sin descripcion'),
          status: 'pending',
          isDiagnostico: item.is_diagnostico ?? false,
          isAutorizable: item.types_of_repairs?.autorizable ?? false,
          isOperatorAdded: false,
        });
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

      const comments = getItemComments(item, order?.maintenance_requests?.source);
      if (comments.length === 0) return;

      // Get a meaningful label for this item (deviation label > repair type > generic)
      const reqItem = item.maintenance_request_items as
        | { checklist_deviations?: { item_label?: string; item_code?: string } | null }
        | null
        | undefined;
      const deviation = reqItem?.checklist_deviations;

      const itemLabel =
        deviation?.item_label || (item.types_of_repairs?.name ? String(item.types_of_repairs.name) : null) || 'Item';

      result.push({ itemLabel, comments });
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

  /** Renders the validation history timeline */
  const renderValidationHistory = (history: ValidationHistoryData) => {
    if (history.length === 0) return null;

    const actionLabels: Record<string, { label: string; icon: typeof CheckCircle2; color: string }> = {
      workshop_approved: { label: 'Aprobado por Jefe de Taller', icon: CheckCircle2, color: 'text-emerald-600' },
      operations_approved: { label: 'Aprobado por Operaciones', icon: CheckCircle2, color: 'text-emerald-600' },
      workshop_item_rejected: { label: 'Items rechazados por Jefe de Taller', icon: XCircle, color: 'text-red-600' },
      operations_item_rejected: { label: 'Items rechazados por Operaciones', icon: XCircle, color: 'text-red-600' },
      workshop_agreed_ops_rejection: {
        label: 'Jefe de Taller de acuerdo con rechazo',
        icon: AlertTriangle,
        color: 'text-amber-600',
      },
      workshop_disagreed_ops_rejection: {
        label: 'Jefe de Taller en desacuerdo con rechazo',
        icon: AlertTriangle,
        color: 'text-amber-600',
      },
      status_change: { label: 'Cambio de estado', icon: Clock, color: 'text-blue-600' },
    };

    return (
      <>
        <Separator />
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <History className="h-4 w-4" />
            Historial de Validaciones
          </h4>
          <div className="space-y-2">
            {history.map((entry) => {
              const config = actionLabels[entry.action_type] || {
                label: entry.action_type,
                icon: Clock,
                color: 'text-muted-foreground',
              };
              const Icon = config.icon;
              const performer = entry.performed_by_profile as { fullname?: string | null } | null;
              const performerName = performer?.fullname || 'Sistema';

              const metadata = entry.metadata as {
                rejected_items?: Array<{ repair_name: string; sector_name: string; comment: string }>;
              } | null;
              const rejectedItems = metadata?.rejected_items || [];

              return (
                <div key={entry.id} className="border rounded-md p-3 text-sm">
                  <div className="flex items-start gap-2">
                    <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${config.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className={`font-medium ${config.color}`}>{config.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {moment(entry.performed_at).format('DD/MM/YYYY HH:mm')}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">por {performerName}</div>
                      {entry.notes && <p className="text-xs mt-1 text-muted-foreground italic">{entry.notes}</p>}
                      {rejectedItems.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {rejectedItems.map((item, idx) => (
                            <div
                              key={idx}
                              className="text-xs bg-destructive/5 border border-destructive/10 rounded px-2 py-1"
                            >
                              <span className="font-medium">{item.repair_name}</span>
                              <span className="text-muted-foreground"> ({item.sector_name})</span>
                              {item.comment && <span className="text-destructive/80"> - {item.comment}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Detalle de Orden
            <Badge variant="outline">{vehicle?.domain || vehicle?.serie || 'Sin patente'}</Badge>
            {vehicle?.vehicle_type?.name && <Badge variant="secondary">{vehicle.vehicle_type.name}</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          <div className="space-y-4 pb-4">
            {/* Info del equipo */}
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">N. Interno:</span>{' '}
                <span className="font-medium">{vehicle?.intern_number || '-'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Ingreso:</span>{' '}
                <span className="font-medium">
                  {order.workshop_entry_date ? moment(order.workshop_entry_date).format('DD/MM/YYYY') : '-'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Km:</span>{' '}
                <span className="font-medium">{String(vehicle?.kilometer || '-')}</span>
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
                    return (
                      <SectorCard
                        key={group.sectorId}
                        sectorName={group.sectorName}
                        sequenceOrder={group.sequenceOrder}
                        status={timelineItem?.status || 'pending'}
                        tasks={getSectorTasks(group)}
                        diagnosticoCompleted={timelineItem?.diagnosticoCompleted || false}
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
                      {group.comments.map((comment, cidx) => (
                        <div
                          key={cidx}
                          className={`text-sm p-2.5 rounded-md ${
                            comment.style === 'driver'
                              ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800'
                              : comment.style === 'validator'
                                ? 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800'
                                : 'bg-muted border'
                          }`}
                        >
                          <span
                            className={`text-xs font-medium ${
                              comment.style === 'driver'
                                ? 'text-amber-700 dark:text-amber-300'
                                : comment.style === 'validator'
                                  ? 'text-blue-700 dark:text-blue-300'
                                  : 'text-muted-foreground'
                            }`}
                          >
                            {comment.label}
                          </span>
                          <p className={`text-sm mt-0.5 ${comment.style !== 'description' ? 'italic' : ''}`}>
                            {comment.text}
                          </p>
                        </div>
                      ))}
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
                              <span className="truncate">
                                {item.types_of_repairs?.name || item.description || 'Sin descripcion'}
                              </span>
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

                    <Textarea
                      placeholder="Notas de validacion (opcional)"
                      value={validationNotes}
                      onChange={(e) => setValidationNotes(e.target.value)}
                      className="mb-3"
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
