'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { PermissionGuard } from '@/features/Permissions/components/PermissionGuard';
import { Logger } from '@/lib/logger';
import { useQueryClient } from '@tanstack/react-query';
import { Calendar, CheckCircle, Clock, Loader2, Truck, Wrench, XCircle } from 'lucide-react';
import moment from 'moment';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  cancelWorkOrder,
  completeWorkOrder,
  completeWorkOrderItem,
  startWorkOrder,
  updateWorkOrderNotes,
} from '../actions/actionsServer';
import { ORDENES_TRABAJO_QUERY_KEY, useOrdenTrabajoDetail } from '../hooks/useOrdenesTrabajo';
import {
  WORK_ORDER_ITEM_STATUS_LABELS,
  WORK_ORDER_STATUS_LABELS,
  WORK_ORDER_STATUS_VARIANTS,
  type WorkOrderRowData,
} from '../types';

const logger = new Logger('OrdenDetalleDialog');

interface OrdenDetalleDialogProps {
  workOrder: WorkOrderRowData | null;
  open: boolean;
  onClose: () => void;
}

export function OrdenDetalleDialog({ workOrder, open, onClose }: OrdenDetalleDialogProps) {
  const queryClient = useQueryClient();
  const { data: detail, isLoading } = useOrdenTrabajoDetail(workOrder?.id || null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notes, setNotes] = useState('');
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Sincronizar notas cuando se carga el detalle
  useState(() => {
    if (detail?.notes) {
      setNotes(detail.notes);
    }
  });

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ORDENES_TRABAJO_QUERY_KEY });
  };

  const handleStartWork = async () => {
    if (!workOrder) return;
    setIsSubmitting(true);
    try {
      await startWorkOrder(workOrder.id);
      toast.success('Orden de trabajo iniciada');
      invalidateQueries();
    } catch (error) {
      logger.error('Error iniciando OT', { data: { error } });
      toast.error(error instanceof Error ? error.message : 'Error al iniciar orden');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteItem = async (itemId: string) => {
    setIsSubmitting(true);
    try {
      await completeWorkOrderItem(itemId);
      toast.success('Item completado');
      invalidateQueries();
    } catch (error) {
      logger.error('Error completando item', { data: { error } });
      toast.error(error instanceof Error ? error.message : 'Error al completar item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteOrder = async () => {
    if (!workOrder) return;
    setIsSubmitting(true);
    try {
      await completeWorkOrder(workOrder.id);
      toast.success('Orden de trabajo completada');
      invalidateQueries();
      onClose();
    } catch (error) {
      logger.error('Error completando OT', { data: { error } });
      toast.error(error instanceof Error ? error.message : 'Error al completar orden');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!workOrder || !cancelReason.trim()) return;
    setIsSubmitting(true);
    try {
      await cancelWorkOrder(workOrder.id, cancelReason);
      toast.success('Orden de trabajo cancelada');
      invalidateQueries();
      onClose();
    } catch (error) {
      logger.error('Error cancelando OT', { data: { error } });
      toast.error(error instanceof Error ? error.message : 'Error al cancelar orden');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!workOrder) return;
    setIsSubmitting(true);
    try {
      await updateWorkOrderNotes(workOrder.id, notes);
      toast.success('Notas guardadas');
      invalidateQueries();
    } catch (error) {
      logger.error('Error guardando notas', { data: { error } });
      toast.error('Error al guardar notas');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!workOrder) return null;

  const isPending = detail?.status === 'pending';
  const isInProgress = detail?.status === 'in_progress';
  const isCompleted = detail?.status === 'completed';
  const isCancelled = detail?.status === 'cancelled';
  const allItemsCompleted =
    detail?.items.every((i) => i.status === 'completed' || i.status === 'cancelled') && (detail?.items.length || 0) > 0;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="font-mono">{workOrder.orderNumber}</span>
            {detail && (
              <Badge variant={WORK_ORDER_STATUS_VARIANTS[detail.status]}>
                {WORK_ORDER_STATUS_LABELS[detail.status]}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>Detalle de la orden de trabajo</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : detail ? (
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              {/* Info del equipo */}
              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Truck className="h-4 w-4" />
                  Equipo
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Identificación: </span>
                    <span className="font-medium">
                      {detail.vehicleDomain || detail.vehicleSerie || 'Sin identificar'}
                      {detail.vehicleInternNumber && ` (#${detail.vehicleInternNumber})`}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tipo: </span>
                    <span>{detail.vehicleType || '-'}</span>
                  </div>
                  {detail.vehicleKilometer && (
                    <div>
                      <span className="text-muted-foreground">Kilometraje: </span>
                      <span>{detail.vehicleKilometer} km</span>
                    </div>
                  )}
                  {detail.vehicleCondition && (
                    <div>
                      <span className="text-muted-foreground">Condición: </span>
                      <Badge variant="outline">{detail.vehicleCondition}</Badge>
                    </div>
                  )}
                </div>
              </div>

              {/* Info de asignación */}
              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Wrench className="h-4 w-4" />
                  Asignación
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Taller: </span>
                    <span className="font-medium">{detail.workshopName}</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      ({detail.workshopType === 'interno' ? 'Interno' : 'Externo'})
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Sector: </span>
                    <span>{detail.sectorName || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Período */}
              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="h-4 w-4" />
                  Período
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Planificado: </span>
                    <span>
                      {moment(detail.plannedStartDate).format('DD/MM/YYYY')} -{' '}
                      {moment(detail.plannedEndDate).format('DD/MM/YYYY')}
                    </span>
                  </div>
                  {detail.actualStartDate && (
                    <div>
                      <span className="text-muted-foreground">Inicio real: </span>
                      <span>{moment(detail.actualStartDate).format('DD/MM/YYYY HH:mm')}</span>
                    </div>
                  )}
                  {detail.actualEndDate && (
                    <div>
                      <span className="text-muted-foreground">Fin real: </span>
                      <span>{moment(detail.actualEndDate).format('DD/MM/YYYY HH:mm')}</span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Items / Trabajos */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Trabajos a realizar ({detail.items.length})</Label>
                  <span className="text-xs text-muted-foreground">
                    {detail.completedItems}/{detail.totalItems} completados
                  </span>
                </div>

                <div className="space-y-2">
                  {detail.items.map((item) => {
                    const isItemPending = item.status === 'pending';
                    const isItemInProgress = item.status === 'in_progress';
                    const isItemCompleted = item.status === 'completed';

                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-lg border ${isItemCompleted ? 'bg-green-50 dark:bg-green-950 border-green-200' : 'bg-background'}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3 flex-1">
                            {isInProgress && isItemPending && (
                              <PermissionGuard module="mantenimiento" tab="ordenes_trabajo" action="update">
                                <Checkbox
                                  checked={false}
                                  disabled={isSubmitting}
                                  onCheckedChange={() => handleCompleteItem(item.id)}
                                  className="mt-1"
                                />
                              </PermissionGuard>
                            )}
                            {isItemCompleted && <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />}
                            {!isInProgress && isItemPending && (
                              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                            )}

                            <div className="flex-1">
                              <p className="font-medium">{item.itemLabel}</p>
                              {/* Mostrar múltiples tipos de reparación */}
                              {(item.repairTypeNames?.length > 0 || item.repairTypeName) && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {(item.repairTypeNames?.length > 0
                                    ? item.repairTypeNames
                                    : [item.repairTypeName]
                                  ).map(
                                    (name, idx) =>
                                      name && (
                                        <Badge key={idx} variant="outline" className="text-xs">
                                          {name}
                                        </Badge>
                                      )
                                  )}
                                </div>
                              )}
                              {item.driverComment && (
                                <p className="text-sm mt-1">
                                  <span className="text-muted-foreground">Comentario del chofer: </span>
                                  <span className="italic">{item.driverComment}</span>
                                </p>
                              )}
                              {item.description && (
                                <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                              )}
                              {item.technicianNotes && (
                                <p className="text-sm text-blue-600 mt-1">
                                  <span className="font-medium">Nota: </span>
                                  {item.technicianNotes}
                                </p>
                              )}
                              {item.completedAt && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Completado: {moment(item.completedAt).format('DD/MM/YYYY HH:mm')}
                                </p>
                              )}
                            </div>
                          </div>

                          <Badge variant={isItemCompleted ? 'success' : isItemInProgress ? 'warning' : 'secondary'}>
                            {WORK_ORDER_ITEM_STATUS_LABELS[item.status]}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Notas */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notas generales</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Agregar notas sobre la orden de trabajo..."
                  disabled={isCompleted || isCancelled}
                  rows={3}
                />
                {!isCompleted && !isCancelled && notes !== detail.notes && (
                  <Button variant="outline" size="sm" onClick={handleSaveNotes} disabled={isSubmitting}>
                    Guardar notas
                  </Button>
                )}
              </div>

              {/* Formulario de cancelación */}
              {showCancelForm && !isCompleted && !isCancelled && (
                <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg space-y-2 border border-red-200">
                  <Label className="text-red-600">Razón de cancelación *</Label>
                  <Textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Explique por qué se cancela esta orden..."
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleCancelOrder}
                      disabled={isSubmitting || cancelReason.trim().length < 5}
                    >
                      Confirmar cancelación
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowCancelForm(false)}>
                      No cancelar
                    </Button>
                  </div>
                </div>
              )}

              {/* Info de cancelación si está cancelada */}
              {isCancelled && detail.cancellationReason && (
                <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200">
                  <div className="flex items-center gap-2 text-red-600 font-medium mb-1">
                    <XCircle className="h-4 w-4" />
                    Orden cancelada
                  </div>
                  <p className="text-sm">{detail.cancellationReason}</p>
                  {detail.cancelledAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {moment(detail.cancelledAt).format('DD/MM/YYYY HH:mm')}
                    </p>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        ) : null}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {!isCompleted && !isCancelled && !showCancelForm && (
            <PermissionGuard module="mantenimiento" tab="ordenes_trabajo" action="update">
              <Button
                variant="outline"
                onClick={() => setShowCancelForm(true)}
                disabled={isSubmitting}
                className="text-red-600 hover:text-red-700"
              >
                Cancelar Orden
              </Button>
            </PermissionGuard>
          )}

          <div className="flex-1" />

          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>

          {isPending && (
            <PermissionGuard module="mantenimiento" tab="ordenes_trabajo" action="update">
              <Button onClick={handleStartWork} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Iniciar Trabajo
              </Button>
            </PermissionGuard>
          )}

          {isInProgress && allItemsCompleted && (
            <PermissionGuard module="mantenimiento" tab="ordenes_trabajo" action="update">
              <Button onClick={handleCompleteOrder} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Completar Orden
              </Button>
            </PermissionGuard>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
