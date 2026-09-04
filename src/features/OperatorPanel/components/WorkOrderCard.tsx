'use client';

import type { BadgeProps } from '@/components/ui/badge';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  getResourceInternNumber,
  getResourceKind,
  getResourceKindLabel,
  getResourceLabel,
} from '@/features/Mantenimiento/shared/maintenance-resource';
import type { OperatorWorkOrder } from '@/features/OperatorPanel/actions/actionsServer';
import { ChevronRight, Clock, Lock, Stethoscope } from 'lucide-react';
import moment from 'moment';
import { useRouter } from 'next/navigation';

interface WorkOrderCardProps {
  workOrder: OperatorWorkOrder;
}

const priorityConfig: Record<string, { label: string; variant: NonNullable<BadgeProps['variant']>; border: string }> = {
  urgent: { label: 'Urgente', variant: 'destructive', border: 'border-l-red-500' },
  high: { label: 'Alta', variant: 'warning', border: 'border-l-amber-500' },
  medium: { label: 'Media', variant: 'default', border: 'border-l-blue-500' },
  low: { label: 'Baja', variant: 'secondary', border: 'border-l-slate-400' },
};

const statusConfig: Record<string, { label: string; variant: NonNullable<BadgeProps['variant']> }> = {
  pending: { label: 'Pendiente', variant: 'secondary' },
  in_progress: { label: 'En Progreso', variant: 'default' },
  paused: { label: 'Pausado', variant: 'warning' },
  completed: { label: 'Completado', variant: 'success' },
  completed_partial: { label: 'Parcial', variant: 'warning' },
};

export function WorkOrderCard({ workOrder }: WorkOrderCardProps) {
  const router = useRouter();
  const isBlocked = workOrder.is_blocked;
  const isCompleted = workOrder.status === 'completed' || workOrder.status === 'completed_partial';

  const handleClick = () => {
    if (isBlocked) return;
    router.push(`/operator/work-order/${workOrder.id}`);
  };

  // Calculate progress
  const allRepairs = workOrder.work_order_items?.flatMap((item) => item.work_order_item_repairs || []) || [];
  const completedRepairs = allRepairs.filter((repair) => repair.status === 'completed');
  const totalRepairs = allRepairs.length;
  const progress = totalRepairs > 0 ? Math.round((completedRepairs.length / totalRepairs) * 100) : 0;

  // Ticket 596: la OT puede ser de un vehiculo o de un equipamiento
  const resource = { vehicles: workOrder.vehicles, other_equipment: workOrder.other_equipment };
  const hasResource = !!(workOrder.vehicles || workOrder.other_equipment);
  const resourceLabel = hasResource ? getResourceLabel(resource) : 'Sin recurso';
  const resourceInternNumber = hasResource ? getResourceInternNumber(resource) : null;
  const internNumber = resourceInternNumber ? `#${resourceInternNumber}` : '';
  const resourceSubType = (workOrder.other_equipment ?? workOrder.vehicles)?.sub_type?.name || null;
  // El tipo se muestra solo para equipamientos: en una lista mixta "CT-4471" no
  // se distingue solo de un dominio
  const resourceKindLabel =
    hasResource && getResourceKind(resource) === 'other_equipment' ? getResourceKindLabel(resource) : null;

  // Get OM number
  const omNumber = workOrder.work_order_items?.[0]?.maintenance_order_items?.maintenance_orders?.order_number || 'N/A';

  // Check for pending DIAGNOSTICO
  const hasPendingDiagnostico = allRepairs.some((r) => r.is_diagnostico && r.status !== 'completed');

  // Priority & Status config
  const priority = workOrder.priority || 'medium';
  const priorityData = priorityConfig[priority] || priorityConfig.medium;
  const status = workOrder.status || 'pending';
  const statusData = statusConfig[status] || statusConfig.pending;

  // Truncate OT number for display
  const shortOtNumber = workOrder.order_number?.replace(/^OT-/, '') || workOrder.order_number;

  return (
    <div
      className={`relative rounded-xl border border-l-4 bg-card shadow-sm transition-all duration-200 ${priorityData.border} ${
        isBlocked
          ? 'cursor-not-allowed'
          : isCompleted
            ? 'cursor-pointer hover:shadow-md'
            : 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm'
      } ${isCompleted ? 'opacity-60' : ''}`}
      onClick={handleClick}
    >
      {/* Blocked overlay */}
      {isBlocked && (
        <div className="absolute inset-0 bg-background/70 rounded-xl flex items-center justify-center z-10">
          <div className="flex items-center gap-2 bg-muted px-4 py-2.5 rounded-full border shadow-sm">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              Esperando {workOrder.blocked_by_sector || 'sector anterior'}
            </span>
          </div>
        </div>
      )}

      <div className="p-4 sm:p-5">
        {/* Row 1: Vehicle + Chevron */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h3 className="text-xl font-bold tracking-tight">{resourceLabel}</h3>
              {internNumber && <span className="text-sm font-medium text-muted-foreground">{internNumber}</span>}
              {resourceKindLabel && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {resourceKindLabel}
                </Badge>
              )}
            </div>
            {resourceSubType && <p className="text-xs text-muted-foreground mt-0.5 font-medium">{resourceSubType}</p>}
            <p className="text-xs text-muted-foreground mt-0.5 font-mono truncate">
              OT {shortOtNumber} · OM {omNumber}
            </p>
          </div>
          {!isBlocked && !isCompleted && (
            <ChevronRight className="h-5 w-5 text-muted-foreground/50 flex-shrink-0 mt-1" />
          )}
        </div>

        {/* Row 2: Badges */}
        <div className="flex items-center gap-1.5 flex-wrap mt-3">
          <Badge variant={statusData.variant} className="text-[11px] px-2 py-0.5">
            {statusData.label}
          </Badge>
          <Badge variant={priorityData.variant} className="text-[11px] px-2 py-0.5">
            {priorityData.label}
          </Badge>
          {hasPendingDiagnostico && !isBlocked && (
            <Badge variant="warning" className="gap-1 text-[11px] px-2 py-0.5">
              <Stethoscope className="h-3 w-3" />
              Diagnostico
            </Badge>
          )}
        </div>

        {/* Row 3: Progress */}
        <div className="mt-3.5">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground font-medium">Progreso</span>
            <span className="font-bold tabular-nums text-foreground">
              {completedRepairs.length}/{totalRepairs}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Row 4: Dates */}
        <div className="flex items-center gap-3 flex-wrap mt-2.5 text-xs text-muted-foreground">
          {workOrder.created_at && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              <span>Creada: {moment(workOrder.created_at).format('DD/MM/YYYY')}</span>
            </div>
          )}
          {workOrder.planned_start_date && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              <span>Programada: {moment(workOrder.planned_start_date).format('DD/MM/YYYY')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
