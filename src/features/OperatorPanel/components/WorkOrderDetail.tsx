'use client';

import { useOperatorContext } from '@/app/operator/operator-layout-provider';
import type { BadgeProps } from '@/components/ui/badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Logger } from '@/lib/logger';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, Plus, Stethoscope } from 'lucide-react';
import moment from 'moment';
import 'moment/locale/es';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import type { OperatorWorkOrderDetail } from '../actions/actionsServer';
import {
  completeRepair,
  getWorkOrderDetailForOperator,
  startWorkOrder,
  uncompleteRepair,
  updateTechnicianNotes,
} from '../actions/actionsServer';
import { AddTaskDialog } from './AddTaskDialog';
import { CloseWorkOrderDialog } from './CloseWorkOrderDialog';
import { ReturnTaskDialog } from './ReturnTaskDialog';

const logger = new Logger('WorkOrderDetail');

type BadgeVariant = NonNullable<BadgeProps['variant']>;

const statusVariants: Record<string, BadgeVariant> = {
  pending: 'secondary',
  in_progress: 'default',
  paused: 'warning',
  completed: 'success',
  completed_partial: 'success',
  pending_approval: 'warning',
  approved: 'success',
  rejected: 'destructive',
  reassignment_requested: 'destructive',
};

const priorityVariants: Record<string, BadgeVariant> = {
  urgent: 'destructive',
  high: 'warning',
  medium: 'default',
  low: 'secondary',
};

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En Progreso',
  paused: 'Pausada',
  completed: 'Completada',
  completed_partial: 'Completada Parcial',
  pending_approval: 'Pendiente Aprobación',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  reassignment_requested: 'Reasignación Solicitada',
};

const priorityLabels: Record<string, string> = {
  urgent: 'Urgente',
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
};

const criticityVariants: Record<string, BadgeVariant> = {
  critica: 'destructive',
  alta: 'warning',
  media: 'default',
  baja: 'secondary',
};

export function WorkOrderDetail({ initialData }: { initialData: OperatorWorkOrderDetail }) {
  const { sectorId } = useOperatorContext();
  const queryClient = useQueryClient();

  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [closeWoOpen, setCloseWoOpen] = useState(false);
  const [returnTaskRepairId, setReturnTaskRepairId] = useState<string | null>(null);
  const [technicianNotes, setTechnicianNotes] = useState<Record<string, string>>(() => {
    const notes: Record<string, string> = {};
    initialData.work_order_items?.forEach((item) => {
      item.work_order_item_repairs?.forEach((repair) => {
        if (repair.technician_notes) {
          notes[repair.id] = repair.technician_notes;
        }
      });
    });
    return notes;
  });

  const { data } = useQuery({
    queryKey: ['operator-work-order', initialData.id],
    queryFn: () => getWorkOrderDetailForOperator(initialData.id, sectorId),
    initialData,
    refetchInterval: 30000,
  });

  if (!data) {
    return null;
  }

  const startMutation = useMutation({
    mutationFn: () => startWorkOrder(data.id),
    onSuccess: () => {
      toast.success('Orden de trabajo iniciada');
      queryClient.invalidateQueries({ queryKey: ['operator-work-order', data.id] });
      queryClient.invalidateQueries({ queryKey: ['operator-work-orders'] });
    },
    onError: (error) => {
      logger.error('Error starting work order', { data: { error } });
      const message = error instanceof Error ? error.message : 'Error al iniciar la orden de trabajo';
      toast.error(message);
    },
  });

  const completeMutation = useMutation({
    mutationFn: (repairId: string) => completeRepair(repairId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operator-work-order', data.id] });
    },
    onError: (error) => {
      logger.error('Error completing repair', { data: { error } });
      toast.error('Error al completar la tarea');
    },
  });

  const uncompleteMutation = useMutation({
    mutationFn: (repairId: string) => uncompleteRepair(repairId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operator-work-order', data.id] });
    },
    onError: (error) => {
      logger.error('Error uncompleting repair', { data: { error } });
      toast.error('Error al desmarcar la tarea');
    },
  });

  const notesMutation = useMutation({
    mutationFn: ({ repairId, notes }: { repairId: string; notes: string }) => updateTechnicianNotes(repairId, notes),
    onSuccess: () => {
      toast.success('Notas guardadas');
      queryClient.invalidateQueries({ queryKey: ['operator-work-order', data.id] });
    },
    onError: (error) => {
      logger.error('Error updating notes', { data: { error } });
      toast.error('Error al guardar las notas');
    },
  });

  // Calculate progress
  const workOrderItems = data.work_order_items || [];
  const allRepairs = workOrderItems.flatMap((item) => item.work_order_item_repairs || []);
  const completedRepairs = allRepairs.filter((r) => r.status === 'completed');
  const totalRepairs = allRepairs.length;
  const progressPercentage = totalRepairs > 0 ? (completedRepairs.length / totalRepairs) * 100 : 0;

  // DIAGNÓSTICO blocking logic
  const diagnosticoRepair = allRepairs.find((r) => r.is_diagnostico);
  const hasDiagnostico = !!diagnosticoRepair;
  const isDiagnosticoComplete = diagnosticoRepair?.status === 'completed';

  const handleToggleRepair = (repairId: string, isCompleted: boolean) => {
    if (isCompleted) {
      uncompleteMutation.mutate(repairId);
    } else {
      completeMutation.mutate(repairId);
    }
  };

  const handleNotesBlur = (repairId: string, notes: string) => {
    notesMutation.mutate({ repairId, notes });
  };

  // Get maintenance order data through the nested relationship
  // Note: Supabase returns foreign key relations as single objects, but TS infers them as arrays
  type MoItem = {
    maintenance_orders?: {
      id?: string;
      order_number?: string;
      vehicles?: { domain?: string; serie?: string; intern_number?: string; kilometer?: number; engine_hours?: string | null } | null;
    } | null;
    description?: string | null;
  };
  const firstItem = workOrderItems[0];
  const maintenanceOrderItem = (
    Array.isArray(firstItem?.maintenance_order_items)
      ? firstItem.maintenance_order_items[0]
      : firstItem?.maintenance_order_items
  ) as MoItem | undefined;
  const maintenanceOrders = Array.isArray(maintenanceOrderItem?.maintenance_orders)
    ? maintenanceOrderItem.maintenance_orders[0]
    : maintenanceOrderItem?.maintenance_orders;
  const vehicle = Array.isArray(maintenanceOrders?.vehicles)
    ? maintenanceOrders.vehicles[0]
    : maintenanceOrders?.vehicles;
  const orderNumber = maintenanceOrders?.order_number || '-';
  const maintenanceOrderId = maintenanceOrders?.id || '';

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      {/* Header - Fixed */}
      <div className="flex-none border-b bg-card">
        <div className="p-4 space-y-4">
          {/* Back button and title */}
          <div className="flex items-center gap-3">
            <Link href="/operator/dashboard">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold truncate">OT {data.order_number}</h1>
              <p className="text-sm text-muted-foreground">OM {orderNumber}</p>
            </div>
            {data.status === 'pending' && (
              <Button onClick={() => startMutation.mutate()} disabled={startMutation.isPending} size="sm">
                Iniciar OT
              </Button>
            )}
          </div>

          {/* Vehicle info */}
          {vehicle && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Dominio:</span>
                <p className="font-medium">{vehicle.domain || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Serie:</span>
                <p className="font-medium">{vehicle.serie || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Interno:</span>
                <p className="font-medium">{vehicle.intern_number || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Km:</span>
                <p className="font-medium">{vehicle.kilometer ? vehicle.kilometer.toLocaleString() : '-'}</p>
              </div>
              {vehicle.engine_hours && (
                <div>
                  <span className="text-muted-foreground">Hs:</span>
                  <p className="font-medium">{vehicle.engine_hours} hs</p>
                </div>
              )}
            </div>
          )}

          {/* Status and priority badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant={statusVariants[data.status] || 'default'}>{statusLabels[data.status] || data.status}</Badge>
            {data.priority && (
              <Badge variant={priorityVariants[data.priority] || 'default'}>
                {priorityLabels[data.priority] || data.priority}
              </Badge>
            )}
            {data.planned_start_date && (
              <Badge variant="outline">
                Programada: {moment(data.planned_start_date).locale('es').format('DD/MM/YYYY')}
              </Badge>
            )}
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progreso</span>
              <span className="font-medium">
                {completedRepairs.length} de {totalRepairs} tareas completadas
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-3">
          {totalRepairs === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No hay tareas asignadas a esta orden de trabajo
              </CardContent>
            </Card>
          )}

          {/* DIAGNÓSTICO blocking banner */}
          {hasDiagnostico && !isDiagnosticoComplete && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-800 font-medium">
                Complete el DIAGNÓSTICO antes de continuar con otras tareas
              </p>
            </div>
          )}

          {/* DIAGNÓSTICO card (rendered first if exists) */}
          {diagnosticoRepair &&
            (() => {
              const diagIsCompleted = diagnosticoRepair.status === 'completed';
              const diagLocalNotes = technicianNotes[diagnosticoRepair.id] || diagnosticoRepair.technician_notes || '';

              return (
                <Card
                  className={`border-2 ${diagIsCompleted ? 'border-green-300 bg-green-50/30' : 'border-amber-300 bg-amber-50/30'}`}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id={diagnosticoRepair.id}
                        checked={diagIsCompleted}
                        onCheckedChange={() => handleToggleRepair(diagnosticoRepair.id, diagIsCompleted)}
                        disabled={completeMutation.isPending || uncompleteMutation.isPending}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0 space-y-2">
                        <label
                          htmlFor={diagnosticoRepair.id}
                          className={`font-medium cursor-pointer block flex items-center gap-2 ${diagIsCompleted ? 'line-through text-muted-foreground' : ''}`}
                        >
                          <Stethoscope className="h-4 w-4 text-amber-600 flex-shrink-0" />
                          DIAGNÓSTICO
                        </label>

                        <Badge variant="warning" className="text-xs">
                          {diagIsCompleted ? 'Completado' : 'Obligatorio'}
                        </Badge>

                        {/* Technician notes */}
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Notas del técnico:</label>
                          <Textarea
                            placeholder="Describir el diagnóstico realizado..."
                            value={diagLocalNotes}
                            onChange={(e) =>
                              setTechnicianNotes((prev) => ({ ...prev, [diagnosticoRepair.id]: e.target.value }))
                            }
                            onBlur={(e) => {
                              if (e.target.value !== (diagnosticoRepair.technician_notes || '')) {
                                handleNotesBlur(diagnosticoRepair.id, e.target.value);
                              }
                            }}
                            rows={2}
                            className="text-sm resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

          {/* Separator between DIAGNÓSTICO and regular tasks */}
          {hasDiagnostico && allRepairs.length > 1 && <Separator />}

          {/* Regular repair cards */}
          {workOrderItems.map((item) =>
            (item.work_order_item_repairs || [])
              .filter((repair) => !repair.is_diagnostico)
              .map((repair) => {
                const isCompleted = repair.status === 'completed';
                const isReassignmentRequested = repair.status === 'reassignment_requested';
                const repairType = repair.types_of_repairs;
                const localNotes = technicianNotes[repair.id] || repair.technician_notes || '';
                const isBlockedByDiag = hasDiagnostico && !isDiagnosticoComplete;

                return (
                  <Card
                    key={repair.id}
                    className={`${isCompleted ? 'bg-muted/30' : ''} ${isBlockedByDiag ? 'opacity-50' : ''}`}
                  >
                    <CardContent className="p-4 space-y-3">
                      {/* Checkbox and title */}
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={repair.id}
                          checked={isCompleted}
                          onCheckedChange={() => handleToggleRepair(repair.id, isCompleted)}
                          disabled={
                            isBlockedByDiag ||
                            isReassignmentRequested ||
                            completeMutation.isPending ||
                            uncompleteMutation.isPending
                          }
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0 space-y-2">
                          <label
                            htmlFor={repair.id}
                            className={`font-medium cursor-pointer block ${isCompleted ? 'line-through text-muted-foreground' : ''}`}
                          >
                            {repairType?.name || 'Tarea sin tipo'}
                          </label>

                          {/* Badges */}
                          <div className="flex flex-wrap gap-2">
                            {repairType?.criticity && (
                              <Badge variant={criticityVariants[repairType.criticity] || 'default'} className="text-xs">
                                {repairType.criticity}
                              </Badge>
                            )}
                            {repairType?.autorizable && (
                              <Badge variant="outline" className="text-xs">
                                Autorizable
                              </Badge>
                            )}
                            {repair.is_operator_added && (
                              <Badge variant="secondary" className="text-xs">
                                Agregado por operario
                              </Badge>
                            )}
                            {isReassignmentRequested && (
                              <Badge variant="destructive" className="text-xs">
                                Devolución solicitada
                              </Badge>
                            )}
                          </div>

                          {/* Description */}
                          {(() => {
                            const moItem = (
                              Array.isArray(item.maintenance_order_items)
                                ? item.maintenance_order_items[0]
                                : item.maintenance_order_items
                            ) as MoItem | undefined;
                            return moItem?.description ? (
                              <p className="text-sm text-muted-foreground">{moItem.description}</p>
                            ) : null;
                          })()}

                          {/* Return reason if present */}
                          {repair.return_reason && (
                            <div className="p-2 bg-destructive/10 rounded-md border border-destructive/20">
                              <p className="text-xs font-medium text-destructive">Motivo de devolución:</p>
                              <p className="text-sm text-destructive/80">{repair.return_reason}</p>
                            </div>
                          )}

                          {/* Technician notes */}
                          {!isBlockedByDiag && (
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-muted-foreground">Notas del técnico:</label>
                              <Textarea
                                placeholder="Agregar notas técnicas..."
                                value={localNotes}
                                onChange={(e) =>
                                  setTechnicianNotes((prev) => ({ ...prev, [repair.id]: e.target.value }))
                                }
                                onBlur={(e) => {
                                  if (e.target.value !== (repair.technician_notes || '')) {
                                    handleNotesBlur(repair.id, e.target.value);
                                  }
                                }}
                                rows={2}
                                className="text-sm resize-none"
                              />
                            </div>
                          )}

                          {/* Return button */}
                          {!isCompleted && !isReassignmentRequested && !isBlockedByDiag && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setReturnTaskRepairId(repair.id)}
                              className="w-full sm:w-auto"
                            >
                              Devolver
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
          )}
        </div>
      </div>

      {/* Footer - Fixed */}
      <div className="flex-none border-t bg-card p-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={() => setAddTaskOpen(true)} variant="outline" className="flex-1 sm:flex-none">
            <Plus className="h-4 w-4 mr-2" />
            Agregar Tarea
          </Button>
          <Button
            onClick={() => setCloseWoOpen(true)}
            variant="default"
            className="flex-1 sm:flex-none"
            disabled={data.status === 'completed' || data.status === 'completed_partial'}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Cerrar OT
          </Button>
        </div>
      </div>

      {/* Dialogs */}
      {addTaskOpen && (
        <AddTaskDialog
          workOrderId={data.id}
          maintenanceOrderId={maintenanceOrderId}
          open={addTaskOpen}
          onClose={() => setAddTaskOpen(false)}
        />
      )}
      {returnTaskRepairId && (
        <ReturnTaskDialog
          repairId={returnTaskRepairId}
          open={!!returnTaskRepairId}
          onClose={() => setReturnTaskRepairId(null)}
        />
      )}
      {closeWoOpen && (
        <CloseWorkOrderDialog
          workOrderId={data.id}
          workOrderItems={workOrderItems}
          open={closeWoOpen}
          onClose={() => setCloseWoOpen(false)}
        />
      )}
    </div>
  );
}
