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
import { ItemComments } from '@/features/Mantenimiento/components/ItemComments';
import { RepairItemPhotos } from '@/features/Mantenimiento/shared/components/RepairItemPhotos';
import { formatDateOnly, formatDateShort, formatDateTime } from '@/features/Mantenimiento/utils/dateFormat';
import { invalidateAllMaintenanceQueries } from '@/features/Mantenimiento/utils/queryInvalidation';
import { PermissionGuard } from '@/features/Permissions/components/PermissionGuard';
import { Logger } from '@/lib/logger';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  Loader2,
  Pause,
  Play,
  Truck,
  User,
  Wrench,
  XCircle,
} from 'lucide-react';
import moment from 'moment';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  cancelWorkOrder,
  completeMultipleRepairs,
  completeWorkOrder,
  completeWorkOrderItem,
  completeWorkOrderItemRepair,
  completeWorkOrderPartial,
  pauseWorkOrder,
  resumeWorkOrder,
  startWorkOrder,
  updateWorkOrderNotes,
} from '../actions/actionsServer';
import { ORDENES_TRABAJO_QUERY_KEY, useOrdenTrabajoDetail } from '../hooks/useOrdenesTrabajo';
import {
  WORK_ORDER_ITEM_STATUS_LABELS,
  WORK_ORDER_PRIORITY_LABELS,
  WORK_ORDER_PRIORITY_VARIANTS,
  WORK_ORDER_STATUS_LABELS,
  WORK_ORDER_STATUS_VARIANTS,
  type WorkOrderRowData,
} from '../types';

const logger = new Logger('OrdenDetalleDialog');

/**
 * Formatea un intervalo de tiempo (HH:MM:SS o segundos) a formato legible "Xh Ym"
 */
function formatDuration(totalPausedTime: string | null, startDate: string | null, endDate: string | null): string {
  if (!startDate || !endDate) return '-';

  const start = moment(startDate);
  const end = moment(endDate);
  let totalMs = end.diff(start);

  // Restar tiempo pausado si existe
  if (totalPausedTime && totalPausedTime !== '00:00:00') {
    const parts = totalPausedTime.split(':');
    if (parts.length === 3) {
      const pausedMs = (parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseInt(parts[2], 10)) * 1000;
      totalMs -= pausedMs;
    }
  }

  if (totalMs <= 0) return '0m';

  const duration = moment.duration(totalMs);
  const days = Math.floor(duration.asDays());
  const hours = duration.hours();
  const minutes = duration.minutes();

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);

  return parts.join(' ');
}

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
  const [showPauseForm, setShowPauseForm] = useState(false);
  const [pauseReason, setPauseReason] = useState('');
  const [showPartialCompleteForm, setShowPartialCompleteForm] = useState(false);
  const [partialCompleteReason, setPartialCompleteReason] = useState('');

  // Estado para selección de tareas (issue 3)
  const [selectedRepairs, setSelectedRepairs] = useState<Set<string>>(new Set());

  // Sincronizar notas cuando se carga el detalle
  useEffect(() => {
    if (detail?.notes) {
      setNotes(detail.notes);
    }
  }, [detail?.notes]);

  // Limpiar selección cuando cambia el detalle
  useEffect(() => {
    setSelectedRepairs(new Set());
  }, [detail?.id]);

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ORDENES_TRABAJO_QUERY_KEY });
    invalidateAllMaintenanceQueries(queryClient);
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

  const handleCompleteRepair = async (repairId: string) => {
    setIsSubmitting(true);
    try {
      await completeWorkOrderItemRepair(repairId);
      toast.success('Trabajo completado');
      invalidateQueries();
    } catch (error) {
      logger.error('Error completando trabajo', { data: { error } });
      toast.error(error instanceof Error ? error.message : 'Error al completar trabajo');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler para selección de repairs (issue 3)
  const handleToggleRepairSelection = (repairId: string) => {
    setSelectedRepairs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(repairId)) {
        newSet.delete(repairId);
      } else {
        newSet.add(repairId);
      }
      return newSet;
    });
  };

  // Handler para completar seleccionados (issue 3)
  const handleCompleteSelectedRepairs = async () => {
    if (selectedRepairs.size === 0) {
      toast.error('Debe seleccionar al menos un trabajo');
      return;
    }
    setIsSubmitting(true);
    try {
      await completeMultipleRepairs(Array.from(selectedRepairs));
      toast.success(`${selectedRepairs.size} trabajo(s) completado(s)`);
      setSelectedRepairs(new Set());
      invalidateQueries();
    } catch (error) {
      logger.error('Error completando trabajos', { data: { error } });
      toast.error(error instanceof Error ? error.message : 'Error al completar trabajos');
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

  // Handler para completar parcialmente (issue 6)
  const handleCompleteOrderPartial = async () => {
    if (!workOrder) return;
    setIsSubmitting(true);
    try {
      await completeWorkOrderPartial(workOrder.id, partialCompleteReason);
      toast.success('Orden de trabajo finalizada con pendientes');
      invalidateQueries();
      onClose();
    } catch (error) {
      logger.error('Error completando parcialmente OT', { data: { error } });
      toast.error(error instanceof Error ? error.message : 'Error al finalizar orden');
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

  const handlePauseOrder = async () => {
    if (!workOrder || !pauseReason.trim()) return;
    setIsSubmitting(true);
    try {
      await pauseWorkOrder(workOrder.id, pauseReason);
      toast.success('Orden de trabajo pausada');
      invalidateQueries();
      setShowPauseForm(false);
      setPauseReason('');
    } catch (error) {
      logger.error('Error pausando OT', { data: { error } });
      toast.error(error instanceof Error ? error.message : 'Error al pausar orden');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResumeOrder = async () => {
    if (!workOrder) return;
    setIsSubmitting(true);
    try {
      await resumeWorkOrder(workOrder.id);
      toast.success('Orden de trabajo reanudada');
      invalidateQueries();
    } catch (error) {
      logger.error('Error reanudando OT', { data: { error } });
      toast.error(error instanceof Error ? error.message : 'Error al reanudar orden');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!workOrder) return null;

  const isPending = detail?.status === 'pending';
  const isInProgress = detail?.status === 'in_progress';
  const isPaused = detail?.status === 'paused';
  const isCompleted = detail?.status === 'completed';
  const isCompletedPartial = detail?.status === 'completed_partial';
  const isCancelled = detail?.status === 'cancelled';
  const isFinished = isCompleted || isCompletedPartial || isCancelled;

  // Verificar que todos los repairs estén completados
  const allRepairsCompleted = (detail?.totalItems ?? 0) > 0 && detail?.completedItems === detail?.totalItems;

  // Verificar si hay al menos un repair completado pero no todos (issue 6)
  const hasCompletedRepairs = (detail?.completedItems ?? 0) > 0;
  const hasPendingRepairs = (detail?.completedItems ?? 0) < (detail?.totalItems ?? 0);
  const canFinishPartial = hasCompletedRepairs && hasPendingRepairs;

  // Calcular tiempo real de trabajo para OTs completadas (issue 7)
  const realWorkTime =
    isCompleted || isCompletedPartial
      ? formatDuration(detail?.totalPausedTime || null, detail?.actualStartDate || null, detail?.actualEndDate || null)
      : null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <span className="font-mono">{workOrder.orderNumber}</span>
            {detail && (
              <>
                <Badge variant={WORK_ORDER_STATUS_VARIANTS[detail.status]}>
                  {WORK_ORDER_STATUS_LABELS[detail.status]}
                </Badge>
                {detail.priority && (
                  <Badge variant={WORK_ORDER_PRIORITY_VARIANTS[detail.priority]}>
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {WORK_ORDER_PRIORITY_LABELS[detail.priority]}
                  </Badge>
                )}
              </>
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
                      {detail.resourceLabel}
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
                  {detail.vehicleEngineHours != null && (
                    <div>
                      <span className="text-muted-foreground">Horómetro: </span>
                      <span>{detail.vehicleEngineHours} hs</span>
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
                      {formatDateOnly(detail.plannedStartDate)} - {formatDateOnly(detail.plannedEndDate)}
                    </span>
                  </div>
                  {detail.actualStartDate && (
                    <div>
                      <span className="text-muted-foreground">Inicio real: </span>
                      <span>{formatDateTime(detail.actualStartDate)}</span>
                    </div>
                  )}
                  {detail.actualEndDate && (
                    <div>
                      <span className="text-muted-foreground">Fin real: </span>
                      <span>{formatDateTime(detail.actualEndDate)}</span>
                    </div>
                  )}
                  {detail.totalPausedTime && detail.totalPausedTime !== '00:00:00' && (
                    <div>
                      <span className="text-muted-foreground">Tiempo pausado: </span>
                      <span className="text-orange-600">{detail.totalPausedTime}</span>
                    </div>
                  )}
                  {/* Issue 7: Mostrar tiempo real de trabajo en OTs completadas */}
                  {realWorkTime && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Tiempo real de trabajo: </span>
                      <span className="font-medium text-green-600">{realWorkTime}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Info de pausa si está pausada - Issue 4: Mostrar quién pausó */}
              {isPaused && detail.pausedAt && (
                <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-2 text-orange-600 font-medium mb-1">
                    <Pause className="h-4 w-4" />
                    Orden pausada
                  </div>
                  {detail.pauseReason && <p className="text-sm">{detail.pauseReason}</p>}
                  <div className="flex flex-col gap-1 mt-1">
                    <p className="text-xs text-muted-foreground">Desde: {formatDateTime(detail.pausedAt)}</p>
                    {detail.pausedBy && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Pausado por: {detail.pausedBy}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <Separator />

              {/* Items / Trabajos */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Trabajos a realizar ({detail.totalItems})</Label>
                  <span className="text-xs text-muted-foreground">
                    {detail.completedItems}/{detail.totalItems} completados
                  </span>
                </div>

                {/* Barra de progreso */}
                {detail.totalItems > 0 && (
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(detail.completedItems / detail.totalItems) * 100}%` }}
                    />
                  </div>
                )}

                {/* Issue 3: Botón para completar seleccionados */}
                {isInProgress && selectedRepairs.size > 0 && (
                  <PermissionGuard module="mantenimiento" tab="ordenes_trabajo" action="update">
                    <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-950/50 rounded-lg border border-blue-200">
                      <span className="text-sm text-blue-700 dark:text-blue-300">
                        {selectedRepairs.size} trabajo(s) seleccionado(s)
                      </span>
                      <Button
                        size="sm"
                        onClick={handleCompleteSelectedRepairs}
                        disabled={isSubmitting}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Completar seleccionados
                      </Button>
                    </div>
                  </PermissionGuard>
                )}

                <div className="space-y-4">
                  {detail.items.map((item) => {
                    const isItemCompleted = item.status === 'completed';

                    return (
                      <div key={item.id} className="p-3 rounded-lg border bg-muted/30">
                        {/* Header del desvío */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{item.itemLabel}</p>
                            {item.sectionCode && (
                              <p className="text-xs text-muted-foreground">Sección: {item.sectionCode}</p>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {item.completedRepairs}/{item.totalRepairs}
                          </span>
                        </div>

                        {/* Fotos del ítem: el técnico necesita ver la falla antes de intervenir */}
                        <RepairItemPhotos images={item.itemImages} label={item.itemLabel} size="sm" className="mb-2" />

                        {/* Comentarios del desvío */}
                        <div className="mb-2">
                          <ItemComments item={item} source={null} />
                        </div>

                        {/* Lista de trabajos (repairs) individuales */}
                        <div className="space-y-2 mt-3 border-t pt-3">
                          {item.repairs.map((repair) => {
                            const isRepairCompleted = repair.status === 'completed';
                            const isRepairPending = repair.status === 'pending';
                            // Solo permitir seleccionar si la OT está en progreso (NO pausada) y el repair está pendiente
                            const canSelect = isInProgress && isRepairPending;
                            const isSelected = selectedRepairs.has(repair.id);

                            return (
                              <div
                                key={repair.id}
                                className={`flex items-center gap-3 p-2 rounded-md ${
                                  isRepairCompleted
                                    ? 'bg-green-50 dark:bg-green-950/50'
                                    : isSelected
                                      ? 'bg-blue-50 dark:bg-blue-950/50 border border-blue-300'
                                      : 'bg-background hover:bg-muted/50'
                                }`}
                              >
                                {/* Issue 3: Checkbox para selección, no para completar directamente */}
                                {canSelect ? (
                                  <PermissionGuard module="mantenimiento" tab="ordenes_trabajo" action="update">
                                    <Checkbox
                                      checked={isSelected}
                                      disabled={isSubmitting}
                                      onCheckedChange={() => handleToggleRepairSelection(repair.id)}
                                    />
                                  </PermissionGuard>
                                ) : isRepairCompleted ? (
                                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                                ) : (
                                  <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                )}

                                <div className="flex-1 min-w-0">
                                  <p
                                    className={`text-sm ${isRepairCompleted ? 'line-through text-muted-foreground' : ''}`}
                                  >
                                    {repair.repairTypeName}
                                  </p>
                                  {repair.technicianNotes && (
                                    <p className="text-xs text-blue-600 truncate">{repair.technicianNotes}</p>
                                  )}
                                  {repair.completedAt && (
                                    <p className="text-xs text-muted-foreground">
                                      {formatDateShort(repair.completedAt)}{' '}
                                      {formatDateTime(repair.completedAt, 'HH:mm')}
                                    </p>
                                  )}
                                </div>

                                <Badge
                                  variant={isRepairCompleted ? 'success' : 'secondary'}
                                  className="text-xs flex-shrink-0"
                                >
                                  {WORK_ORDER_ITEM_STATUS_LABELS[repair.status]}
                                </Badge>
                              </div>
                            );
                          })}
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
                  disabled={isFinished}
                  rows={3}
                />
                {!isFinished && notes !== detail.notes && (
                  <Button variant="outline" size="sm" onClick={handleSaveNotes} disabled={isSubmitting}>
                    Guardar notas
                  </Button>
                )}
              </div>

              {/* Formulario de pausa */}
              {showPauseForm && isInProgress && (
                <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg space-y-2 border border-orange-200">
                  <Label className="text-orange-600">Razón de la pausa *</Label>
                  <Textarea
                    value={pauseReason}
                    onChange={(e) => setPauseReason(e.target.value)}
                    placeholder="Explique por qué se pausa esta orden (ej: esperando repuestos, priorizar otra OT)..."
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handlePauseOrder}
                      disabled={isSubmitting || pauseReason.trim().length < 5}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Confirmar pausa
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowPauseForm(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {/* Issue 6: Formulario de finalización parcial */}
              {showPartialCompleteForm && (isInProgress || isPaused) && canFinishPartial && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg space-y-2 border border-yellow-200">
                  <Label className="text-yellow-700">Razón de finalización parcial (opcional)</Label>
                  <Textarea
                    value={partialCompleteReason}
                    onChange={(e) => setPartialCompleteReason(e.target.value)}
                    placeholder="Explique por qué se finaliza con tareas pendientes (ej: equipo necesario urgente, repuestos no disponibles)..."
                    rows={2}
                  />
                  <p className="text-xs text-yellow-600">
                    Se completarán {detail.completedItems} de {detail.totalItems} trabajos. Los pendientes quedarán
                    registrados.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleCompleteOrderPartial}
                      disabled={isSubmitting}
                      className="bg-yellow-600 hover:bg-yellow-700"
                    >
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Confirmar finalización parcial
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowPartialCompleteForm(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {/* Formulario de cancelación */}
              {showCancelForm && !isFinished && (
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
                    <p className="text-xs text-muted-foreground mt-1">{formatDateTime(detail.cancelledAt)}</p>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        ) : null}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {/* Issue 6: Mostrar "Finalizar con pendientes" en lugar de "Cancelar" si hay al menos una tarea completada */}
          {!isFinished && !showCancelForm && !showPauseForm && !showPartialCompleteForm && (
            <PermissionGuard module="mantenimiento" tab="ordenes_trabajo" action="update">
              {canFinishPartial ? (
                <Button
                  variant="outline"
                  onClick={() => setShowPartialCompleteForm(true)}
                  disabled={isSubmitting}
                  className="text-yellow-600 hover:text-yellow-700 border-yellow-300"
                >
                  Finalizar con pendientes
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setShowCancelForm(true)}
                  disabled={isSubmitting}
                  className="text-red-600 hover:text-red-700"
                >
                  Cancelar Orden
                </Button>
              )}
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

          {/* Issue 5: Ocultar botón Pausar si todas las tareas están completas */}
          {isInProgress && !allRepairsCompleted && !showPauseForm && !showPartialCompleteForm && (
            <PermissionGuard module="mantenimiento" tab="ordenes_trabajo" action="update">
              <Button
                variant="outline"
                onClick={() => setShowPauseForm(true)}
                disabled={isSubmitting}
                className="text-orange-600 hover:text-orange-700 border-orange-300"
              >
                <Pause className="mr-2 h-4 w-4" />
                Pausar
              </Button>
            </PermissionGuard>
          )}

          {isPaused && (
            <PermissionGuard module="mantenimiento" tab="ordenes_trabajo" action="update">
              <Button onClick={handleResumeOrder} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                Reanudar
              </Button>
            </PermissionGuard>
          )}

          {isInProgress && allRepairsCompleted && !showPauseForm && !showPartialCompleteForm && (
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
