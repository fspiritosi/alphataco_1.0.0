'use client';

import { useOperatorContext } from '@/app/operator/operator-layout-provider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { OperatorWorkOrder } from '@/features/OperatorPanel/actions/actionsServer';
import { getWorkOrdersForOperator } from '@/features/OperatorPanel/actions/actionsServer';
import { Logger } from '@/lib/logger';
import { useQuery } from '@tanstack/react-query';
import { Lock } from 'lucide-react';
import { WorkOrderCard } from './WorkOrderCard';

const logger = new Logger('WorkOrderList');

interface WorkOrderListProps {
  initialData: OperatorWorkOrder[];
}

export function WorkOrderList({ initialData }: WorkOrderListProps) {
  const { sectorId } = useOperatorContext();

  const { data: workOrders } = useQuery({
    queryKey: ['operator-work-orders', sectorId],
    queryFn: () => getWorkOrdersForOperator(sectorId),
    initialData,
  });

  logger.debug('Rendering work order list', { data: { count: workOrders.length } });

  const activeOrders = workOrders.filter((wo) => !wo.is_blocked);
  const blockedOrders = workOrders.filter((wo) => wo.is_blocked);

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Ordenes de Trabajo</h1>
        <Badge variant="secondary" className="text-sm">
          {workOrders.length}
        </Badge>
      </div>

      {workOrders.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No hay ordenes de trabajo asignadas a tu sector</div>
      ) : (
        <div className="space-y-3">
          {activeOrders.map((workOrder) => (
            <WorkOrderCard key={workOrder.id} workOrder={workOrder} />
          ))}

          {blockedOrders.length > 0 && activeOrders.length > 0 && (
            <div className="flex items-center gap-2 pt-2">
              <Separator className="flex-1" />
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Lock className="h-3.5 w-3.5" />
                <span>Bloqueadas ({blockedOrders.length})</span>
              </div>
              <Separator className="flex-1" />
            </div>
          )}

          {blockedOrders.map((workOrder) => (
            <WorkOrderCard key={workOrder.id} workOrder={workOrder} />
          ))}
        </div>
      )}
    </div>
  );
}
