'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import type { OperatorWorkOrder } from '@/features/OperatorPanel/actions/queries.server';
import {
  getCompletedWorkOrdersForOperator,
  getWorkOrdersForOperator,
} from '@/features/OperatorPanel/actions/queries.server';
import { useOperatorContext } from '@/features/OperatorPanel/components/operator-layout-provider';
import { Logger } from '@/lib/logger';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, Lock, Search, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import { WorkOrderCard } from './WorkOrderCard';

const logger = new Logger('WorkOrderList');

type FilterStatus = 'all' | 'active' | 'blocked' | 'completed';

interface WorkOrderListProps {
  initialData: OperatorWorkOrder[];
}

const PAGE_SIZE = 10;

/**
 * Busqueda libre sobre una OT.
 *
 * Ticket 596: el recurso puede ser un vehiculo (dominio/serie) o un equipamiento
 * (numero de serie), asi que se contemplan los identificadores de los dos.
 */
function matchesQuery(workOrder: OperatorWorkOrder, query: string): boolean {
  const haystack = [
    workOrder.order_number,
    workOrder.vehicles?.domain,
    workOrder.vehicles?.serie,
    workOrder.vehicles?.intern_number,
    workOrder.other_equipment?.serial_number,
    workOrder.other_equipment?.intern_number,
    workOrder.work_order_items?.[0]?.maintenance_order_items?.maintenance_orders?.order_number,
  ];

  return haystack.some((value) => value?.toString().toLowerCase().includes(query));
}

export function WorkOrderList({ initialData }: WorkOrderListProps) {
  const { sectorId } = useOperatorContext();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [completedPage, setCompletedPage] = useState(0);

  // Query for active work orders (pending, in_progress, paused)
  const { data: activeWorkOrders = [], isLoading: isLoadingActive } = useQuery({
    queryKey: ['operator-work-orders', sectorId, false],
    queryFn: () => getWorkOrdersForOperator(sectorId, false),
    initialData,
  });

  // Query for completed work orders (paginated, only fetched when needed)
  const { data: completedResult, isLoading: isLoadingCompleted } = useQuery({
    queryKey: ['operator-work-orders-completed', sectorId, completedPage],
    queryFn: () => getCompletedWorkOrdersForOperator(sectorId, completedPage, PAGE_SIZE),
    enabled: statusFilter === 'completed',
  });

  const isCompletedStatus = (status: string | null) => status === 'completed' || status === 'completed_partial';

  logger.debug('Rendering work order list', { data: { activeCount: activeWorkOrders.length } });

  // Filter active orders (search + status filter)
  const filteredActiveOrders = useMemo(() => {
    let orders = activeWorkOrders;

    if (statusFilter === 'active') {
      orders = orders.filter((wo) => !wo.is_blocked && !isCompletedStatus(wo.status));
    } else if (statusFilter === 'blocked') {
      orders = orders.filter((wo) => wo.is_blocked);
    }

    if (search.trim()) {
      const query = search.toLowerCase().trim();
      orders = orders.filter((wo) => matchesQuery(wo, query));
    }

    return orders;
  }, [activeWorkOrders, statusFilter, search]);

  // Filter completed orders (search only, server-side pagination)
  const filteredCompletedOrders = useMemo(() => {
    const orders = completedResult?.data || [];
    if (!search.trim()) return orders;

    const query = search.toLowerCase().trim();
    return orders.filter((wo) => matchesQuery(wo, query));
  }, [completedResult, search]);

  // Counts for badges
  const activeCount = activeWorkOrders.filter((wo) => !wo.is_blocked && !isCompletedStatus(wo.status)).length;
  const blockedCount = activeWorkOrders.filter((wo) => wo.is_blocked).length;
  const completedCount = completedResult?.totalCount ?? 0;

  const activeOrders = filteredActiveOrders.filter((wo) => !wo.is_blocked && !isCompletedStatus(wo.status));
  const blockedOrders = filteredActiveOrders.filter((wo) => wo.is_blocked);

  const isLoading = statusFilter === 'completed' ? isLoadingCompleted : isLoadingActive;
  const displayOrders = statusFilter === 'completed' ? filteredCompletedOrders : filteredActiveOrders;

  const filterOptions: { value: FilterStatus; label: string; count: number; icon: typeof Zap }[] = [
    { value: 'all', label: 'Todas', count: activeWorkOrders.length, icon: ClipboardList },
    { value: 'active', label: 'Activas', count: activeCount, icon: Zap },
    { value: 'blocked', label: 'Bloqueadas', count: blockedCount, icon: Lock },
    { value: 'completed', label: 'Completadas', count: completedCount, icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ordenes de Trabajo</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {activeCount} activa{activeCount !== 1 ? 's' : ''} · {blockedCount} bloqueada{blockedCount !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por OT, OM, dominio, N° de serie o interno..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-11 rounded-xl"
        />
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {filterOptions.map((option) => {
          const isActive = statusFilter === option.value;
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              onClick={() => {
                setStatusFilter(option.value);
                if (option.value === 'completed') setCompletedPage(0);
              }}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {option.label}
              <Badge
                variant={isActive ? 'secondary' : 'outline'}
                className={`h-5 min-w-[20px] px-1.5 text-[10px] tabular-nums ${
                  isActive ? 'bg-primary-foreground/20 text-primary-foreground border-0' : ''
                }`}
              >
                {option.count}
              </Badge>
            </button>
          );
        })}
      </div>

      {/* Loading skeleton */}
      {isLoading && <WorkOrderListSkeleton />}

      {/* Empty state */}
      {!isLoading && displayOrders.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              {statusFilter === 'completed' ? (
                <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
              ) : statusFilter === 'blocked' ? (
                <Lock className="h-8 w-8 text-muted-foreground" />
              ) : (
                <ClipboardList className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <h3 className="text-lg font-semibold">
              {statusFilter === 'completed'
                ? 'Sin ordenes completadas'
                : statusFilter === 'blocked'
                  ? 'Sin ordenes bloqueadas'
                  : 'Sin ordenes de trabajo'}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-[280px]">
              {search.trim()
                ? 'No se encontraron resultados para tu busqueda'
                : statusFilter === 'completed'
                  ? 'No hay ordenes completadas en tu sector'
                  : 'No hay ordenes asignadas a tu sector en este momento'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Work order list - Active view with sections */}
      {!isLoading && displayOrders.length > 0 && statusFilter !== 'completed' && (
        <div className="space-y-3">
          {statusFilter === 'all' ? (
            <>
              {activeOrders.map((workOrder) => (
                <WorkOrderCard key={workOrder.id} workOrder={workOrder} />
              ))}

              {blockedOrders.length > 0 && activeOrders.length > 0 && (
                <div className="flex items-center gap-3 py-3">
                  <div className="h-px flex-1 bg-border" />
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    <Lock className="h-3 w-3" />
                    Bloqueadas ({blockedOrders.length})
                  </div>
                  <div className="h-px flex-1 bg-border" />
                </div>
              )}

              {blockedOrders.map((workOrder) => (
                <WorkOrderCard key={workOrder.id} workOrder={workOrder} />
              ))}
            </>
          ) : (
            filteredActiveOrders.map((workOrder) => <WorkOrderCard key={workOrder.id} workOrder={workOrder} />)
          )}
        </div>
      )}

      {/* Work order list - Completed view with pagination */}
      {!isLoading && statusFilter === 'completed' && filteredCompletedOrders.length > 0 && (
        <div className="space-y-3">
          {filteredCompletedOrders.map((workOrder) => (
            <WorkOrderCard key={workOrder.id} workOrder={workOrder} />
          ))}

          {/* Pagination controls */}
          {completedResult && completedResult.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Pagina {completedPage + 1} de {completedResult.totalPages} ({completedResult.totalCount} total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCompletedPage((p) => Math.max(0, p - 1))}
                  disabled={completedPage === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCompletedPage((p) => Math.min(completedResult.totalPages - 1, p + 1))}
                  disabled={completedPage >= completedResult.totalPages - 1}
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
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
        <div key={i} className="rounded-xl border border-l-4 border-l-blue-500 bg-card p-4 sm:p-5">
          <div className="space-y-3">
            <div className="flex justify-between">
              <div className="space-y-1.5">
                <Skeleton className="h-6 w-28" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-5 w-5 rounded" />
            </div>
            <div className="flex gap-1.5">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-8" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
