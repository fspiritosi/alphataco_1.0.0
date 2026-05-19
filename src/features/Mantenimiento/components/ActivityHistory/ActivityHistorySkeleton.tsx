'use client';

import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

interface ActivityHistorySkeletonProps {
  /** Si es true, renderiza el bloque de "Órdenes de Trabajo" con acordeones placeholder */
  showWorkOrders?: boolean;
}

/**
 * Skeleton dedicado para `ActivityHistoryModal`.
 * Replica el layout real: timeline de eventos arriba + sección de OTs (acordeones colapsados) abajo.
 */
export function ActivityHistorySkeleton({ showWorkOrders = true }: ActivityHistorySkeletonProps) {
  return (
    <div className="space-y-2">
      {/* Timeline de eventos a nivel OM */}
      <div className="relative">
        {[0, 1, 2, 3].map((i) => (
          <TimelineItemSkeleton key={i} isLast={i === 3} />
        ))}
      </div>

      {showWorkOrders && (
        <>
          <Separator className="my-4" />

          {/* Cabecera "Órdenes de Trabajo (N)" */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-44" />
          </div>

          {/* 2 acordeones colapsados */}
          <div className="space-y-2 pt-1">
            <WorkOrderAccordionSkeleton />
            <WorkOrderAccordionSkeleton />
          </div>
        </>
      )}
    </div>
  );
}

function TimelineItemSkeleton({ isLast }: { isLast: boolean }) {
  return (
    <div className="relative flex items-start gap-3 pl-1">
      {!isLast && <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-muted" />}
      <Skeleton className="relative z-10 h-8 w-8 rounded-full" />
      <div className="flex-1 pt-0.5 pb-4 space-y-1.5">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

function WorkOrderAccordionSkeleton() {
  return (
    <div className="border rounded-md overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/40">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 flex-1 max-w-[220px]" />
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>
    </div>
  );
}
