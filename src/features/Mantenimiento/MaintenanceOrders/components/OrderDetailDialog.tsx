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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { invalidateAllMaintenanceQueries } from '@/features/Mantenimiento/utils/queryInvalidation';
import { PermissionGuard } from '@/features/Permissions/components/PermissionGuard';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import moment from 'moment';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { MaintenanceOrderData } from '../actions/actionsServer';
import {
  completeExternalWorkOrder,
  operationsRejectOrder,
  operationsValidateOrder,
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
  readOnly?: boolean;
}

interface SectorGroup {
  sectorId: string;
  sectorName: string;
  sequenceOrder: number;
  items: MaintenanceOrderData['maintenance_order_items'];
}

export function OrderDetailDialog({ order, open, onClose, readOnly = false }: OrderDetailDialogProps) {
  const queryClient = useQueryClient();
  const [validationNotes, setValidationNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const vehicle = order?.vehicles;
  const items = order?.maintenance_order_items || [];
  const status = order?.status ?? '';

  // Mutations
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

  const operationsValidateMutation = useMutation({
    mutationFn: () => operationsValidateOrder(order!.id, validationNotes || undefined),
    onSuccess: () => {
      toast.success('Orden validada - Equipo operativo');
      invalidateAllMaintenanceQueries(queryClient);
      setValidationNotes('');
      onClose();
    },
    onError: (error: Error) => {
      toast.error(`Error al validar orden: ${error.message}`);
    },
  });

  const operationsRejectMutation = useMutation({
    mutationFn: () => operationsRejectOrder(order!.id, rejectionReason),
    onSuccess: () => {
      toast.success('Orden rechazada y devuelta a jefe de taller');
      invalidateAllMaintenanceQueries(queryClient);
      setRejectionReason('');
      setShowRejectDialog(false);
      onClose();
    },
    onError: (error: Error) => {
      toast.error(`Error al rechazar orden: ${error.message}`);
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
      if (item.assigned_sector_id) return; // Internal sector item
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

  // Build timeline data
  const timelineData = useMemo((): SectorTimelineItem[] => {
    return sectorGroups.map((group, index) => {
      const allRepairs = group.items.flatMap((item) => {
        const wo = item.work_orders;
        if (!wo) return [];
        if (Array.isArray(wo)) {
          return wo.flatMap((w) =>
            (w.work_order_items || []).flatMap((woi: any) => (woi.work_order_item_repairs || []) as unknown[])
          );
        }
        return (wo.work_order_items || []).flatMap((woi: any) => (woi.work_order_item_repairs || []) as unknown[]);
      });

      const totalTasks = allRepairs.length || group.items.length;
      const completedTasks = allRepairs.filter((r: any) => r.status === 'completed').length;
      const diagItem = group.items.find((i) => i.is_diagnostico);
      const diagCompleted = diagItem
        ? allRepairs.some((r: any) => r.status === 'completed' && diagItem.id === r.id)
        : false;

      // Determine sector status
      let status: SectorStatus = 'pending';
      if (completedTasks === totalTasks && totalTasks > 0) {
        status = 'completed';
      } else if (completedTasks > 0) {
        status = 'in_progress';
      } else if (index > 0) {
        // Check if previous sector is completed
        const prevGroup = sectorGroups[index - 1];
        const prevRepairs = prevGroup.items.flatMap((item) => {
          const wo = item.work_orders;
          if (!wo) return [];
          if (Array.isArray(wo)) {
            return wo.flatMap((w) =>
              (w.work_order_items || []).flatMap((woi: any) => (woi.work_order_item_repairs || []) as unknown[])
            );
          }
          return (wo.work_order_items || []).flatMap((woi: any) => (woi.work_order_item_repairs || []) as unknown[]);
        });
        const prevTotal = prevRepairs.length || prevGroup.items.length;
        const prevCompleted = prevRepairs.filter((r: any) => r.status === 'completed').length;
        if (prevCompleted < prevTotal) {
          status = 'blocked';
        }
      }

      return {
        sectorId: group.sectorId,
        sectorName: group.sectorName,
        sequenceOrder: group.sequenceOrder,
        status,
        totalTasks,
        completedTasks,
        diagnosticoCompleted: diagCompleted,
      };
    });
  }, [sectorGroups]);

  // Build task list for each sector card
  const getSectorTasks = (group: SectorGroup) => {
    return group.items.map((item) => {
      const repairName = String(item.types_of_repairs?.name || item.description || 'Sin descripcion');
      const isAutorizable = item.types_of_repairs?.autorizable ?? false;

      // Get status from work_order_item_repairs if available
      let taskStatus = 'pending';
      let isOperatorAdded = false;
      const wo = item.work_orders;
      if (wo && !Array.isArray(wo)) {
        const woItems = wo.work_order_items || [];
        const repairs = woItems.flatMap((woi: any) => woi.work_order_item_repairs || []);
        if (repairs.length > 0) {
          const repair = repairs[0] as any;
          taskStatus = String(repair.status);
          isOperatorAdded = repair.is_operator_added ?? false;
        }
      }

      return {
        id: item.id,
        repairTypeName: item.is_diagnostico ? 'DIAGNOSTICO' : repairName,
        status: taskStatus,
        isDiagnostico: item.is_diagnostico ?? false,
        isAutorizable,
        isOperatorAdded,
      };
    });
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Detalle de Orden
            <Badge variant="outline">{vehicle?.domain || vehicle?.serie || 'Sin patente'}</Badge>
            {vehicle?.vehicle_type?.name && <Badge variant="secondary">{vehicle.vehicle_type.name}</Badge>}
            {readOnly && <Badge variant="default">Solo lectura</Badge>}
          </DialogTitle>
        </DialogHeader>

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
          <h4 className="text-sm font-medium mb-2">Secuencia de Sectores</h4>
          <SectorTimeline sectors={timelineData} />
        </div>

        <Separator />

        {/* Sector cards */}
        <ScrollArea className="h-[40vh]">
          <div className="space-y-3 pr-4">
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
                    readOnly={readOnly}
                    onCompleteWorkOrder={(workOrderId) => completeExternalWOMutation.mutate(workOrderId)}
                    isCompleting={completeExternalWOMutation.isPending}
                  />
                ))}
              </>
            )}
          </div>
        </ScrollArea>

        {/* Validation Actions Footer */}
        {status === 'pending_workshop_validation' && !readOnly && (
          <>
            <Separator />
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Validación de Jefe de Taller</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Revisa que todas las ordenes de trabajo estén completadas y los trabajos realizados correctamente.
                </p>

                {/* Summary of work orders */}
                <div className="bg-muted p-3 rounded-md mb-3 text-sm">
                  <div className="font-medium mb-1">Resumen de Ordenes de Trabajo:</div>
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
                          {wo.order_number || 'Sin N°'}
                        </Badge>
                        {isExternal && (
                          <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-700">
                            Externo
                          </Badge>
                        )}
                        <span>{item.types_of_repairs?.name || item.description || 'Sin descripción'}</span>
                        <span className="text-muted-foreground ml-auto">{woStatus}</span>
                      </div>
                    );
                  })}
                </div>

                <Textarea
                  placeholder="Notas de validación (opcional)"
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
                      onClick={() => setShowReturnDialog(true)}
                      variant="outline"
                      disabled={workshopReturnMutation.isPending}
                    >
                      Devolver al Taller
                    </Button>
                  </div>
                </PermissionGuard>
              </div>
            </div>
          </>
        )}

        {status === 'pending_operations_validation' && !readOnly && (
          <>
            <Separator />
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Validación de Operaciones</h4>

                {/* Show workshop validation info */}
                {order.workshop_validated_at && (
                  <div className="bg-muted p-3 rounded-md mb-3 text-sm">
                    <div className="font-medium mb-1">Validado por Jefe de Taller:</div>
                    <div className="text-xs text-muted-foreground">
                      Fecha: {moment(order.workshop_validated_at).format('DD/MM/YYYY HH:mm')}
                    </div>
                    {order.workshop_validation_notes && (
                      <div className="text-xs mt-1">Notas: {order.workshop_validation_notes}</div>
                    )}
                  </div>
                )}

                <p className="text-sm text-muted-foreground mb-3">
                  Confirma que el equipo está en condiciones operativas y puede volver al servicio.
                </p>

                <Textarea
                  placeholder="Notas de validación (opcional)"
                  value={validationNotes}
                  onChange={(e) => setValidationNotes(e.target.value)}
                  className="mb-3"
                />

                <PermissionGuard module="mantenimiento" tab="ordenes_mantenimiento" action="update">
                  <div className="flex gap-2">
                    <Button
                      onClick={() => operationsValidateMutation.mutate()}
                      disabled={operationsValidateMutation.isPending}
                      className="flex-1"
                    >
                      {operationsValidateMutation.isPending ? 'Validando...' : 'Validar - Equipo Operativo'}
                    </Button>
                    <Button
                      onClick={() => setShowRejectDialog(true)}
                      variant="outline"
                      disabled={operationsRejectMutation.isPending}
                    >
                      Rechazar
                    </Button>
                  </div>
                </PermissionGuard>
              </div>
            </div>
          </>
        )}

        {status === 'completed' && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Historial de Validación</h4>

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
      </DialogContent>

      {/* Return to Workshop Dialog */}
      <AlertDialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Devolver Orden al Taller</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción reabrirá las ordenes de trabajo completadas. Indica el motivo:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Motivo de devolución (requerido)"
            value={returnReason}
            onChange={(e) => setReturnReason(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setReturnReason('')}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => workshopReturnMutation.mutate()}
              disabled={!returnReason.trim() || workshopReturnMutation.isPending}
            >
              {workshopReturnMutation.isPending ? 'Devolviendo...' : 'Devolver'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject from Operations Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rechazar Orden</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción devolverá la orden al jefe de taller. Indica el motivo:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Motivo de rechazo (requerido)"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRejectionReason('')}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => operationsRejectMutation.mutate()}
              disabled={!rejectionReason.trim() || operationsRejectMutation.isPending}
            >
              {operationsRejectMutation.isPending ? 'Rechazando...' : 'Rechazar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
