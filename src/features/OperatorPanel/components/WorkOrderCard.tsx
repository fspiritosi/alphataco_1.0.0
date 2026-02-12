'use client';

import type { BadgeProps } from '@/components/ui/badge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { OperatorWorkOrder } from '@/features/OperatorPanel/actions/actionsServer';
import { ChevronRight, Lock, Stethoscope } from 'lucide-react';
import moment from 'moment';
import { useRouter } from 'next/navigation';

interface WorkOrderCardProps {
  workOrder: OperatorWorkOrder;
}

const priorityConfig: Record<string, { label: string; variant: NonNullable<BadgeProps['variant']> }> = {
  urgent: { label: 'Urgente', variant: 'destructive' },
  high: { label: 'Alta', variant: 'warning' },
  medium: { label: 'Media', variant: 'default' },
  low: { label: 'Baja', variant: 'secondary' },
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

  // Get vehicle info
  const vehicle = workOrder.vehicles;
  const vehicleDomain = vehicle?.domain || vehicle?.serie || 'Sin vehiculo';
  const internNumber = vehicle?.intern_number ? `#${vehicle.intern_number}` : '';

  // Get OM number
  const omNumber = workOrder.work_order_items?.[0]?.maintenance_order_items?.maintenance_orders?.order_number || 'N/A';

  // Check for pending DIAGNOSTICO
  const hasPendingDiagnostico = allRepairs.some((r) => r.is_diagnostico && r.status !== 'completed');

  // Priority & Status config
  const priority = workOrder.priority || 'medium';
  const priorityData = priorityConfig[priority] || priorityConfig.medium;
  const status = workOrder.status || 'pending';
  const statusData = statusConfig[status] || statusConfig.pending;

  return (
    <Card
      className={`transition-all duration-200 ${
        isBlocked
          ? 'opacity-50 cursor-not-allowed'
          : isCompleted
            ? 'opacity-60 cursor-pointer hover:bg-accent/50'
            : 'cursor-pointer hover:bg-accent/50 active:scale-[0.98]'
      }`}
      onClick={handleClick}
    >
      <CardContent className="p-4 sm:p-5 relative min-h-[120px]">
        {/* Blocked overlay */}
        {isBlocked && (
          <div className="absolute inset-0 bg-muted/30 backdrop-blur-[1px] rounded-lg flex items-center justify-center z-10">
            <div className="flex items-center gap-2 bg-background/95 px-4 py-2 rounded-full border shadow-sm">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                Esperando {workOrder.blocked_by_sector || 'sector anterior'}
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="flex-1 space-y-3">
            {/* Vehicle info - PRIMARY hierarchy */}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold sm:text-xl">{vehicleDomain}</h3>
                {internNumber && <span className="text-base font-medium text-muted-foreground">{internNumber}</span>}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                <span>OT {workOrder.order_number}</span>
                <span>·</span>
                <span>OM {omNumber}</span>
              </div>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant={priorityData.variant} className="text-xs sm:text-sm">
                {priorityData.label}
              </Badge>
              <Badge variant={statusData.variant} className="text-xs sm:text-sm">
                {statusData.label}
              </Badge>
              {hasPendingDiagnostico && !isBlocked && (
                <Badge variant="warning" className="gap-1 text-xs sm:text-sm">
                  <Stethoscope className="h-3 w-3" />
                  Diagnostico
                </Badge>
              )}
            </div>

            {/* Progress bar - thicker */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progreso</span>
                <span className="font-semibold tabular-nums">
                  {completedRepairs.length}/{totalRepairs}
                </span>
              </div>
              <Progress value={progress} className="h-2.5" />
            </div>

            {/* Date */}
            {workOrder.planned_start_date && (
              <p className="text-xs text-muted-foreground">
                Inicio: {moment(workOrder.planned_start_date).format('DD/MM/YYYY')}
              </p>
            )}
          </div>

          {/* Chevron */}
          {!isBlocked && !isCompleted && (
            <div className="flex-shrink-0">
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
