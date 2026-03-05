'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  FileText,
  Hand,
  Loader2,
  ShieldAlert,
  UserPlus,
  Wrench,
  XCircle,
} from 'lucide-react';
import React, { useState } from 'react';
import type { SectorStatus } from './SectorTimeline';

interface TaskInfo {
  id: string;
  repairTypeName: string;
  description?: string;
  status: string;
  isDiagnostico: boolean;
  isAutorizable: boolean;
  isOperatorAdded: boolean;
}

interface SectorCardProps {
  sectorName: string;
  sequenceOrder: number;
  status: SectorStatus;
  tasks: TaskInfo[];
  diagnosticoCompleted: boolean;
  workOrderNumber?: string;
  workOrderStatus?: string;
}

type BadgeVariant = NonNullable<React.ComponentProps<typeof Badge>['variant']>;

const statusBadgeVariants: Record<string, BadgeVariant> = {
  pending: 'secondary',
  pending_approval: 'warning',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'destructive',
  rejected: 'destructive',
  reassignment_requested: 'destructive',
  blocked: 'outline',
};

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  pending_approval: 'Pend. Aprobacion',
  in_progress: 'En progreso',
  completed: 'Completado',
  cancelled: 'Cancelado',
  rejected: 'Rechazado',
  reassignment_requested: 'Devuelto',
  blocked: 'Bloqueado',
};

/** Small status icon for compact inline display */
function TaskStatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
    case 'in_progress':
      return <Loader2 className="h-3.5 w-3.5 text-amber-500" />;
    case 'rejected':
      return <XCircle className="h-3.5 w-3.5 text-red-500" />;
    case 'reassignment_requested':
      return <Hand className="h-3.5 w-3.5 text-red-400" />;
    case 'pending_approval':
      return <Clock className="h-3.5 w-3.5 text-amber-500" />;
    case 'cancelled':
      return <XCircle className="h-3.5 w-3.5 text-muted-foreground" />;
    default:
      return <Circle className="h-3.5 w-3.5 text-muted-foreground/50" />;
  }
}

const sectorStatusBadge: Record<SectorStatus, BadgeVariant> = {
  blocked: 'outline',
  pending: 'secondary',
  in_progress: 'warning',
  paused: 'outline',
  completed: 'success',
};

const sectorStatusLabels: Record<SectorStatus, string> = {
  blocked: 'Bloqueado',
  pending: 'Pendiente',
  in_progress: 'En progreso',
  paused: 'Pausado',
  completed: 'Completado',
};

const woStatusBadge: Record<string, BadgeVariant> = {
  pending: 'secondary',
  in_progress: 'warning',
  paused: 'outline',
  completed: 'success',
  completed_partial: 'yellow',
  cancelled: 'destructive',
};

const woStatusLabels: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  paused: 'Pausada',
  completed: 'Completada',
  completed_partial: 'Parcial',
  cancelled: 'Cancelada',
};

export function SectorCard({
  sectorName,
  status,
  tasks,
  diagnosticoCompleted,
  workOrderNumber,
  workOrderStatus,
}: SectorCardProps) {
  const [isOpen, setIsOpen] = useState(status === 'in_progress' || status === 'pending');

  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const totalTasks = tasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const diagnosticoTask = tasks.find((t) => t.isDiagnostico);
  const regularTasks = tasks.filter((t) => !t.isDiagnostico);

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
            <CardTitle className="text-sm">
              {/* Row 1: Sector name + status + progress */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{sectorName}</span>
                  <Badge variant={sectorStatusBadge[status]}>{sectorStatusLabels[status]}</Badge>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground font-normal tabular-nums">
                    {completedTasks}/{totalTasks}
                  </span>
                  {/* Segmented progress: one dot per task */}
                  <div className="flex items-center gap-0.5">
                    {tasks.map((t) => (
                      <div
                        key={t.id}
                        className={`h-2 rounded-full transition-colors ${totalTasks <= 8 ? 'w-3' : 'w-2'} ${
                          t.status === 'completed'
                            ? 'bg-emerald-500'
                            : t.status === 'in_progress'
                              ? 'bg-amber-500'
                              : t.status === 'rejected' || t.status === 'reassignment_requested'
                                ? 'bg-red-400'
                                : 'bg-muted-foreground/20'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground font-normal tabular-nums">{progressPercent}%</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {/* Row 2: OT number + OT status */}
              {workOrderNumber && (
                <div className="flex items-center gap-2 mt-1.5">
                  <FileText className="h-3 w-3 text-muted-foreground" />
                  <TooltipProvider delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <code className="text-[11px] font-mono text-muted-foreground truncate max-w-[280px] block">
                          {workOrderNumber}
                        </code>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p className="font-mono text-xs">{workOrderNumber}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  {workOrderStatus && (
                    <Badge variant={woStatusBadge[workOrderStatus] || 'outline'} className="text-[10px]">
                      {woStatusLabels[workOrderStatus] || workOrderStatus}
                    </Badge>
                  )}
                </div>
              )}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-1">
            {/* Diagnostico task — highlighted row */}
            {diagnosticoTask && (
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/50 border-l-2 border-blue-500">
                <ShieldAlert className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                <span className="text-sm font-medium flex-1">DIAGNOSTICO</span>
                <Badge variant={statusBadgeVariants[diagnosticoTask.status] || 'outline'} className="text-[10px]">
                  {statusLabels[diagnosticoTask.status] || diagnosticoTask.status}
                </Badge>
                {!diagnosticoCompleted && status !== 'blocked' && (
                  <TooltipProvider delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Bloquea tareas restantes</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            )}

            {/* Regular tasks — individual rows with status icon */}
            {regularTasks.map((task) => (
              <div
                key={task.id}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors hover:bg-muted/30 ${
                  !diagnosticoCompleted && diagnosticoTask && status !== 'blocked' ? 'opacity-40' : ''
                }`}
              >
                <TaskStatusIcon status={task.status} />
                <Wrench className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm leading-tight">{task.repairTypeName}</span>
                  {task.description && task.description !== task.repairTypeName && (
                    <p className="text-[11px] text-muted-foreground truncate leading-tight">{task.description}</p>
                  )}
                </div>
                {task.isOperatorAdded && (
                  <TooltipProvider delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <UserPlus className="h-3 w-3 text-blue-400 shrink-0" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Agregado por operador</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {task.isAutorizable && (
                  <Badge variant="warning" className="text-[10px] shrink-0 py-0">
                    Autoriz.
                  </Badge>
                )}
                <Badge
                  variant={statusBadgeVariants[task.status] || 'outline'}
                  className="text-[10px] shrink-0 min-w-[70px] justify-center"
                >
                  {statusLabels[task.status] || task.status}
                </Badge>
              </div>
            ))}

            {regularTasks.length === 0 && !diagnosticoTask && (
              <p className="text-sm text-muted-foreground text-center py-2">Sin tareas asignadas</p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
