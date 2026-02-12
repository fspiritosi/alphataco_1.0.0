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
  completed_partial: { label: 'Completado Parcial', variant: 'warning' },
};

export function WorkOrderCard({ workOrder }: WorkOrderCardProps) {
  const router = useRouter();
  const isBlocked = workOrder.is_blocked;

  const handleClick = () => {
    if (isBlocked) return;
    router.push(`/operator/work-order/${workOrder.id}`);
  };

  // Calculate progress
  const allRepairs = workOrder.work_order_items?.flatMap((item) => item.work_order_item_repairs || []) || [];
  const completedRepairs = allRepairs.filter((repair) => repair.status === 'completed');
  const totalRepairs = allRepairs.length;
  const progress = totalRepairs > 0 ? Math.round((completedRepairs.length / totalRepairs) * 100) : 0;

  // Get vehicle info from equipment_id relation
  const vehicle = workOrder.vehicles;
  const vehicleInfo = vehicle?.domain || vehicle?.serie || 'Sin vehículo';
  const internNumber = vehicle?.intern_number ? `#${vehicle.intern_number}` : '';

  // Get OM number from first work_order_item -> maintenance_order_items -> maintenance_orders
  const omNumber = workOrder.work_order_items?.[0]?.maintenance_order_items?.maintenance_orders?.order_number || 'N/A';

  // Check for pending DIAGNÓSTICO
  const hasPendingDiagnostico = allRepairs.some((r) => r.is_diagnostico && r.status !== 'completed');

  // Priority config
  const priority = workOrder.priority || 'medium';
  const priorityData = priorityConfig[priority] || priorityConfig.medium;

  // Status config
  const status = workOrder.status || 'pending';
  const statusData = statusConfig[status] || statusConfig.pending;

  return (
    <Card
      className={`transition-colors ${isBlocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-accent/50'}`}
      onClick={handleClick}
    >
      <CardContent className="p-4 relative">
        {/* Blocked overlay */}
        {isBlocked && (
          <div className="absolute inset-0 bg-muted/20 rounded-lg flex items-center justify-center z-10">
            <div className="flex items-center gap-2 bg-background/90 px-3 py-1.5 rounded-full border shadow-sm">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                Esperando {workOrder.blocked_by_sector || 'sector anterior'}
              </span>
            </div>
          </div>
        )}

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            {/* Header: Work Order Number and OM */}
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-lg">OT {workOrder.order_number}</h3>
              <span className="text-muted-foreground">•</span>
              <span className="text-sm text-muted-foreground">OM {omNumber}</span>
            </div>

            {/* Vehicle Info */}
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">{vehicleInfo}</span>
              {internNumber && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">{internNumber}</span>
                </>
              )}
            </div>

            {/* Badges: Priority and Status */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={priorityData.variant}>{priorityData.label}</Badge>
              <Badge variant={statusData.variant}>{statusData.label}</Badge>
              {hasPendingDiagnostico && !isBlocked && (
                <Badge variant="warning" className="gap-1">
                  <Stethoscope className="h-3 w-3" />
                  Diagnóstico pendiente
                </Badge>
              )}
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progreso</span>
                <span className="font-medium">
                  {completedRepairs.length} / {totalRepairs}
                </span>
              </div>
              <Progress value={progress} />
            </div>

            {/* Planned Start Date */}
            {workOrder.planned_start_date && (
              <div className="text-sm text-muted-foreground">
                Inicio planeado: {moment(workOrder.planned_start_date).format('DD/MM/YYYY')}
              </div>
            )}
          </div>

          {/* Chevron Icon */}
          {!isBlocked && (
            <div className="flex-shrink-0 self-center">
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
