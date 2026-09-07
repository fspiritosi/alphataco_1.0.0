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
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ActivityHistoryModal } from '@/features/Mantenimiento/components/ActivityHistoryModal';
import { ItemComments } from '@/features/Mantenimiento/components/ItemComments';
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
import { ClipboardList, Clock, Loader2, Plus, Save, Trash2, Wrench } from 'lucide-react';
import moment from 'moment';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  saveOrderChanges,
  type ExternalWorkshop,
  type OrderChangeSet,
  type OrderManagementItem,
  type WorkshopSector,
} from '../actions/actionsServer';
import { AddItemDialog } from './AddItemDialog';
import { AssignRepairTypesDialog } from './AssignRepairTypesDialog';
import { AssignSectorsPanel } from './AssignSectorsPanel';
import { GenerateWorkOrderDialog } from './GenerateWorkOrderDialog';

const logger = new Logger('ManageOrderDialog');

interface ManageOrderDialogProps {
  order: OrderManagementItem | null;
  open: boolean;
  onClose: () => void;
  sectors: WorkshopSector[];
  repairTypes: Array<{ id: string; name: string }>;
  externalWorkshops: ExternalWorkshop[];
}

type OrderItem = OrderManagementItem['maintenance_order_items'][number];

// Tipo para items locales (puede incluir items temporales aun no guardados)
interface LocalItem {
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
  work_order_id: string | null;
  _isTemp?: boolean;
  _tempRepairTypeIds?: string[];
  _deleted?: boolean;
}

export function ManageOrderDialog({
  order,
  open,
  onClose,
  sectors,
  repairTypes,
  externalWorkshops,
}: ManageOrderDialogProps) {
  const queryClient = useQueryClient();
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [editingRepairTypesItem, setEditingRepairTypesItem] = useState<OrderItem | null>(null);
  const [generateWoOpen, setGenerateWoOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Local items state for batch editing
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

  // Sync local items when order changes (fresh data from query)
  useEffect(() => {
    if (order && open) {
      const items = order.maintenance_order_items || [];
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
          work_order_id: item.work_order_id,
        }))
      );
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
    }
  }, [order, open]);

  const hasChanges = useMemo(() => {
    const c = pendingChanges;
    return (
      c.deletes.length > 0 ||
      c.adds.length > 0 ||
      c.sectorAssignments.length > 0 ||
      c.repairTypeUpdates.length > 0 ||
      c.sequenceUpdates.length > 0 ||
      c.descriptionUpdates.length > 0 ||
      c.workshopAssignments.length > 0
    );
  }, [pendingChanges]);

  const regularItems = useMemo(() => {
    return localItems.filter((item) => !item.is_diagnostico && !item._deleted);
  }, [localItems]);

  // Check if eligible for generating work orders
  const canGenerateWorkOrders = useMemo(() => {
    if (hasChanges) return false;
    const eligibleItems = regularItems.filter((item) => !item.work_order_id);
    if (eligibleItems.length === 0) return false;
    // All eligible items must have sector or external workshop, and at least 1 repair type
    return eligibleItems.every((item) => {
      const hasRepairType =
        (item.maintenance_order_item_repair_types && item.maintenance_order_item_repair_types.length > 0) ||
        !!item.types_of_repairs;
      const hasAssignment = item.assigned_sector_id || item.assigned_workshop_id;
      return hasAssignment && hasRepairType;
    });
  }, [hasChanges, regularItems]);

  // Ticket 596: el pedido puede ser de un vehiculo o de un equipamiento, y el
  // encabezado tiene que identificar bien a cualquiera de los dos.
  const resource = { vehicles: order?.vehicles ?? null, other_equipment: order?.other_equipment ?? null };
  const isOtherEquipment = getResourceKind(resource) === 'other_equipment';
  const resourceInternNumber = getResourceInternNumber(resource);
  const resourceTypeName = order?.other_equipment?.type?.name ?? order?.vehicles?.vehicle_type?.name ?? null;

  // --- Handlers ---

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
      work_order_id: null,
      _isTemp: true,
      _tempRepairTypeIds: repairTypeIds,
    };

    setLocalItems((prev) => [...prev, newItem]);
    setPendingChanges((prev) => ({
      ...prev,
      adds: [...prev.adds, { description, repairTypeIds }],
    }));
    toast.info('Item agregado (pendiente de guardar)');
  }, []);

  const handleDeleteItem = useCallback(
    (itemId: string) => {
      const item = localItems.find((i) => i.id === itemId);
      if (!item) return;

      // Solo se pueden eliminar items manuales (sin maintenance_request_item_id) o temporales
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
      toast.info('Item marcado para eliminar (pendiente de guardar)');
    },
    [localItems]
  );

  const handleUpdateRepairTypes = useCallback(
    (itemId: string, repairTypeIds: string[]) => {
      const item = localItems.find((i) => i.id === itemId);
      if (!item) return;

      if (item._isTemp) {
        // Update temp item
        setLocalItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, _tempRepairTypeIds: repairTypeIds } : i)));
        // Update the corresponding add in pending changes
        setPendingChanges((prev) => ({
          ...prev,
          adds: prev.adds.map((a) => (a.description === item.description ? { ...a, repairTypeIds } : a)),
        }));
      } else {
        // Mark repair types visually
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
              ? {
                  ...i,
                  repair_type_id: repairTypeIds[0] || null,
                  maintenance_order_item_repair_types: repairTypeObjs,
                }
              : i
          )
        );

        // Add/update pending change
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
      toast.info('Tipos de reparacion actualizados (pendiente de guardar)');
    },
    [localItems, repairTypes]
  );

  const handleSectorAssignments = useCallback(
    (
      assignments: Array<{
        sectorId: string;
        sectorName: string;
        sequenceOrder: number;
        itemIds: string[];
      }>
    ) => {
      // Update local items with sector info
      for (const assignment of assignments) {
        const sector = sectors.find((s) => s.id === assignment.sectorId);
        setLocalItems((prev) =>
          prev.map((item) => {
            if (assignment.itemIds.includes(item.id)) {
              return {
                ...item,
                assigned_sector_id: assignment.sectorId,
                sector_sequence_order: assignment.sequenceOrder,
                workshop_sectors: sector ? { id: sector.id, name: sector.name } : item.workshop_sectors,
              };
            }
            return item;
          })
        );
      }

      setPendingChanges((prev) => ({
        ...prev,
        sectorAssignments: [
          ...prev.sectorAssignments,
          ...assignments.map((a) => ({
            itemIds: a.itemIds,
            sectorId: a.sectorId,
            sequenceOrder: a.sequenceOrder,
          })),
        ],
      }));
      toast.info('Asignaciones de sector agregadas (pendiente de guardar)');
    },
    [sectors]
  );

  const handleExternalWorkshopAssignments = useCallback(
    (
      assignments: Array<{
        workshopId: string;
        workshopName: string;
        itemIds: string[];
      }>
    ) => {
      // Update local items with workshop info (no sector)
      for (const assignment of assignments) {
        setLocalItems((prev) =>
          prev.map((item) => {
            if (assignment.itemIds.includes(item.id)) {
              return {
                ...item,
                assigned_workshop_id: assignment.workshopId,
                assigned_sector_id: null,
                sector_sequence_order: null,
                workshop_sectors: null,
              };
            }
            return item;
          })
        );
      }

      setPendingChanges((prev) => ({
        ...prev,
        workshopAssignments: [
          ...prev.workshopAssignments,
          ...assignments.map((a) => ({
            itemIds: a.itemIds,
            workshopId: a.workshopId,
          })),
        ],
      }));
      toast.info('Asignaciones a taller externo agregadas (pendiente de guardar)');
    },
    []
  );

  const handleSequenceChange = useCallback((itemId: string, newSequence: number) => {
    setLocalItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, sector_sequence_order: newSequence } : i)));

    setPendingChanges((prev) => {
      const existing = prev.sequenceUpdates.findIndex((u) => u.itemId === itemId);
      const updated = [...prev.sequenceUpdates];
      if (existing >= 0) {
        updated[existing] = { itemId, sequenceOrder: newSequence };
      } else {
        updated.push({ itemId, sequenceOrder: newSequence });
      }
      return { ...prev, sequenceUpdates: updated };
    });
  }, []);

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

  const handleSave = async () => {
    if (!order || !hasChanges) return;

    // Validate no duplicate sequence orders within same sector
    const sectorSequences = new Map<string, number[]>();
    for (const item of localItems.filter((i) => !i._deleted && !i.is_diagnostico && i.assigned_sector_id)) {
      const sectorId = item.assigned_sector_id!;
      const seq = item.sector_sequence_order;
      if (seq !== null && seq !== undefined) {
        const existing = sectorSequences.get(sectorId) || [];
        if (existing.includes(seq)) {
          toast.error(`Secuencia duplicada (${seq}) en el mismo sector. Corrija antes de guardar.`);
          return;
        }
        existing.push(seq);
        sectorSequences.set(sectorId, existing);
      }
    }

    setIsSaving(true);
    try {
      await saveOrderChanges(order.id, pendingChanges);
      toast.success('Cambios guardados exitosamente');
      invalidateAllMaintenanceQueries(queryClient);
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
    } catch (error) {
      logger.error('Error guardando cambios', { data: { error } });
      toast.error(error instanceof Error ? error.message : 'Error al guardar cambios');
    } finally {
      setIsSaving(false);
    }
  };

  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const handleClose = () => {
    if (hasChanges) {
      setShowDiscardConfirm(true);
      return;
    }
    onClose();
  };

  const handleConfirmDiscard = () => {
    setShowDiscardConfirm(false);
    onClose();
  };

  if (!order) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader className="space-y-3 shrink-0">
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg">{order.order_number || 'Orden sin numero'}</span>
              </div>
              <div className="flex items-center gap-2">
                {hasChanges && (
                  <Badge variant="warning" className="text-xs animate-pulse">
                    Cambios sin guardar
                  </Badge>
                )}
                <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)}>
                  <Clock className="h-4 w-4 mr-1" />
                  Ver historial
                </Button>
              </div>
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
              <Separator orientation="vertical" className="h-4" />
              {/* Un equipamiento no acumula kilometraje: solo se mide por horometro */}
              {isOtherEquipment ? (
                <span className="text-muted-foreground">
                  Hs: <span className="text-foreground font-medium">{order.other_equipment?.horometer || '-'}</span>
                </span>
              ) : (
                <span className="text-muted-foreground">
                  Km: <span className="text-foreground font-medium">{order.vehicles?.kilometer || '-'}</span>
                </span>
              )}
            </div>
          </DialogHeader>

          <Tabs defaultValue="items" className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-2 shrink-0">
              <TabsTrigger value="items">Items del pedido ({regularItems.length})</TabsTrigger>
              <TabsTrigger value="asignar">Asignacion a Sectores</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 min-h-0 mt-4">
              <TabsContent value="items" className="mt-0">
                <div className="space-y-3">
                  {/* Header con botones */}
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-medium">Items de reparacion</h4>
                    <div className="flex items-center gap-2">
                      <PermissionGuard module="mantenimiento" tab="gestion_ordenes" action="create">
                        <Button variant="outline" size="sm" onClick={() => setAddItemOpen(true)}>
                          <Plus className="h-4 w-4 mr-1" />
                          Agregar item
                        </Button>
                      </PermissionGuard>
                    </div>
                  </div>

                  {/* Lista de items */}
                  {regularItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No hay items en este pedido</p>
                  ) : (
                    <div className="space-y-2">
                      {regularItems.map((item) => {
                        // Obtener tipos de reparacion
                        let repairTypeNames: string[] = [];
                        let hasAutorizable = false;

                        if (item._isTemp && item._tempRepairTypeIds) {
                          repairTypeNames = item._tempRepairTypeIds
                            .map((id) => repairTypes.find((rt) => rt.id === id)?.name)
                            .filter((name): name is string => !!name);
                        } else {
                          const pivotRepairTypes = item.maintenance_order_item_repair_types || [];
                          repairTypeNames =
                            pivotRepairTypes.length > 0
                              ? pivotRepairTypes
                                  .map((rt) => rt.types_of_repairs?.name)
                                  .filter((name): name is string => !!name)
                              : item.types_of_repairs?.name
                                ? [String(item.types_of_repairs.name)]
                                : [];
                          hasAutorizable =
                            pivotRepairTypes.some((rt) => rt.types_of_repairs?.autorizable) ||
                            !!item.types_of_repairs?.autorizable;
                        }

                        const deviation = item.maintenance_request_items?.checklist_deviations;
                        const sectorName =
                          item.workshop_sectors &&
                          typeof item.workshop_sectors === 'object' &&
                          'name' in item.workshop_sectors
                            ? String(item.workshop_sectors.name)
                            : null;

                        const canDelete = item._isTemp || !item.maintenance_request_item_id;
                        const hasWorkOrder = !!item.work_order_id;

                        return (
                          <div
                            key={item.id}
                            className={`group relative flex items-start justify-between p-3 border rounded-lg transition-colors hover:bg-muted/30 ${
                              item._isTemp
                                ? 'border-dashed border-blue-300 bg-blue-50/30 dark:bg-blue-950/20'
                                : hasWorkOrder
                                  ? 'border-l-4 border-l-emerald-500'
                                  : !sectorName && !item.assigned_workshop_id
                                    ? 'border-l-4 border-l-orange-400'
                                    : ''
                            }`}
                          >
                            <div className="space-y-1.5 flex-1 min-w-0">
                              {/* Status + Repair type badges row */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {item._isTemp && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] text-blue-600 border-blue-300 px-1.5 py-0"
                                  >
                                    Nuevo
                                  </Badge>
                                )}
                                {hasWorkOrder && (
                                  <Badge variant="success" className="text-[10px] px-1.5 py-0">
                                    OT generada
                                  </Badge>
                                )}
                                {repairTypeNames.length > 0 ? (
                                  repairTypeNames.map((name, idx) => (
                                    <Badge key={idx} variant="default" className="text-[10px] px-1.5 py-0">
                                      {name}
                                    </Badge>
                                  ))
                                ) : (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                    Sin tipo asignado
                                  </Badge>
                                )}
                                {hasAutorizable && (
                                  <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                                    Autorizable
                                  </Badge>
                                )}
                                {!item._isTemp && !hasWorkOrder && (
                                  <PermissionGuard module="mantenimiento" tab="gestion_ordenes" action="update">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={() => {
                                        const originalItem = (order.maintenance_order_items || []).find(
                                          (i) => i.id === item.id
                                        );
                                        if (originalItem) setEditingRepairTypesItem(originalItem);
                                      }}
                                      title="Asignar tipos de reparacion"
                                    >
                                      <Wrench className="h-3 w-3" />
                                    </Button>
                                  </PermissionGuard>
                                )}
                              </div>
                              {/* Description */}
                              {!hasWorkOrder ? (
                                <Input
                                  value={item.description || ''}
                                  onChange={(e) => handleDescriptionChange(item.id, e.target.value)}
                                  placeholder="Descripcion del item"
                                  className="h-7 text-sm"
                                />
                              ) : (
                                item.description && (
                                  <p className="text-sm text-muted-foreground truncate">{String(item.description)}</p>
                                )
                              )}
                              {/* Deviation info */}
                              {deviation && (
                                <p className="text-xs text-muted-foreground/80 italic">
                                  Desvio: {String(deviation.item_label || deviation.item_code)}
                                </p>
                              )}
                              {/* Comments with attribution */}
                              <ItemComments
                                item={item}
                                source={order.maintenance_requests?.source}
                                fallbackAuthorName={order.maintenance_requests?.supervisor_name}
                              />
                            </div>
                            {/* Right side: sector + actions */}
                            <div className="flex items-center gap-1.5 ml-3 shrink-0">
                              {sectorName ? (
                                <div className="flex items-center gap-1">
                                  <Badge variant="outline" className="text-xs">
                                    {sectorName}
                                  </Badge>
                                  {!hasWorkOrder && (
                                    <Input
                                      type="number"
                                      min={1}
                                      className="w-12 h-6 text-[11px] text-center"
                                      value={item.sector_sequence_order ?? ''}
                                      onChange={(e) => handleSequenceChange(item.id, Number(e.target.value))}
                                      title="Orden de secuencia"
                                    />
                                  )}
                                </div>
                              ) : item.assigned_workshop_id ? (
                                <Badge variant="outline" className="text-xs gap-1 border-blue-400 text-blue-600">
                                  Taller Externo
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="text-[10px]">
                                  Sin sector
                                </Badge>
                              )}
                              {canDelete && !hasWorkOrder && (
                                <PermissionGuard module="mantenimiento" tab="gestion_ordenes" action="delete">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-destructive/60 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleDeleteItem(item.id)}
                                    title="Eliminar item"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </PermissionGuard>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="asignar" className="mt-0">
                <AssignSectorsPanel
                  items={localItems.filter((i) => !i._deleted) as unknown as OrderItem[]}
                  sectors={sectors}
                  externalWorkshops={externalWorkshops}
                  onAssign={handleSectorAssignments}
                  onAssignExternalWorkshop={handleExternalWorkshopAssignments}
                />
              </TabsContent>
            </ScrollArea>
          </Tabs>

          {/* Footer con botones de accion */}
          <Separator />
          <div className="flex items-center justify-end gap-2 pt-2 shrink-0">
            {hasChanges && (
              <Button onClick={handleSave} disabled={isSaving} size="sm">
                {isSaving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
                {isSaving ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            )}
            <PermissionGuard module="mantenimiento" tab="gestion_ordenes" action="create">
              <Button
                variant="default"
                size="sm"
                disabled={!canGenerateWorkOrders}
                onClick={() => setGenerateWoOpen(true)}
                title={
                  hasChanges
                    ? 'Guarde los cambios primero'
                    : !canGenerateWorkOrders
                      ? 'Todos los items deben tener sector y tipo de reparacion asignados'
                      : 'Generar ordenes de trabajo'
                }
              >
                <ClipboardList className="h-4 w-4 mr-1.5" />
                Generar OT
              </Button>
            </PermissionGuard>
          </div>
        </DialogContent>
      </Dialog>

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

      {order && (
        <GenerateWorkOrderDialog open={generateWoOpen} onClose={() => setGenerateWoOpen(false)} orderId={order.id} />
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

      <ActivityHistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        maintenanceOrderId={order?.id ?? null}
        title={`Historial de OM ${order?.order_number ?? ''}`}
      />
    </>
  );
}
