'use client';

import type { BadgeProps } from '@/components/ui/badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Calendar, Pause, Play } from 'lucide-react';
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
  sub_type?: { name: string | null } | null;
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
  onPause?: () => void;
  isPausing?: boolean;
  onResume?: () => void;
  isResuming?: boolean;
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
  onPause,
  isPausing,
  onResume,
  isResuming,
}: WorkOrderHeaderProps) {
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="flex-none border-b bg-card">
      <div className="p-4 sm:p-5 space-y-3.5">
        {/* Row 1: Back + Title + Start */}
        <div className="flex items-center gap-3">
          <Link href="/operator/dashboard">
            <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 rounded-xl">
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate sm:text-xl tracking-tight">OT {orderNumber}</h1>
            <p className="text-xs text-muted-foreground font-mono">OM {maintenanceOrderNumber}</p>
          </div>
          {status === 'pending' && (
            <Button onClick={onStart} disabled={isStarting} size="default" className="gap-2 h-10 sm:h-11 rounded-xl">
              <Play className="h-4 w-4" />
              <span className="hidden sm:inline">Iniciar OT</span>
              <span className="sm:hidden">Iniciar</span>
            </Button>
          )}
          {status === 'in_progress' && onPause && (
            <Button
              onClick={onPause}
              disabled={isPausing}
              variant="outline"
              size="default"
              className="gap-2 h-10 sm:h-11 rounded-xl"
            >
              <Pause className="h-4 w-4" />
              <span className="hidden sm:inline">Pausar OT</span>
              <span className="sm:hidden">Pausar</span>
            </Button>
          )}
          {status === 'paused' && onResume && (
            <Button onClick={onResume} disabled={isResuming} size="default" className="gap-2 h-10 sm:h-11 rounded-xl">
              <Play className="h-4 w-4" />
              <span className="hidden sm:inline">Reanudar OT</span>
              <span className="sm:hidden">Reanudar</span>
            </Button>
          )}
        </div>

        {/* Row 2: Vehicle info bar */}
        {vehicle && (
          <div className="flex items-center gap-3 text-sm bg-muted/50 rounded-lg px-3.5 py-2.5 overflow-x-auto">
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-xs text-muted-foreground">Dominio</span>
              <span className="font-bold">{vehicle.domain || '-'}</span>
            </div>
            <span className="text-muted-foreground/40">|</span>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-xs text-muted-foreground">Serie</span>
              <span className="font-semibold">{vehicle.serie || '-'}</span>
            </div>
            {vehicle.sub_type?.name && (
              <>
                <span className="text-muted-foreground/40">|</span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-xs text-muted-foreground">Tipo</span>
                  <span className="font-semibold">{vehicle.sub_type.name}</span>
                </div>
              </>
            )}
            {vehicle.intern_number && (
              <>
                <span className="text-muted-foreground/40">|</span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-xs text-muted-foreground">Int.</span>
                  <span className="font-semibold">#{vehicle.intern_number}</span>
                </div>
              </>
            )}
            {vehicle.kilometer && (
              <>
                <span className="text-muted-foreground/40">|</span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-xs text-muted-foreground">Km</span>
                  <span className="font-semibold">{vehicle.kilometer.toLocaleString()}</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Row 3: Badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={statusVariants[status] || 'default'} className="text-[11px] px-2 py-0.5">
            {statusLabels[status] || status}
          </Badge>
          {priority && (
            <Badge variant={priorityVariants[priority] || 'default'} className="text-[11px] px-2 py-0.5">
              {priorityLabels[priority] || priority}
            </Badge>
          )}
          {plannedStartDate && (
            <Badge variant="outline" className="text-[11px] px-2 py-0.5 gap-1">
              <Calendar className="h-3 w-3" />
              {moment(plannedStartDate).format('DD/MM/YYYY')}
            </Badge>
          )}
        </div>

        {/* Row 4: Progress */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground font-medium">Progreso</span>
            <span className="font-bold tabular-nums">
              {completedCount}/{totalCount} tareas
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
      </div>
    </div>
  );
}
