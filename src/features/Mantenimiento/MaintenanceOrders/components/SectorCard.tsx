'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import { ChevronDown, ShieldAlert, Wrench } from 'lucide-react';
import React, { useState } from 'react';
import type { SectorStatus } from './SectorTimeline';

interface TaskInfo {
  id: string;
  repairTypeName: string;
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
  reassignment_requested: 'Reasignación',
  blocked: 'Bloqueado',
};

const sectorStatusBadge: Record<SectorStatus, BadgeVariant> = {
  blocked: 'outline',
  pending: 'secondary',
  in_progress: 'warning',
  completed: 'success',
};

export function SectorCard({ sectorName, sequenceOrder, status, tasks, diagnosticoCompleted }: SectorCardProps) {
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
            <CardTitle className="text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-xs">
                  Orden {sequenceOrder}
                </Badge>
                <span>{sectorName}</span>
                <Badge variant={sectorStatusBadge[status]}>
                  {status === 'blocked'
                    ? 'Bloqueado'
                    : status === 'pending'
                      ? 'Pendiente'
                      : status === 'in_progress'
                        ? 'En progreso'
                        : 'Completado'}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground font-normal">
                  {completedTasks}/{totalTasks} tareas
                </span>
                <Progress value={progressPercent} className="w-24 h-2" />
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-2">
            {/* Diagnostico task (highlighted) */}
            {diagnosticoTask && (
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md border-l-4 border-blue-500">
                <ShieldAlert className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">DIAGNOSTICO</span>
                <Badge variant={statusBadgeVariants[diagnosticoTask.status] || 'outline'}>
                  {statusLabels[diagnosticoTask.status] || diagnosticoTask.status}
                </Badge>
                {!diagnosticoCompleted && status !== 'blocked' && (
                  <span className="text-xs text-muted-foreground ml-auto">Bloquea tareas restantes</span>
                )}
              </div>
            )}

            {/* Regular tasks */}
            {regularTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/30">
                <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm flex-1">{task.repairTypeName}</span>
                {task.isAutorizable && (
                  <Badge variant="warning" className="text-[10px]">
                    Autorizable
                  </Badge>
                )}
                {task.isOperatorAdded && (
                  <Badge variant="outline" className="text-[10px]">
                    Agregado
                  </Badge>
                )}
                <Badge variant={statusBadgeVariants[task.status] || 'outline'}>
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
