'use client';

import type { BadgeProps } from '@/components/ui/badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Play } from 'lucide-react';
import moment from 'moment';
import Link from 'next/link';

type BadgeVariant = NonNullable<BadgeProps['variant']>;

const statusVariants: Record<string, BadgeVariant> = {
  pending: 'secondary',
  in_progress: 'default',
  paused: 'warning',
  completed: 'success',
  completed_partial: 'success',
};

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En Progreso',
  paused: 'Pausada',
  completed: 'Completada',
  completed_partial: 'Completada Parcial',
};

const priorityVariants: Record<string, BadgeVariant> = {
  urgent: 'destructive',
  high: 'warning',
  medium: 'default',
  low: 'secondary',
};

const priorityLabels: Record<string, string> = {
  urgent: 'Urgente',
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
};

interface VehicleInfo {
  domain?: string | null;
  serie?: string | null;
  intern_number?: string | null;
  kilometer?: number | null;
}

interface WorkOrderHeaderProps {
  orderNumber: string;
  maintenanceOrderNumber: string;
  status: string;
  priority: string | null;
  plannedStartDate: string | null;
  vehicle: VehicleInfo | null;
  completedCount: number;
  totalCount: number;
  onStart: () => void;
  isStarting: boolean;
}

export function WorkOrderHeader({
  orderNumber,
  maintenanceOrderNumber,
  status,
  priority,
  plannedStartDate,
  vehicle,
  completedCount,
  totalCount,
  onStart,
  isStarting,
}: WorkOrderHeaderProps) {
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="flex-none border-b bg-card">
      <div className="p-4 sm:p-5 space-y-4">
        {/* Back button + title + start button */}
        <div className="flex items-center gap-3">
          <Link href="/operator/dashboard">
            <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0">
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate sm:text-xl">OT {orderNumber}</h1>
            <p className="text-sm text-muted-foreground">OM {maintenanceOrderNumber}</p>
          </div>
          {status === 'pending' && (
            <Button onClick={onStart} disabled={isStarting} size="default" className="gap-2 h-10 sm:h-11">
              <Play className="h-4 w-4" />
              <span className="hidden sm:inline">Iniciar OT</span>
              <span className="sm:hidden">Iniciar</span>
            </Button>
          )}
        </div>

        {/* Vehicle info */}
        {vehicle && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm bg-muted/50 rounded-lg p-3">
            <div>
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Dominio</span>
              <p className="font-semibold">{vehicle.domain || '-'}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Serie</span>
              <p className="font-semibold">{vehicle.serie || '-'}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Interno</span>
              <p className="font-semibold">{vehicle.intern_number || '-'}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Km</span>
              <p className="font-semibold">{vehicle.kilometer ? vehicle.kilometer.toLocaleString() : '-'}</p>
            </div>
          </div>
        )}

        {/* Status badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant={statusVariants[status] || 'default'} className="text-xs sm:text-sm">
            {statusLabels[status] || status}
          </Badge>
          {priority && (
            <Badge variant={priorityVariants[priority] || 'default'} className="text-xs sm:text-sm">
              {priorityLabels[priority] || priority}
            </Badge>
          )}
          {plannedStartDate && (
            <Badge variant="outline" className="text-xs sm:text-sm">
              Programada: {moment(plannedStartDate).format('DD/MM/YYYY')}
            </Badge>
          )}
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progreso</span>
            <span className="font-semibold">
              {completedCount} de {totalCount} tareas
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2.5" />
        </div>
      </div>
    </div>
  );
}
