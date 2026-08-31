'use client';

import type { BadgeProps } from '@/components/ui/badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RepairItemPhotos } from '@/features/Mantenimiento/shared/components/RepairItemPhotos';
import { AlertTriangle, Clock, RotateCcw, UserPlus } from 'lucide-react';
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

interface TaskCardProps {
  repair: RepairData;
  /**
   * Titulo del item ya resuelto (desvio de checklist, texto libre o tipo de
   * reparacion). Ticket 592: sin esto los items de carga manual sin tipo de
   * reparacion se veian como "Tarea sin tipo".
   */
  title: string;
  description: string | null;
  /** Fotos que cargo quien pidio la reparacion (ticket 592) */
  images: string[];
  isBlockedByDiag: boolean;
  isBlockedByPending?: boolean;
  isMutating: boolean;
  localNotes: string;
  onToggle: (repairId: string, isCompleted: boolean) => void;
  onNotesChange: (repairId: string, notes: string) => void;
  onNotesSave: (repairId: string, notes: string) => void;
  onReturn: (repairId: string) => void;
}

export function TaskCard({
  repair,
  title,
  description,
  images,
  isBlockedByDiag,
  isBlockedByPending,
  isMutating,
  localNotes,
  onToggle,
  onNotesChange,
  onNotesSave,
  onReturn,
}: TaskCardProps) {
  const isCompleted = repair.status === 'completed';
  const isRejected = repair.status === 'rejected';
  const isReassignmentRequested = repair.status === 'reassignment_requested';
  const isPendingApproval = repair.status === 'pending_approval';
  const repairType = repair.types_of_repairs;

  const borderColor = isCompleted
    ? 'border-l-emerald-400'
    : isRejected
      ? 'border-l-red-500'
      : isReassignmentRequested
        ? 'border-l-orange-400'
        : isPendingApproval
          ? 'border-l-amber-400'
          : 'border-l-slate-300 dark:border-l-slate-600';

  return (
    <div
      className={`rounded-lg border border-l-4 ${borderColor} bg-card transition-all duration-200 ${
        isCompleted && !isRejected ? 'opacity-60' : ''
      } ${isPendingApproval || isRejected ? 'opacity-50' : ''} ${isBlockedByDiag || isBlockedByPending ? 'opacity-30 pointer-events-none' : ''}`}
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3.5">
          <Checkbox
            id={`task-${repair.id}`}
            checked={isCompleted}
            onCheckedChange={() => onToggle(repair.id, isCompleted)}
            disabled={
              isBlockedByDiag ||
              isBlockedByPending ||
              isReassignmentRequested ||
              isPendingApproval ||
              isRejected ||
              isMutating
            }
            className="mt-0.5 h-5 w-5 sm:h-6 sm:w-6 rounded-md"
          />
          <div className="flex-1 min-w-0 space-y-2">
            {/* Task name */}
            <label
              htmlFor={`task-${repair.id}`}
              className={`text-sm font-semibold cursor-pointer block sm:text-base leading-tight ${
                isCompleted ? 'line-through text-muted-foreground' : ''
              }`}
            >
              {title}
            </label>

            {/* Badges - compact */}
            <div className="flex flex-wrap gap-1">
              {repairType?.name && repairType.name !== title && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {repairType.name}
                </Badge>
              )}
              {repairType?.criticity && (
                <Badge
                  variant={criticityVariants[repairType.criticity] || 'default'}
                  className="text-[10px] px-1.5 py-0"
                >
                  {repairType.criticity}
                </Badge>
              )}
              {repairType?.autorizable && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  Autorizable
                </Badge>
              )}
              {repair.is_operator_added && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-0.5">
                  <UserPlus className="h-2.5 w-2.5" />
                  Operario
                </Badge>
              )}
              {isRejected && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 gap-0.5">
                  <AlertTriangle className="h-2.5 w-2.5" />
                  Rechazada
                </Badge>
              )}
              {isPendingApproval && (
                <Badge variant="warning" className="text-[10px] px-1.5 py-0 gap-0.5">
                  <Clock className="h-2.5 w-2.5" />
                  Pend. Aprobacion
                </Badge>
              )}
              {isReassignmentRequested && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 gap-0.5">
                  <AlertTriangle className="h-2.5 w-2.5" />
                  Devolucion
                </Badge>
              )}
            </div>

            {/* Description */}
            {description && <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>}

            {/* Fotos del pedido. Van fuera del atenuado de la tarjeta: son el contexto
                que el mecanico usa para dimensionar el trabajo ANTES de iniciar la OT,
                que es justo cuando la tarjeta esta bloqueada. */}
            {images.length > 0 && (
              <div className={isBlockedByDiag || isBlockedByPending ? 'pointer-events-auto opacity-100' : ''}>
                <RepairItemPhotos images={images} label={title} size="md" />
              </div>
            )}

            {/* Rejection reason (from validation) */}
            {isRejected && repair.rejection_reason && (
              <div className="p-2.5 bg-destructive/10 rounded-md border border-destructive/20">
                <p className="text-[10px] font-semibold text-destructive uppercase tracking-wide">Motivo de rechazo</p>
                <p className="text-xs text-destructive/80 mt-0.5">{repair.rejection_reason}</p>
              </div>
            )}

            {/* Return reason */}
            {repair.return_reason && !isRejected && (
              <div className="p-2.5 bg-destructive/10 rounded-md border border-destructive/20">
                <p className="text-[10px] font-semibold text-destructive uppercase tracking-wide">
                  Motivo de devolucion
                </p>
                <p className="text-xs text-destructive/80 mt-0.5">{repair.return_reason}</p>
              </div>
            )}

            {/* Notes (collapsible) */}
            {!isBlockedByDiag && !isPendingApproval && !isRejected && (
              <TaskNotes
                repairId={repair.id}
                initialNotes={localNotes}
                savedNotes={repair.technician_notes || ''}
                onNotesChange={onNotesChange}
                onNotesSave={onNotesSave}
              />
            )}

            {/* Return button */}
            {!isCompleted && !isRejected && !isReassignmentRequested && !isPendingApproval && !isBlockedByDiag && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onReturn(repair.id)}
                className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-destructive"
              >
                <RotateCcw className="h-3 w-3" />
                Devolver tarea
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
