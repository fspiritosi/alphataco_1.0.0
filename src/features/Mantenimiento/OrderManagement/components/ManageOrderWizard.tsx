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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  getResourceInternNumber,
  getResourceKind,
  getResourceKindLabel,
  getResourceLabel,
} from '@/features/Mantenimiento/shared/maintenance-resource';
import { invalidateAllMaintenanceQueries } from '@/features/Mantenimiento/utils/queryInvalidation';
import { PermissionGuard } from '@/features/Permissions/components/PermissionGuard';
import { Logger } from '@/lib/logger';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, ClipboardList, Loader2, Save } from 'lucide-react';
import moment from 'moment';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { getOrderForManagement, type ExternalWorkshop, type OrderManagementItem, type WorkshopSector } from '../actions/queries.server';
import { saveOrderChanges, type OrderChangeSet } from '../actions/items.server';
import { setupAndGenerateWorkOrders } from '../actions/work-orders.server';
import { AddItemDialog } from './AddItemDialog';
import { AssignRepairTypesDialog } from './AssignRepairTypesDialog';
import { Step1Tasks } from './wizard/Step1Tasks';
import { Step2SectorAssignment } from './wizard/Step2SectorAssignment';
import { Step3ExecutionOrder, type SectorOrderEntry } from './wizard/Step3ExecutionOrder';
import { Step4Confirm } from './wizard/Step4Confirm';
import { WizardStepIndicator } from './wizard/WizardStepIndicator';

const logger = new Logger('ManageOrderWizard');

type OrderItem = OrderManagementItem['maintenance_order_items'][number];

// Exportar el tipo para que los steps lo usen
export interface LocalItem {
  id: string;
  description: string | null;
  is_diagnostico: boolean;
  maintenance_request_item_id: string | null;
  repair_type_id: string | null;
  assigned_sector_id: string | null;
  assigned_workshop_id: string | null;
  sector_sequence_order: number | null;
  types_of_repairs: OrderItem['types_of_repairs'];
  maintenance_order_item_repair_types: OrderItem['maintenance_order_item_repair_types'];
  maintenance_request_items: OrderItem['maintenance_request_items'];
  workshop_sectors: OrderItem['workshop_sectors'];
  /**
   * Fotos que cargo el supervisor (ticket 592). Sin esto el wizard no las
   * arrastraba al estado local y el jefe de taller decidia el sector a ciegas.
   */
  images: OrderItem['images'];
  /** Grupo de reparaciones del que salio el item, para mostrarlo en los listados */
  maintenance_request_groups: OrderItem['maintenance_request_groups'];
  work_order_id: string | null;
  workshop_chief_comment: string | null;
  _isTemp?: boolean;
  _tempRepairTypeIds?: string[];
  _deleted?: boolean;
  _rejected?: boolean;
  _rejectionReason?: string;
}

interface ManageOrderWizardProps {
  order: OrderManagementItem | null;
  open: boolean;
  onClose: () => void;
  sectors: WorkshopSector[];
  repairTypes: Array<{ id: string; name: string }>;
  externalWorkshops: ExternalWorkshop[];
}

export function ManageOrderWizard({
  order,
  open,
  onClose,
  sectors,
  repairTypes,
  externalWorkshops,
}: ManageOrderWizardProps) {
  const queryClient = useQueryClient();

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingStep, setIsSavingStep] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Step 1: Items
  const [localItems, setLocalItems] = useState<LocalItem[]>([]);
  const [pendingChanges, setPendingChanges] = useState<OrderChangeSet>({
    deletes: [],
    adds: [],
    sectorAssignments: [],
    repairTypeUpdates: [],
    sequenceUpdates: [],
    descriptionUpdates: [],
    chiefCommentUpdates: [],
    workshopAssignments: [],
  });
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [editingRepairTypesItem, setEditingRepairTypesItem] = useState<LocalItem | null>(null);

  // Step 2: Sector assignments
  const [sectorAssignments, setSectorAssignments] = useState<Map<string, string>>(new Map());

  // Step 3: Sector order
  const [sectorOrder, setSectorOrder] = useState<SectorOrderEntry[]>([]);

  // Step 4: Dates
  const [plannedStartDate, setPlannedStartDate] = useState(moment().format('YYYY-MM-DD'));
  const [plannedEndDate, setPlannedEndDate] = useState(moment().add(7, 'days').format('YYYY-MM-DD'));

  // ─── Sync when dialog opens ───────────────────────────────
  useEffect(() => {
    if (order && open) {
      const items = order.maintenance_order_items || [];
      const mapped = items.map((item) => ({
        id: item.id,
        description: item.description,
        is_diagnostico: item.is_diagnostico,
        maintenance_request_item_id: item.maintenance_request_item_id,
        repair_type_id: item.repair_type_id,
        assigned_sector_id: item.assigned_sector_id,
        assigned_workshop_id: item.assigned_workshop_id,
        sector_sequence_order: item.sector_sequence_order,
        types_of_repairs: item.types_of_repairs,
        maintenance_order_item_repair_types: item.maintenance_order_item_repair_types,
        maintenance_request_items: item.maintenance_request_items,
        workshop_sectors: item.workshop_sectors,
        images: item.images,
        maintenance_request_groups: item.maintenance_request_groups,
        work_order_id: item.work_order_id,
        workshop_chief_comment: item.workshop_chief_comment,
        _rejected: item.is_rejected || false,
        _rejectionReason: item.rejection_reason || undefined,
      }));
      setLocalItems(mapped);
      setPendingChanges({
        deletes: [],
        adds: [],
        sectorAssignments: [],
        repairTypeUpdates: [],
        sequenceUpdates: [],
        descriptionUpdates: [],
        chiefCommentUpdates: [],
        workshopAssignments: [],
      });
      setSectorAssignments(new Map());
      setSectorOrder([]);
      setPlannedStartDate(moment().format('YYYY-MM-DD'));
      setPlannedEndDate(moment().add(7, 'days').format('YYYY-MM-DD'));

      // Calculate initial step based on item data
      const eligible = mapped.filter((i) => !i.is_diagnostico && !i.work_order_id && !i._rejected);

      if (eligible.length === 0) {
        setCurrentStep(1);
        return;
      }

      // Step 1 complete? All items have at least 1 repair type
      const allHaveRepairTypes = eligible.every((item) => {
        const pivotTypes = item.maintenance_order_item_repair_types || [];
        return pivotTypes.length > 0 || !!item.types_of_repairs;
      });
      if (!allHaveRepairTypes) {
        setCurrentStep(1);
        return;
      }

      // Step 2 complete? All items have a sector assigned
      const allHaveSectors = eligible.every((item) => !!item.assigned_sector_id);
      if (!allHaveSectors) {
        setCurrentStep(2);
        return;
      }

      // Steps 3+: pre-build sector order from existing item data
      // Calculate max sequence order from items that already have OTs
      const maxExistingSeq = mapped
        .filter((i) => !i.is_diagnostico && i.work_order_id && i.sector_sequence_order !== null)
        .reduce((max, i) => Math.max(max, i.sector_sequence_order!), 0);

      const sectorIds = new Set<string>();
      for (const item of eligible) {
        if (item.assigned_sector_id) sectorIds.add(item.assigned_sector_id);
      }
      const prebuiltOrder: SectorOrderEntry[] = Array.from(sectorIds).map((sectorId, index) => {
        const sector = sectors.find((s) => s.id === sectorId);
        const itemWithSeq = eligible.find((i) => i.assigned_sector_id === sectorId && i.sector_sequence_order !== null);
        return {
          sectorId,
          sectorName: sector?.name || 'Desconocido',
          sequenceOrder: itemWithSeq?.sector_sequence_order ?? maxExistingSeq + index + 1,
          itemCount: 0,
        };
      });
      prebuiltOrder.sort((a, b) => a.sequenceOrder - b.sequenceOrder);
      // Re-normalize starting from after existing OT sequence orders
      prebuiltOrder.forEach((entry, idx) => {
        entry.sequenceOrder = maxExistingSeq + idx + 1;
      });
      setSectorOrder(prebuiltOrder);

      // Step 3 complete? All items have sector_sequence_order
      const allHaveSequence = eligible.every((item) => item.sector_sequence_order !== null);
      if (!allHaveSequence) {
        setCurrentStep(3);
        return;
      }

      // Everything is set → step 4
      setCurrentStep(4);
    }
  }, [order, open]);

  // ─── Derived state ────────────────────────────────────────

  const regularItems = useMemo(() => localItems.filter((item) => !item.is_diagnostico && !item._deleted), [localItems]);

  const eligibleItems = useMemo(
    () => regularItems.filter((item) => !item.work_order_id && !item._rejected),
    [regularItems]
  );

  const rejectedItems = useMemo(() => regularItems.filter((item) => item._rejected), [regularItems]);

  // All non-OT items are rejected → allow saving rejections directly
  const allItemsRejected = useMemo(
    () => eligibleItems.length === 0 && rejectedItems.length > 0,
    [eligibleItems, rejectedItems]
  );

  // Ticket 596: el pedido puede ser de un vehiculo o de un equipamiento, y el
  // encabezado tiene que identificar bien a cualquiera de los dos.
  const resource = { vehicles: order?.vehicles ?? null, other_equipment: order?.other_equipment ?? null };
  const isOtherEquipment = getResourceKind(resource) === 'other_equipment';
  const resourceInternNumber = getResourceInternNumber(resource);
  const resourceTypeName = order?.other_equipment?.type?.name ?? order?.vehicles?.vehicle_type?.name ?? null;

  // ─── Step 1 handlers ──────────────────────────────────────

  const handleAddItem = useCallback((description: string, repairTypeIds: string[]) => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const newItem: LocalItem = {
      id: tempId,
      description,
      is_diagnostico: false,
      maintenance_request_item_id: null,
      repair_type_id: repairTypeIds[0] || null,
      assigned_sector_id: null,
      assigned_workshop_id: null,
      sector_sequence_order: null,
      types_of_repairs: null,
      maintenance_order_item_repair_types: [],
      maintenance_request_items: null,
      workshop_sectors: null,
      // Un item creado a mano en el wizard todavia no tiene fotos ni grupo
      images: [],
      maintenance_request_groups: null,
      work_order_id: null,
      workshop_chief_comment: null,
      _isTemp: true,
      _tempRepairTypeIds: repairTypeIds,
    };

    setLocalItems((prev) => [...prev, newItem]);
    setPendingChanges((prev) => ({
      ...prev,
      adds: [...prev.adds, { description, repairTypeIds }],
    }));
    toast.info('Item agregado');
  }, []);

  const handleDeleteItem = useCallback(
    (itemId: string) => {
      const item = localItems.find((i) => i.id === itemId);
      if (!item) return;

      if (item._isTemp) {
        setLocalItems((prev) => prev.filter((i) => i.id !== itemId));
        setPendingChanges((prev) => ({
          ...prev,
          adds: prev.adds.filter((a) => a.description !== item.description),
        }));
        return;
      }

      if (item.maintenance_request_item_id) {
        toast.error('No se puede eliminar un item que proviene de una solicitud');
        return;
      }

      setLocalItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, _deleted: true } : i)));
      setPendingChanges((prev) => ({
        ...prev,
        deletes: [...prev.deletes, itemId],
      }));
      toast.info('Item eliminado');
    },
    [localItems]
  );

  const handleRejectItem = useCallback((itemId: string, reason: string) => {
    setLocalItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, _rejected: true, _rejectionReason: reason } : i))
    );
    setPendingChanges((prev) => ({
      ...prev,
      rejections: [...(prev.rejections || []), { itemId, reason }],
    }));
    toast.info('Item rechazado');
  }, []);

  const handleRestoreItem = useCallback((itemId: string) => {
    setLocalItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, _rejected: false, _rejectionReason: undefined } : i))
    );
    setPendingChanges((prev) => {
      const updatedRejections = (prev.rejections || []).filter((r) => r.itemId !== itemId);
      // If restoring an item that was already rejected in DB (not a pending rejection), track as restoration
      const wasPendingRejection = (prev.rejections || []).some((r) => r.itemId === itemId);
      const updatedRestorations = wasPendingRejection
        ? prev.restorations || []
        : [...(prev.restorations || []), itemId];
      return { ...prev, rejections: updatedRejections, restorations: updatedRestorations };
    });
    toast.info('Item restaurado');
  }, []);

  const handleUpdateRepairTypes = useCallback(
    (itemId: string, repairTypeIds: string[]) => {
      const item = localItems.find((i) => i.id === itemId);
      if (!item) return;

      if (item._isTemp) {
        setLocalItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, _tempRepairTypeIds: repairTypeIds } : i)));
        setPendingChanges((prev) => ({
          ...prev,
          adds: prev.adds.map((a) => (a.description === item.description ? { ...a, repairTypeIds } : a)),
        }));
      } else {
        const repairTypeObjs = repairTypeIds
          .map((rtId) => {
            const rt = repairTypes.find((r) => r.id === rtId);
            return rt
              ? {
                  id: '',
                  maintenance_order_item_id: itemId,
                  created_at: null,
                  repair_type_id: rtId,
                  types_of_repairs: { id: rt.id, name: rt.name, autorizable: false },
                }
              : null;
          })
          .filter((r): r is NonNullable<typeof r> => r !== null);

        setLocalItems((prev) =>
          prev.map((i) =>
            i.id === itemId
              ? { ...i, repair_type_id: repairTypeIds[0] || null, maintenance_order_item_repair_types: repairTypeObjs }
              : i
          )
        );

        setPendingChanges((prev) => {
          const existing = prev.repairTypeUpdates.findIndex((u) => u.itemId === itemId);
          const updated = [...prev.repairTypeUpdates];
          if (existing >= 0) {
            updated[existing] = { itemId, repairTypeIds };
          } else {
            updated.push({ itemId, repairTypeIds });
          }
          return { ...prev, repairTypeUpdates: updated };
        });
      }
      toast.info('Tipos de reparacion actualizados');
    },
    [localItems, repairTypes]
  );

  const handleDescriptionChange = useCallback((itemId: string, newDescription: string) => {
    setLocalItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, description: newDescription } : i)));

    setPendingChanges((prev) => {
      const existing = prev.descriptionUpdates.findIndex((u) => u.itemId === itemId);
      const updated = [...prev.descriptionUpdates];
      if (existing >= 0) {
        updated[existing] = { itemId, description: newDescription };
      } else {
        updated.push({ itemId, description: newDescription });
      }
      return { ...prev, descriptionUpdates: updated };
    });
  }, []);

  const handleChiefCommentChange = useCallback((itemId: string, comment: string) => {
    setLocalItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, workshop_chief_comment: comment } : i)));

    setPendingChanges((prev) => {
      const existing = prev.chiefCommentUpdates.findIndex((u) => u.itemId === itemId);
      const updated = [...prev.chiefCommentUpdates];
      if (existing >= 0) {
        updated[existing] = { itemId, comment };
      } else {
        updated.push({ itemId, comment });
      }
      return { ...prev, chiefCommentUpdates: updated };
    });
  }, []);

  // ─── Step 2 handlers ──────────────────────────────────────

  const handleAssignmentChange = useCallback((itemId: string, sectorId: string) => {
    setSectorAssignments((prev) => {
      const next = new Map(prev);
      next.set(itemId, sectorId);
      return next;
    });
  }, []);

  const handleBatchAssignment = useCallback((assignments: Map<string, string>) => {
    setSectorAssignments(assignments);
  }, []);

  // ─── Step 3: Build sector order from assignments ──────────

  // Max sequence order from items that already have work orders (already generated OTs)
  const maxExistingSequenceOrder = useMemo(() => {
    return localItems
      .filter(
        (item) => !item.is_diagnostico && !item._deleted && item.work_order_id && item.sector_sequence_order !== null
      )
      .reduce((max, item) => Math.max(max, item.sector_sequence_order!), 0);
  }, [localItems]);

  // When entering step 3, compute sector order from step 2 assignments
  const buildSectorOrder = useCallback(() => {
    const sectorIds = new Set<string>();

    for (const item of eligibleItems) {
      const assignedSector = sectorAssignments.get(item.id) || item.assigned_sector_id;
      if (assignedSector) {
        sectorIds.add(assignedSector);
      }
    }

    const newOrder: SectorOrderEntry[] = Array.from(sectorIds).map((sectorId, index) => {
      const sector = sectors.find((s) => s.id === sectorId);
      // Check existing local order state
      const existing = sectorOrder.find((so) => so.sectorId === sectorId);
      // Fallback: read sector_sequence_order from any item already assigned to this sector in DB
      const itemWithSequence = eligibleItems.find(
        (item) =>
          (sectorAssignments.get(item.id) || item.assigned_sector_id) === sectorId &&
          item.sector_sequence_order !== null
      );
      return {
        sectorId,
        sectorName: sector?.name || 'Desconocido',
        sequenceOrder:
          existing?.sequenceOrder ?? itemWithSequence?.sector_sequence_order ?? maxExistingSequenceOrder + index + 1,
        itemCount: 0, // Will be computed in display
      };
    });

    // Sort by existing sequence order
    newOrder.sort((a, b) => a.sequenceOrder - b.sequenceOrder);
    // Re-normalize: continue from the last existing OT sequence order
    newOrder.forEach((entry, idx) => {
      entry.sequenceOrder = maxExistingSequenceOrder + idx + 1;
    });

    setSectorOrder(newOrder);
  }, [eligibleItems, sectorAssignments, sectors, sectorOrder, maxExistingSequenceOrder]);

  const handleReorder = useCallback((sectorId: string, direction: 'up' | 'down') => {
    setSectorOrder((prev) => {
      const sorted = [...prev].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
      const index = sorted.findIndex((s) => s.sectorId === sectorId);
      if (index < 0) return prev;

      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= sorted.length) return prev;

      // Swap sequence orders
      const tempSeq = sorted[index].sequenceOrder;
      sorted[index] = { ...sorted[index], sequenceOrder: sorted[swapIndex].sequenceOrder };
      sorted[swapIndex] = { ...sorted[swapIndex], sequenceOrder: tempSeq };

      return sorted;
    });
  }, []);

  const handleDragReorder = useCallback((reordered: SectorOrderEntry[]) => {
    setSectorOrder(reordered);
  }, []);

  // ─── Validation ───────────────────────────────────────────

  const canAdvanceFromStep1 = useMemo(() => {
    if (eligibleItems.length === 0) return false;
    // All items must have at least 1 repair type
    return eligibleItems.every((item) => {
      if (item._isTemp && item._tempRepairTypeIds) {
        return item._tempRepairTypeIds.length > 0;
      }
      const pivotTypes = item.maintenance_order_item_repair_types || [];
      return pivotTypes.length > 0 || !!item.types_of_repairs;
    });
  }, [eligibleItems]);

  const canAdvanceFromStep2 = useMemo(() => {
    // All eligible items must have a sector assigned
    return eligibleItems.every((item) => {
      return sectorAssignments.has(item.id) || !!item.assigned_sector_id;
    });
  }, [eligibleItems, sectorAssignments]);

  const canGenerate = useMemo(() => {
    if (sectorOrder.length === 0) return false;
    if (!plannedStartDate || !plannedEndDate) return false;
    if (moment(plannedEndDate).isBefore(moment(plannedStartDate))) return false;
    return true;
  }, [sectorOrder, plannedStartDate, plannedEndDate]);

  // ─── Helpers ─────────────────────────────────────────────

  const emptyChanges: OrderChangeSet = {
    deletes: [],
    adds: [],
    sectorAssignments: [],
    repairTypeUpdates: [],
    sequenceUpdates: [],
    descriptionUpdates: [],
    chiefCommentUpdates: [],
    workshopAssignments: [],
    rejections: [],
    restorations: [],
  };

  const hasStep1Changes = useMemo(() => {
    const c = pendingChanges;
    return (
      c.adds.length > 0 ||
      c.deletes.length > 0 ||
      c.repairTypeUpdates.length > 0 ||
      c.descriptionUpdates.length > 0 ||
      c.chiefCommentUpdates.length > 0 ||
      (c.rejections || []).length > 0 ||
      (c.restorations || []).length > 0
    );
  }, [pendingChanges]);

  const refreshFromServer = useCallback(
    async (orderId: string) => {
      const freshOrder = await getOrderForManagement(orderId);
      if (!freshOrder) return;
      const items = freshOrder.maintenance_order_items || [];
      setLocalItems(
        items.map((item) => ({
          id: item.id,
          description: item.description,
          is_diagnostico: item.is_diagnostico,
          maintenance_request_item_id: item.maintenance_request_item_id,
          repair_type_id: item.repair_type_id,
          assigned_sector_id: item.assigned_sector_id,
          assigned_workshop_id: item.assigned_workshop_id,
          sector_sequence_order: item.sector_sequence_order,
          types_of_repairs: item.types_of_repairs,
          maintenance_order_item_repair_types: item.maintenance_order_item_repair_types,
          maintenance_request_items: item.maintenance_request_items,
          workshop_sectors: item.workshop_sectors,
          images: item.images,
          maintenance_request_groups: item.maintenance_request_groups,
          work_order_id: item.work_order_id,
          workshop_chief_comment: item.workshop_chief_comment,
          _rejected: item.is_rejected || false,
          _rejectionReason: item.rejection_reason || undefined,
        }))
      );
      setPendingChanges({ ...emptyChanges });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ─── Navigation ───────────────────────────────────────────

  const handleNext = async () => {
    if (!order) return;

    if (currentStep === 1 && !canAdvanceFromStep1) {
      if (eligibleItems.length === 0) {
        toast.error('Agregue al menos un nuevo item para continuar');
      } else {
        toast.error('Todos los items deben tener al menos un tipo de reparacion asignado');
      }
      return;
    }
    if (currentStep === 2 && !canAdvanceFromStep2) {
      toast.error('Todos los items deben tener un sector asignado');
      return;
    }

    // Save Step 1 changes to DB before advancing
    if (currentStep === 1 && hasStep1Changes) {
      try {
        setIsSavingStep(true);
        await saveOrderChanges(order.id, pendingChanges);
        await refreshFromServer(order.id);
        invalidateAllMaintenanceQueries(queryClient);
      } catch (error) {
        logger.error('Error guardando cambios del paso 1', { data: { error } });
        toast.error('Error al guardar los cambios. Intente nuevamente.');
        return;
      } finally {
        setIsSavingStep(false);
      }
    }

    if (currentStep === 2) {
      // Build sector order when moving to step 3
      buildSectorOrder();
    }
    setCurrentStep((prev) => Math.min(prev + 1, 4) as 1 | 2 | 3 | 4);
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1) as 1 | 2 | 3 | 4);
  };

  // ─── Generate ─────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!order || !canGenerate) return;

    setIsGenerating(true);
    try {
      // Build sector assignments array for the server action
      const assignmentsBySector = new Map<string, string[]>();
      for (const item of eligibleItems) {
        const sectorId = sectorAssignments.get(item.id) || item.assigned_sector_id;
        if (!sectorId) continue;
        if (!assignmentsBySector.has(sectorId)) {
          assignmentsBySector.set(sectorId, []);
        }
        assignmentsBySector.get(sectorId)!.push(item.id);
      }

      const sectorAssignmentsArray = Array.from(assignmentsBySector.entries()).map(([sectorId, itemIds]) => ({
        sectorId,
        itemIds,
      }));

      const sectorOrderArray = sectorOrder.map((so) => ({
        sectorId: so.sectorId,
        sequenceOrder: so.sequenceOrder,
      }));

      const result = await setupAndGenerateWorkOrders(
        order.id,
        pendingChanges,
        sectorAssignmentsArray,
        sectorOrderArray,
        { plannedStartDate, plannedEndDate }
      );

      toast.success(`${result.length} orden(es) de trabajo generada(s) exitosamente`);
      invalidateAllMaintenanceQueries(queryClient);
      onClose();
    } catch (error) {
      logger.error('Error en wizard de generacion', { data: { error } });
      toast.error(error instanceof Error ? error.message : 'Error al generar ordenes de trabajo');
    } finally {
      setIsGenerating(false);
    }
  };

  // ─── Close handler ────────────────────────────────────────

  const hasAnyUnsavedChanges = useMemo(() => {
    return hasStep1Changes || sectorAssignments.size > 0;
  }, [hasStep1Changes, sectorAssignments]);

  const handleClose = () => {
    if (hasAnyUnsavedChanges) {
      setShowDiscardConfirm(true);
      return;
    }
    onClose();
  };

  const handleConfirmDiscard = () => {
    setShowDiscardConfirm(false);
    onClose();
  };

  const handleSaveRejectionsAndClose = async () => {
    if (!order || !hasStep1Changes) return;
    try {
      setIsSavingStep(true);
      await saveOrderChanges(order.id, pendingChanges);
      invalidateAllMaintenanceQueries(queryClient);
      toast.success('Cambios guardados exitosamente');
      onClose();
    } catch (error) {
      logger.error('Error guardando rechazos', { data: { error } });
      toast.error('Error al guardar los cambios');
    } finally {
      setIsSavingStep(false);
    }
  };

  if (!order) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          {/* Header fijo */}
          <DialogHeader className="space-y-3 shrink-0">
            <DialogTitle className="flex items-center justify-between">
              <span className="font-mono text-lg">{order.order_number || 'Orden sin numero'}</span>
              <Badge variant="outline" className="text-xs">
                Paso {currentStep} de 4
              </Badge>
            </DialogTitle>

            {/* Datos del recurso: vehiculo o equipamiento */}
            <div className="flex items-center gap-3 px-3 py-2 bg-muted/50 rounded-lg text-sm flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold">{getResourceLabel(resource)}</span>
                {resourceInternNumber && <span className="text-muted-foreground">({resourceInternNumber})</span>}
                <Badge variant="secondary" className="text-[10px] font-normal">
                  {getResourceKindLabel(resource)}
                </Badge>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <span className="text-muted-foreground">{resourceTypeName || 'Sin tipo'}</span>
              <Separator orientation="vertical" className="h-4" />
              <span className="text-muted-foreground">
                Ingreso:{' '}
                <span className="text-foreground font-medium">
                  {order.workshop_entry_date ? moment(order.workshop_entry_date).format('DD/MM/YYYY') : '-'}
                </span>
              </span>
              {/* Un equipamiento no acumula kilometraje: solo se mide por horometro */}
              {!isOtherEquipment && (
                <>
                  <Separator orientation="vertical" className="h-4" />
                  <span className="text-muted-foreground">
                    Km: <span className="text-foreground font-medium">{order.vehicles?.kilometer || '-'}</span>
                  </span>
                </>
              )}
              <Separator orientation="vertical" className="h-4" />
              <span className="text-muted-foreground">
                Hs:{' '}
                <span className="text-foreground font-medium">
                  {(isOtherEquipment ? order.other_equipment?.horometer : order.vehicles?.engine_hours) || '-'}
                </span>
              </span>
            </div>

            {/* Step indicator */}
            <WizardStepIndicator currentStep={currentStep} />
          </DialogHeader>

          {/* Scrollable content */}
          <div className="flex-1 min-h-0 overflow-y-auto mt-4 pr-1">
            {currentStep === 1 && order && (
              <>
                {eligibleItems.length === 0 && regularItems.length > 0 && !allItemsRejected && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 mb-4">
                    <ClipboardList className="h-4 w-4 shrink-0" />
                    <span className="text-xs">
                      Todos los items ya tienen OT generada. Agregue un nuevo item para continuar con el wizard.
                    </span>
                  </div>
                )}
                <Step1Tasks
                  order={order}
                  localItems={localItems}
                  repairTypes={repairTypes}
                  onAddItem={() => setAddItemOpen(true)}
                  onDeleteItem={handleDeleteItem}
                  onRejectItem={handleRejectItem}
                  onRestoreItem={handleRestoreItem}
                  onEditRepairTypes={setEditingRepairTypesItem}
                  onDescriptionChange={handleDescriptionChange}
                  onChiefCommentChange={handleChiefCommentChange}
                />
              </>
            )}

            {currentStep === 2 && (
              <Step2SectorAssignment
                localItems={localItems}
                sectors={sectors}
                sectorAssignments={sectorAssignments}
                onAssignmentChange={handleAssignmentChange}
                onBatchAssignment={handleBatchAssignment}
                repairTypes={repairTypes}
              />
            )}

            {currentStep === 3 && (
              <Step3ExecutionOrder
                localItems={localItems}
                sectorAssignments={sectorAssignments}
                sectorOrder={sectorOrder}
                onReorder={handleReorder}
                onDragReorder={handleDragReorder}
                repairTypes={repairTypes}
              />
            )}

            {currentStep === 4 && (
              <Step4Confirm
                localItems={localItems}
                sectors={sectors}
                sectorAssignments={sectorAssignments}
                sectorOrder={sectorOrder}
                repairTypes={repairTypes}
                plannedStartDate={plannedStartDate}
                plannedEndDate={plannedEndDate}
                onStartDateChange={setPlannedStartDate}
                onEndDateChange={setPlannedEndDate}
              />
            )}
          </div>

          {/* Footer navigation */}
          <Separator className="mt-2" />
          <div className="flex items-center justify-between pt-2 shrink-0">
            <Button variant="outline" size="sm" onClick={handleBack} disabled={currentStep === 1}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>

            <div className="flex items-center gap-2">
              {currentStep === 1 && allItemsRejected && hasStep1Changes ? (
                <Button size="sm" onClick={handleSaveRejectionsAndClose} disabled={isSavingStep}>
                  {isSavingStep ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-1" />
                      Guardar cambios
                    </>
                  )}
                </Button>
              ) : currentStep < 4 ? (
                <Button
                  size="sm"
                  onClick={handleNext}
                  disabled={isSavingStep || (currentStep === 1 && eligibleItems.length === 0)}
                >
                  {isSavingStep ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      Siguiente
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </Button>
              ) : (
                <PermissionGuard module="mantenimiento" tab="gestion_ordenes" action="create">
                  <Button size="sm" onClick={handleGenerate} disabled={!canGenerate || isGenerating}>
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        Generando...
                      </>
                    ) : (
                      <>
                        <ClipboardList className="h-4 w-4 mr-1.5" />
                        Generar {sectorOrder.length} OT(s)
                      </>
                    )}
                  </Button>
                </PermissionGuard>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sub-dialogs */}
      <AddItemDialog
        open={addItemOpen}
        onClose={() => setAddItemOpen(false)}
        repairTypes={repairTypes}
        onAdd={handleAddItem}
      />

      {editingRepairTypesItem && (
        <AssignRepairTypesDialog
          key={editingRepairTypesItem.id}
          item={editingRepairTypesItem}
          repairTypes={repairTypes}
          open={!!editingRepairTypesItem}
          onClose={() => setEditingRepairTypesItem(null)}
          onUpdate={handleUpdateRepairTypes}
        />
      )}

      {/* Discard changes confirmation */}
      <AlertDialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hay cambios sin guardar</AlertDialogTitle>
            <AlertDialogDescription>
              Si cierra ahora, los cambios no guardados se perderan. ¿Desea continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Seguir editando</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDiscard}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Descartar cambios
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
