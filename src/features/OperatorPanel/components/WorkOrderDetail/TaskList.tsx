'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Play, Stethoscope } from 'lucide-react';
import { DiagnosticoCard } from './DiagnosticoCard';
import { TaskCard } from './TaskCard';

interface RepairData {
  id: string;
  status: string | null;
  technician_notes: string | null;
  return_reason: string | null;
  rejection_reason: string | null;
  is_operator_added: boolean | null;
  is_diagnostico: boolean;
  types_of_repairs: {
    id: string;
    name: string | null;
    criticity: string | null;
    autorizable: boolean | null;
  } | null;
}

interface WorkOrderItemData {
  id: string;
  status: string | null;
  work_order_item_repairs: RepairData[] | null;
  maintenance_order_items: {
    description?: string | null;
  } | null;
}

interface TaskListProps {
  workOrderItems: WorkOrderItemData[];
  workOrderStatus: string;
  technicianNotes: Record<string, string>;
  isMutating: boolean;
  onToggleRepair: (repairId: string, isCompleted: boolean) => void;
  onNotesChange: (repairId: string, notes: string) => void;
  onNotesSave: (repairId: string, notes: string) => void;
  onReturnTask: (repairId: string) => void;
}

const criticityOrder: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function TaskList({
  workOrderItems,
  workOrderStatus,
  technicianNotes,
  isMutating,
  onToggleRepair,
  onNotesChange,
  onNotesSave,
  onReturnTask,
}: TaskListProps) {
  const allRepairs = workOrderItems.flatMap((item) => item.work_order_item_repairs || []);
  const diagnosticoRepair = allRepairs.find((r) => r.is_diagnostico);
  const hasDiagnostico = !!diagnosticoRepair;
  const isDiagnosticoComplete = diagnosticoRepair?.status === 'completed';
  const isBlockedByDiag = hasDiagnostico && !isDiagnosticoComplete;
  const isPending = workOrderStatus === 'pending';

  // Flatten all regular repairs (non-diagnostico) with their description, sorted by criticity
  const sortedRegularRepairs = workOrderItems
    .flatMap((item) => {
      const moItem = Array.isArray(item.maintenance_order_items)
        ? (item.maintenance_order_items as Array<{ description?: string | null }>)[0]
        : item.maintenance_order_items;
      const description = moItem?.description || null;

      return (item.work_order_item_repairs || [])
        .filter((repair) => !repair.is_diagnostico)
        .map((repair) => ({ repair, description }));
    })
    .sort((a, b) => {
      const aOrder = criticityOrder[a.repair.types_of_repairs?.criticity || 'medium'] ?? 2;
      const bOrder = criticityOrder[b.repair.types_of_repairs?.criticity || 'medium'] ?? 2;
      return aOrder - bOrder;
    });

  if (allRepairs.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No hay tareas asignadas a esta orden de trabajo
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Pending WO banner */}
      {isPending && (
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3.5 flex items-center gap-3">
          <Play className="h-5 w-5 text-blue-600 flex-shrink-0" />
          <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
            Inicie la Orden de Trabajo antes de completar tareas
          </p>
        </div>
      )}

      {/* Diagnostico blocking banner */}
      {!isPending && hasDiagnostico && !isDiagnosticoComplete && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3.5 flex items-center gap-3">
          <Stethoscope className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
            Complete el DIAGNOSTICO antes de continuar con otras tareas
          </p>
        </div>
      )}

      {/* Diagnostico card */}
      {diagnosticoRepair && (
        <DiagnosticoCard
          repairId={diagnosticoRepair.id}
          isCompleted={diagnosticoRepair.status === 'completed'}
          notes={technicianNotes[diagnosticoRepair.id] || diagnosticoRepair.technician_notes || ''}
          savedNotes={diagnosticoRepair.technician_notes || ''}
          isMutating={isMutating}
          isDisabled={isPending}
          onToggle={onToggleRepair}
          onNotesChange={onNotesChange}
          onNotesSave={onNotesSave}
        />
      )}

      {/* Separator */}
      {hasDiagnostico && allRepairs.length > 1 && <Separator />}

      {/* Regular task cards - sorted by criticity */}
      {sortedRegularRepairs.map(({ repair, description }) => (
        <TaskCard
          key={repair.id}
          repair={repair}
          description={description}
          isBlockedByDiag={isBlockedByDiag}
          isBlockedByPending={isPending}
          isMutating={isMutating}
          localNotes={technicianNotes[repair.id] || repair.technician_notes || ''}
          onToggle={onToggleRepair}
          onNotesChange={onNotesChange}
          onNotesSave={onNotesSave}
          onReturn={onReturnTask}
        />
      ))}
    </div>
  );
}
