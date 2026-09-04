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
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { ActivityHistoryModal } from '@/features/Mantenimiento/components/ActivityHistoryModal';
import { invalidateAllMaintenanceQueries } from '@/features/Mantenimiento/utils/queryInvalidation';
import { Logger } from '@/lib/logger';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  Check,
  Clock,
  FileText,
  MessageSquare,
  RotateCcw,
  ShieldCheck,
  Truck,
  Wrench,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  approveTask,
  reassignTaskToSector,
  rejectTask,
  type PendingTaskData,
  type PendingTasksData,
  type ReturnedTaskData,
  type ReturnedTasksData,
  type ValidationOrdersData,
} from '../actions/actionsServer';
import { usePendingTasks, useReturnedTasks, useValidationOrders } from '../hooks/useApprovalInbox';
import { _ValidationOrdersDataTable } from './_ValidationOrdersDataTable';

const logger = new Logger('ApprovalInbox');

// =============================================================================
// HELPERS — Extraer info nested de tareas de aprobacion/reasignacion
// =============================================================================

function getRepairTypeName(task: PendingTaskData | ReturnedTaskData | null): string {
  if (!task) return 'Sin tipo';
  const rt = task.types_of_repairs;
  if (rt && typeof rt === 'object' && 'name' in rt) {
    return String(rt.name);
  }
  return 'Sin tipo';
}

function getMaintenanceOrderItems(task: PendingTaskData | ReturnedTaskData) {
  const woItems = task.work_order_items;
  if (!woItems || typeof woItems !== 'object') return null;
  const moItems = 'maintenance_order_items' in woItems ? woItems.maintenance_order_items : null;
  if (!moItems || typeof moItems !== 'object') return null;
  return moItems;
}

function getVehicleInfo(task: PendingTaskData | ReturnedTaskData): {
  domain: string;
  serie: string;
  internNumber: string;
} {
  const moItems = getMaintenanceOrderItems(task);
  if (!moItems) return { domain: '-', serie: '-', internNumber: '-' };
  const mo = 'maintenance_orders' in moItems ? moItems.maintenance_orders : null;
  if (!mo || typeof mo !== 'object') return { domain: '-', serie: '-', internNumber: '-' };
  const vehicle = 'vehicles' in mo ? mo.vehicles : null;
  if (!vehicle || typeof vehicle !== 'object') return { domain: '-', serie: '-', internNumber: '-' };
  return {
    domain: 'domain' in vehicle ? String(vehicle.domain || '-') : '-',
    serie: 'serie' in vehicle ? String(vehicle.serie || '-') : '-',
    internNumber: 'intern_number' in vehicle ? String(vehicle.intern_number || '-') : '-',
  };
}

function getVehicleLabel(task: PendingTaskData | ReturnedTaskData): string {
  const info = getVehicleInfo(task);
  if (info.domain !== '-') return info.domain;
  if (info.serie !== '-') return info.serie;
  if (info.internNumber !== '-') return `N° ${info.internNumber}`;
  return '-';
}

function getOrderNumber(task: PendingTaskData | ReturnedTaskData): string | null {
  const moItems = getMaintenanceOrderItems(task);
  if (!moItems) return null;
  const mo = 'maintenance_orders' in moItems ? moItems.maintenance_orders : null;
  if (!mo || typeof mo !== 'object') return null;
  return 'order_number' in mo ? (mo.order_number as string | null) : null;
}

function getSectorName(task: PendingTaskData | ReturnedTaskData): string {
  const moItems = getMaintenanceOrderItems(task);
  if (!moItems) return '-';
  const ws = 'workshop_sectors' in moItems ? moItems.workshop_sectors : null;
  if (!ws || typeof ws !== 'object') return '-';
  return 'name' in ws ? String(ws.name) : '-';
}

function getItemDescription(task: PendingTaskData | ReturnedTaskData): string | null {
  const moItems = getMaintenanceOrderItems(task);
  if (!moItems) return null;
  return 'description' in moItems ? (moItems.description as string | null) : null;
}

function getDriverComment(task: PendingTaskData | ReturnedTaskData): string | null {
  const moItems = getMaintenanceOrderItems(task);
  if (!moItems) return null;
  const reqItem = 'maintenance_request_items' in moItems ? moItems.maintenance_request_items : null;
  if (!reqItem || typeof reqItem !== 'object') return null;
  return 'driver_comment' in reqItem ? (reqItem.driver_comment as string | null) : null;
}

function getWorkOrderId(task: PendingTaskData | ReturnedTaskData): string | null {
  const woItems = task.work_order_items;
  if (!woItems || typeof woItems !== 'object') return null;
  return 'work_order_id' in woItems ? (woItems.work_order_id as string | null) ?? null : null;
}

function getAddedByName(task: PendingTaskData): string | null {
  const user = task.added_by_user;
  if (!user || typeof user !== 'object') return null;
  if ('fullname' in user && user.fullname) return String(user.fullname);
  if ('email' in user && user.email) return String(user.email);
  return null;
}

// =============================================================================
// COMPONENT
// =============================================================================

interface ApprovalInboxClientProps {
  initialValidationOrders: ValidationOrdersData;
  initialPendingTasks: PendingTasksData;
  initialReturnedTasks: ReturnedTasksData;
  sectors: Array<{ id: string; name: string }>;
}

export function ApprovalInboxClient({
  initialValidationOrders,
  initialPendingTasks,
  initialReturnedTasks,
  sectors,
}: ApprovalInboxClientProps) {
  const queryClient = useQueryClient();
  const { data: validationOrders } = useValidationOrders(initialValidationOrders);
  const { data: pendingTasks } = usePendingTasks(initialPendingTasks);
  const { data: returnedTasks } = useReturnedTasks(initialReturnedTasks);

  // Modal states for indicators
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [showReturnedModal, setShowReturnedModal] = useState(false);

  // History modal state
  const [historyWoId, setHistoryWoId] = useState<string | null>(null);

  // Approve task dialog state
  const [approveTarget, setApproveTarget] = useState<PendingTaskData | null>(null);
  const [isApproving, setIsApproving] = useState(false);

  // Reject task dialog state
  const [rejectTarget, setRejectTarget] = useState<PendingTaskData | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Reassign task dialog state
  const [reassignTarget, setReassignTarget] = useState<ReturnedTaskData | null>(null);
  const [newSectorId, setNewSectorId] = useState('');
  const [isReassigning, setIsReassigning] = useState(false);

  // Handlers
  const handleApprove = async () => {
    if (!approveTarget) return;
    setIsApproving(true);
    try {
      await approveTask(approveTarget.id);
      toast.success('Tarea aprobada');
      invalidateAllMaintenanceQueries(queryClient);
    } catch (error) {
      logger.error('Error aprobando tarea', { data: { error } });
      toast.error(error instanceof Error ? error.message : 'Error al aprobar');
    } finally {
      setIsApproving(false);
      setApproveTarget(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) {
      toast.error('Debe indicar un motivo');
      return;
    }
    setIsRejecting(true);
    try {
      await rejectTask(rejectTarget.id, rejectReason.trim());
      toast.success('Tarea rechazada');
      invalidateAllMaintenanceQueries(queryClient);
      setRejectTarget(null);
      setRejectReason('');
    } catch (error) {
      logger.error('Error rechazando tarea', { data: { error } });
      toast.error(error instanceof Error ? error.message : 'Error al rechazar');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleReassign = async () => {
    if (!reassignTarget || !newSectorId) {
      toast.error('Seleccione un sector');
      return;
    }
    setIsReassigning(true);
    try {
      await reassignTaskToSector(reassignTarget.id, newSectorId);
      toast.success('Tarea reasignada');
      invalidateAllMaintenanceQueries(queryClient);
      setReassignTarget(null);
      setNewSectorId('');
    } catch (error) {
      logger.error('Error reasignando tarea', { data: { error } });
      toast.error(error instanceof Error ? error.message : 'Error al reasignar');
    } finally {
      setIsReassigning(false);
    }
  };

  const pendingCount = pendingTasks?.length ?? 0;
  const returnedCount = returnedTasks?.length ?? 0;

  return (
    <>
      {/* ── Indicadores — siempre visibles, deshabilitados si no hay pendientes ── */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => pendingCount > 0 && setShowPendingModal(true)}
          disabled={pendingCount === 0}
          className={cn(
            'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
            pendingCount > 0
              ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-950/60 cursor-pointer'
              : 'border-muted bg-muted/40 text-muted-foreground cursor-default opacity-60'
          )}
        >
          <ShieldCheck className="h-4 w-4" />
          Autorizaciones
          {pendingCount > 0 ? (
            <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1.5">
              {pendingCount}
            </Badge>
          ) : (
            <span className="ml-1 text-xs">— sin pendientes</span>
          )}
        </button>

        <button
          onClick={() => returnedCount > 0 && setShowReturnedModal(true)}
          disabled={returnedCount === 0}
          className={cn(
            'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
            returnedCount > 0
              ? 'border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300 dark:hover:bg-orange-950/60 cursor-pointer'
              : 'border-muted bg-muted/40 text-muted-foreground cursor-default opacity-60'
          )}
        >
          <RotateCcw className="h-4 w-4" />
          Reasignaciones
          {returnedCount > 0 ? (
            <Badge variant="warning" className="ml-1 h-5 min-w-5 px-1.5">
              {returnedCount}
            </Badge>
          ) : (
            <span className="ml-1 text-xs">— sin pendientes</span>
          )}
        </button>
      </div>

      {/* ── Tabla principal: Ordenes pendientes de validacion ── */}
      <Card>
        <CardContent className="pt-6">
          <_ValidationOrdersDataTable validationOrders={validationOrders ?? []} />
        </CardContent>
      </Card>

      {/* ── Modal: Autorizaciones (tareas pendientes de aprobacion) ── */}
      <Dialog open={showPendingModal} onOpenChange={setShowPendingModal}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Autorizaciones pendientes
            </DialogTitle>
          </DialogHeader>
          {!pendingTasks || pendingTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No hay tareas pendientes de autorizacion</p>
          ) : (
            <div className="space-y-3">
              {pendingTasks.map((task) => {
                const orderNumber = getOrderNumber(task);
                const driverComment = getDriverComment(task);
                const itemDescription = getItemDescription(task);
                const addedBy = getAddedByName(task);
                const techNotes = task.technician_notes;

                return (
                  <Card key={task.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {orderNumber && (
                            <Badge variant="default" className="text-xs">
                              {orderNumber}
                            </Badge>
                          )}
                          <div className="flex items-center gap-1">
                            <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm font-medium">{getVehicleLabel(task)}</span>
                          </div>
                          <Badge variant="secondary">{getSectorName(task)}</Badge>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Ver historial"
                            onClick={() => setHistoryWoId(getWorkOrderId(task))}
                            disabled={!getWorkOrderId(task)}
                          >
                            <Clock className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-600 h-8"
                            onClick={() => setApproveTarget(task)}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Aprobar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 h-8"
                            onClick={() => setRejectTarget(task)}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Rechazar
                          </Button>
                        </div>
                      </div>

                      {/* Repair type */}
                      <div className="flex items-center gap-1.5 mt-2">
                        <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">{getRepairTypeName(task)}</span>
                        <Badge variant="warning" className="text-[10px]">
                          Autorizable
                        </Badge>
                      </div>

                      {/* Additional info */}
                      {(itemDescription || driverComment || techNotes || addedBy) && (
                        <>
                          <Separator className="my-2" />
                          <div className="space-y-1.5 text-xs text-muted-foreground">
                            {itemDescription && (
                              <div className="flex items-start gap-1.5">
                                <FileText className="h-3 w-3 mt-0.5 shrink-0" />
                                <span>{itemDescription}</span>
                              </div>
                            )}
                            {driverComment && (
                              <div className="flex items-start gap-1.5">
                                <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
                                <span>Chofer: {driverComment}</span>
                              </div>
                            )}
                            {techNotes && (
                              <div className="flex items-start gap-1.5">
                                <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
                                <span>Operario: {techNotes}</span>
                              </div>
                            )}
                            {addedBy && <div className="text-xs text-muted-foreground/70">Agregado por: {addedBy}</div>}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Modal: Reasignaciones (tareas devueltas) ── */}
      <Dialog open={showReturnedModal} onOpenChange={setShowReturnedModal}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Reasignaciones pendientes
            </DialogTitle>
          </DialogHeader>
          {!returnedTasks || returnedTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No hay tareas devueltas para reasignacion</p>
          ) : (
            <div className="space-y-3">
              {returnedTasks.map((task) => {
                const orderNumber = getOrderNumber(task);
                const returnReason = task.return_reason;
                const itemDescription = getItemDescription(task);
                const originalSectorName =
                  task.original_sector && typeof task.original_sector === 'object' && 'name' in task.original_sector
                    ? String(task.original_sector.name)
                    : null;

                return (
                  <Card key={task.id} className="overflow-hidden border-l-4 border-l-orange-400">
                    <CardContent className="p-4">
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {orderNumber && (
                            <Badge variant="default" className="text-xs">
                              {orderNumber}
                            </Badge>
                          )}
                          <div className="flex items-center gap-1">
                            <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm font-medium">{getVehicleLabel(task)}</span>
                          </div>
                          {originalSectorName && <Badge variant="warning">{originalSectorName}</Badge>}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Ver historial"
                            onClick={() => setHistoryWoId(getWorkOrderId(task))}
                            disabled={!getWorkOrderId(task)}
                          >
                            <Clock className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" className="h-8" onClick={() => setReassignTarget(task)}>
                            <ArrowRight className="h-4 w-4 mr-1" />
                            Reasignar
                          </Button>
                        </div>
                      </div>

                      {/* Repair type */}
                      <div className="flex items-center gap-1.5 mt-2">
                        <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">{getRepairTypeName(task)}</span>
                      </div>

                      {/* Return reason - prominent */}
                      {returnReason && (
                        <>
                          <Separator className="my-2" />
                          <div className="flex items-start gap-1.5 bg-orange-50 dark:bg-orange-950/30 p-2 rounded-md">
                            <RotateCcw className="h-3.5 w-3.5 mt-0.5 shrink-0 text-orange-600" />
                            <div>
                              <span className="text-xs font-medium text-orange-700 dark:text-orange-400">
                                Motivo de devolucion:
                              </span>
                              <p className="text-sm text-foreground">{returnReason}</p>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Description */}
                      {itemDescription && !returnReason && (
                        <>
                          <Separator className="my-2" />
                          <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                            <FileText className="h-3 w-3 mt-0.5 shrink-0" />
                            <span>{itemDescription}</span>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Aprobar task confirmation ── */}
      <AlertDialog open={!!approveTarget} onOpenChange={(open) => !open && setApproveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aprobar tarea</AlertDialogTitle>
            <AlertDialogDescription>
              La tarea de tipo &quot;{getRepairTypeName(approveTarget)}&quot; sera aprobada y pasara a estado pendiente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} disabled={isApproving}>
              {isApproving ? 'Aprobando...' : 'Aprobar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Rechazar task dialog ── */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Rechazar tarea</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Tipo de reparacion: <strong>{getRepairTypeName(rejectTarget)}</strong>
            </p>
            <div className="space-y-2">
              <Label>Motivo del rechazo</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Indicar el motivo del rechazo..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={isRejecting || !rejectReason.trim()}>
              {isRejecting ? 'Rechazando...' : 'Rechazar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reasignar task dialog ── */}
      <Dialog open={!!reassignTarget} onOpenChange={(open) => !open && setReassignTarget(null)}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reasignar a sector</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Tipo de reparacion: <strong>{getRepairTypeName(reassignTarget)}</strong>
            </p>
            {reassignTarget?.return_reason && (
              <div className="bg-orange-50 dark:bg-orange-950/30 p-3 rounded-md">
                <p className="text-xs font-medium text-orange-700 dark:text-orange-400 mb-1">Motivo de devolucion:</p>
                <p className="text-sm">{String(reassignTarget.return_reason)}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Nuevo sector</Label>
              <Select value={newSectorId} onValueChange={setNewSectorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar sector" />
                </SelectTrigger>
                <SelectContent>
                  {sectors.map((sector) => (
                    <SelectItem key={sector.id} value={sector.id}>
                      {sector.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignTarget(null)}>
              Cancelar
            </Button>
            <Button onClick={handleReassign} disabled={isReassigning || !newSectorId}>
              {isReassigning ? 'Reasignando...' : 'Reasignar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ActivityHistoryModal
        open={!!historyWoId}
        onClose={() => setHistoryWoId(null)}
        workOrderId={historyWoId}
        title="Historial de OT"
      />
    </>
  );
}
