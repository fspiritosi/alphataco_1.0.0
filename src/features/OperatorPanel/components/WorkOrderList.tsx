'use client';

import { useOperatorContext } from '@/app/operator/operator-layout-provider';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import type { OperatorWorkOrder } from '@/features/OperatorPanel/actions/actionsServer';
import { getWorkOrdersForOperator } from '@/features/OperatorPanel/actions/actionsServer';
import { Logger } from '@/lib/logger';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, ClipboardList, Lock, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { WorkOrderCard } from './WorkOrderCard';

const logger = new Logger('WorkOrderList');

type FilterStatus = 'all' | 'active' | 'blocked' | 'completed';

const filterOptions: { value: FilterStatus; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'active', label: 'Activas' },
  { value: 'blocked', label: 'Bloqueadas' },
  { value: 'completed', label: 'Completadas' },
];

interface WorkOrderListProps {
  initialData: OperatorWorkOrder[];
}

export function WorkOrderList({ initialData }: WorkOrderListProps) {
  const { sectorId } = useOperatorContext();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');

  const includeCompleted = statusFilter === 'completed';

  const { data: workOrders = [], isLoading } = useQuery({
    queryKey: ['operator-work-orders', sectorId, includeCompleted],
    queryFn: () => getWorkOrdersForOperator(sectorId, includeCompleted),
    initialData: includeCompleted ? undefined : initialData,
  });

  logger.debug('Rendering work order list', { data: { count: workOrders.length } });

  const isCompletedStatus = (status: string | null) => status === 'completed' || status === 'completed_partial';

  const filteredOrders = useMemo(() => {
    let orders = workOrders;

    // Status filter
    if (statusFilter === 'active') {
      orders = orders.filter((wo) => !wo.is_blocked && !isCompletedStatus(wo.status));
    } else if (statusFilter === 'blocked') {
      orders = orders.filter((wo) => wo.is_blocked);
    } else if (statusFilter === 'completed') {
      orders = orders.filter((wo) => isCompletedStatus(wo.status));
    }

    // Search filter
    if (search.trim()) {
      const query = search.toLowerCase().trim();
      orders = orders.filter((wo) => {
        const orderNum = wo.order_number?.toString().toLowerCase() || '';
        const domain = wo.vehicles?.domain?.toLowerCase() || '';
        const serie = wo.vehicles?.serie?.toLowerCase() || '';
        const internNum = wo.vehicles?.intern_number?.toString().toLowerCase() || '';
        return orderNum.includes(query) || domain.includes(query) || serie.includes(query) || internNum.includes(query);
      });
    }

    return orders;
  }, [workOrders, statusFilter, search]);

  const activeOrders = filteredOrders.filter((wo) => !wo.is_blocked && !isCompletedStatus(wo.status));
  const blockedOrders = filteredOrders.filter((wo) => wo.is_blocked);
  const completedOrders = filteredOrders.filter((wo) => isCompletedStatus(wo.status));

  const activeCount = workOrders.filter((wo) => !wo.is_blocked && !isCompletedStatus(wo.status)).length;
  const blockedCount = workOrders.filter((wo) => wo.is_blocked).length;
  const completedCount = workOrders.filter((wo) => isCompletedStatus(wo.status)).length;

  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold sm:text-2xl">Ordenes de Trabajo</h1>
          <Badge variant="secondary" className="text-sm tabular-nums">
            {workOrders.length}
          </Badge>
        </div>
      </div>

      {/* Search + Filters */}
      {workOrders.length > 0 && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por OT, dominio, serie..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-11"
            />
          </div>

          <div className="flex gap-2">
            {filterOptions.map((option) => {
              const count =
                option.value === 'all'
                  ? workOrders.length
                  : option.value === 'active'
                    ? activeCount
                    : option.value === 'blocked'
                      ? blockedCount
                      : completedCount;
              return (
                <button
                  key={option.value}
                  onClick={() => setStatusFilter(option.value)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    statusFilter === option.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {option.label}
                  <span
                    className={`text-xs tabular-nums ${
                      statusFilter === option.value ? 'text-primary-foreground/80' : 'text-muted-foreground/70'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && <WorkOrderListSkeleton />}

      {/* Empty state - no orders at all */}
      {!isLoading && workOrders.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <ClipboardList className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">Sin ordenes de trabajo</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-[280px]">
              No hay ordenes de trabajo asignadas a tu sector en este momento
            </p>
          </CardContent>
        </Card>
      )}

      {/* Empty state - no results from search/filter */}
      {!isLoading && workOrders.length > 0 && filteredOrders.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-3 mb-3">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold">Sin resultados</h3>
            <p className="text-sm text-muted-foreground mt-1">Intenta con otra busqueda o filtro</p>
          </CardContent>
        </Card>
      )}

      {/* Work order list */}
      {filteredOrders.length > 0 && (
        <div className="space-y-3">
          {statusFilter === 'all' ? (
            <>
              {activeOrders.map((workOrder) => (
                <WorkOrderCard key={workOrder.id} workOrder={workOrder} />
              ))}

              {blockedOrders.length > 0 && activeOrders.length > 0 && (
                <div className="flex items-center gap-2 pt-2">
                  <Separator className="flex-1" />
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Lock className="h-3.5 w-3.5" />
                    <span>Bloqueadas ({blockedOrders.length})</span>
                  </div>
                  <Separator className="flex-1" />
                </div>
              )}

              {blockedOrders.map((workOrder) => (
                <WorkOrderCard key={workOrder.id} workOrder={workOrder} />
              ))}

              {completedOrders.length > 0 && (activeOrders.length > 0 || blockedOrders.length > 0) && (
                <div className="flex items-center gap-2 pt-2">
                  <Separator className="flex-1" />
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Completadas ({completedOrders.length})</span>
                  </div>
                  <Separator className="flex-1" />
                </div>
              )}

              {completedOrders.map((workOrder) => (
                <WorkOrderCard key={workOrder.id} workOrder={workOrder} />
              ))}
            </>
          ) : (
            filteredOrders.map((workOrder) => <WorkOrderCard key={workOrder.id} workOrder={workOrder} />)
          )}
        </div>
      )}
    </div>
  );
}

function WorkOrderListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 sm:p-5">
            <div className="space-y-3">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-2.5 w-full rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
