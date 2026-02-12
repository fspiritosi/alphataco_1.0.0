'use client';

import { useOperatorContext } from '@/app/operator/operator-layout-provider';
import { Button } from '@/components/ui/button';
import { Logger } from '@/lib/logger';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Plus } from 'lucide-react';
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
import { TaskList } from './WorkOrderDetail/TaskList';
import { WorkOrderHeader } from './WorkOrderDetail/WorkOrderHeader';

const logger = new Logger('WorkOrderDetail');

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

  if (!data) return null;

  // --- Mutations ---

  const startMutation = useMutation({
    mutationFn: () => startWorkOrder(data.id),
    onSuccess: () => {
      toast.success('Orden de trabajo iniciada');
      queryClient.invalidateQueries({ queryKey: ['operator-work-order', data.id] });
      queryClient.invalidateQueries({ queryKey: ['operator-work-orders'] });
    },
    onError: (error) => {
      logger.error('Error starting work order', { data: { error } });
      toast.error(error instanceof Error ? error.message : 'Error al iniciar la orden de trabajo');
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

  // --- Derived data ---

  const workOrderItems = data.work_order_items || [];
  const allRepairs = workOrderItems.flatMap((item) => item.work_order_item_repairs || []);
  const completedRepairs = allRepairs.filter((r) => r.status === 'completed');

  // Extract maintenance order info through nested relationship
  type MoItem = {
    maintenance_orders?: {
      id?: string;
      order_number?: string;
      vehicles?: {
        domain?: string;
        serie?: string;
        intern_number?: string;
        kilometer?: number;
        engine_hours?: string | null;
      } | null;
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
  const maintenanceOrderId = maintenanceOrders?.id || '';

  // --- Handlers ---

  const handleToggleRepair = (repairId: string, isCompleted: boolean) => {
    if (isCompleted) {
      uncompleteMutation.mutate(repairId);
    } else {
      completeMutation.mutate(repairId);
    }
  };

  const handleNotesChange = (repairId: string, notes: string) => {
    setTechnicianNotes((prev) => ({ ...prev, [repairId]: notes }));
  };

  const handleNotesSave = (repairId: string, notes: string) => {
    notesMutation.mutate({ repairId, notes });
  };

  // Normalize workOrderItems for TaskList
  const normalizedItems = workOrderItems.map((item) => ({
    id: item.id,
    status: item.status,
    work_order_item_repairs: item.work_order_item_repairs,
    maintenance_order_items: Array.isArray(item.maintenance_order_items)
      ? (item.maintenance_order_items as Array<{ description?: string | null }>)[0] || null
      : item.maintenance_order_items,
  }));

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <WorkOrderHeader
        orderNumber={data.order_number}
        maintenanceOrderNumber={maintenanceOrders?.order_number || '-'}
        status={data.status}
        priority={data.priority}
        plannedStartDate={data.planned_start_date}
        vehicle={vehicle || null}
        completedCount={completedRepairs.length}
        totalCount={allRepairs.length}
        onStart={() => startMutation.mutate()}
        isStarting={startMutation.isPending}
      />

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
        <div className="p-4 sm:p-5">
          <TaskList
            workOrderItems={normalizedItems}
            technicianNotes={technicianNotes}
            isMutating={completeMutation.isPending || uncompleteMutation.isPending}
            onToggleRepair={handleToggleRepair}
            onNotesChange={handleNotesChange}
            onNotesSave={handleNotesSave}
            onReturnTask={(repairId) => setReturnTaskRepairId(repairId)}
          />
        </div>
      </div>

      {/* Footer - floating action bar */}
      <div className="flex-none border-t bg-card p-3 sm:p-4">
        <div className="flex gap-2">
          <Button onClick={() => setAddTaskOpen(true)} variant="outline" className="flex-1 h-11 gap-2">
            <Plus className="h-4 w-4" />
            Agregar Tarea
          </Button>
          <Button
            onClick={() => setCloseWoOpen(true)}
            variant="default"
            className="flex-1 h-11 gap-2"
            disabled={data.status === 'completed' || data.status === 'completed_partial'}
          >
            <CheckCircle2 className="h-4 w-4" />
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
