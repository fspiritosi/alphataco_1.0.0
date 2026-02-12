'use client';

import type { BadgeProps } from '@/components/ui/badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { RotateCcw } from 'lucide-react';
import { TaskNotes } from './TaskNotes';

type BadgeVariant = NonNullable<BadgeProps['variant']>;

const criticityVariants: Record<string, BadgeVariant> = {
  critica: 'destructive',
  alta: 'warning',
  media: 'default',
  baja: 'secondary',
};

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

interface TaskCardProps {
  repair: RepairData;
  description: string | null;
  isBlockedByDiag: boolean;
  isMutating: boolean;
  localNotes: string;
  onToggle: (repairId: string, isCompleted: boolean) => void;
  onNotesChange: (repairId: string, notes: string) => void;
  onNotesSave: (repairId: string, notes: string) => void;
  onReturn: (repairId: string) => void;
}

export function TaskCard({
  repair,
  description,
  isBlockedByDiag,
  isMutating,
  localNotes,
  onToggle,
  onNotesChange,
  onNotesSave,
  onReturn,
}: TaskCardProps) {
  const isCompleted = repair.status === 'completed';
  const isReassignmentRequested = repair.status === 'reassignment_requested';
  const repairType = repair.types_of_repairs;

  return (
    <Card
      className={`transition-all duration-200 ${isCompleted ? 'bg-muted/30 opacity-75' : ''} ${isBlockedByDiag ? 'opacity-40 pointer-events-none' : ''}`}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-4">
          <Checkbox
            id={`task-${repair.id}`}
            checked={isCompleted}
            onCheckedChange={() => onToggle(repair.id, isCompleted)}
            disabled={isBlockedByDiag || isReassignmentRequested || isMutating}
            className="mt-1 h-5 w-5 sm:h-6 sm:w-6"
          />
          <div className="flex-1 min-w-0 space-y-2.5">
            {/* Task name */}
            <label
              htmlFor={`task-${repair.id}`}
              className={`text-sm font-medium cursor-pointer block sm:text-base ${isCompleted ? 'line-through text-muted-foreground' : ''}`}
            >
              {repairType?.name || 'Tarea sin tipo'}
            </label>

            {/* Badges */}
            <div className="flex flex-wrap gap-1.5">
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
                  Devolucion solicitada
                </Badge>
              )}
            </div>

            {/* Description */}
            {description && <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>}

            {/* Return reason */}
            {repair.return_reason && (
              <div className="p-2.5 bg-destructive/10 rounded-md border border-destructive/20">
                <p className="text-xs font-medium text-destructive">Motivo de devolucion:</p>
                <p className="text-sm text-destructive/80 mt-0.5">{repair.return_reason}</p>
              </div>
            )}

            {/* Notes (collapsible) */}
            {!isBlockedByDiag && (
              <TaskNotes
                repairId={repair.id}
                initialNotes={localNotes}
                savedNotes={repair.technician_notes || ''}
                onNotesChange={onNotesChange}
                onNotesSave={onNotesSave}
              />
            )}

            {/* Return button */}
            {!isCompleted && !isReassignmentRequested && !isBlockedByDiag && (
              <Button variant="outline" size="sm" onClick={() => onReturn(repair.id)} className="h-9 gap-1.5 text-xs">
                <RotateCcw className="h-3.5 w-3.5" />
                Devolver tarea
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
