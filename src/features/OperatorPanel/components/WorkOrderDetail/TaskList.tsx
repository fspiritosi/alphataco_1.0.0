'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Stethoscope } from 'lucide-react';
import { DiagnosticoCard } from './DiagnosticoCard';
import { TaskCard } from './TaskCard';

interface RepairData {
  id: string;
  status: string | null;
  technician_notes: string | null;
  return_reason: string | null;
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
  technicianNotes: Record<string, string>;
  isMutating: boolean;
  onToggleRepair: (repairId: string, isCompleted: boolean) => void;
  onNotesChange: (repairId: string, notes: string) => void;
  onNotesSave: (repairId: string, notes: string) => void;
  onReturnTask: (repairId: string) => void;
}

export function TaskList({
  workOrderItems,
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
      {/* Diagnostico blocking banner */}
      {hasDiagnostico && !isDiagnosticoComplete && (
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
          onToggle={onToggleRepair}
          onNotesChange={onNotesChange}
          onNotesSave={onNotesSave}
        />
      )}

      {/* Separator */}
      {hasDiagnostico && allRepairs.length > 1 && <Separator />}

      {/* Regular task cards */}
      {workOrderItems.map((item) => {
        const moItem = Array.isArray(item.maintenance_order_items)
          ? (item.maintenance_order_items as Array<{ description?: string | null }>)[0]
          : item.maintenance_order_items;
        const description = moItem?.description || null;

        return (item.work_order_item_repairs || [])
          .filter((repair) => !repair.is_diagnostico)
          .map((repair) => (
            <TaskCard
              key={repair.id}
              repair={repair}
              description={description}
              isBlockedByDiag={isBlockedByDiag}
              isMutating={isMutating}
              localNotes={technicianNotes[repair.id] || repair.technician_notes || ''}
              onToggle={onToggleRepair}
              onNotesChange={onNotesChange}
              onNotesSave={onNotesSave}
              onReturn={onReturnTask}
            />
          ));
      })}
    </div>
  );
}
