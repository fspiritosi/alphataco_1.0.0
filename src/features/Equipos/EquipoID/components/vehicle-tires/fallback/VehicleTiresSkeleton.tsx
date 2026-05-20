import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// ============================================================================
// TYPES
// ============================================================================

interface VehicleTiresSkeletonProps {
  /** When true, only renders the orders table skeleton (for Suspense boundary around the list) */
  ordersOnly?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function VehicleTiresSkeleton({ ordersOnly = false }: VehicleTiresSkeletonProps) {
  return (
    <div className="space-y-6">
      {!ordersOnly && (
        /* Diagram section skeleton */
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-44" />
                <Skeleton className="h-5 w-24" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-44 w-full rounded-xl" />
              <Skeleton className="h-3 w-48" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orders table skeleton */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Toolbar area */}
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-9 w-64" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-24" />
              </div>
            </div>

            {/* Table header */}
            <div className="grid grid-cols-6 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-4" />
              ))}
            </div>

            {/* Table rows */}
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-6 gap-2">
                {Array.from({ length: 6 }).map((_, j) => (
                  <Skeleton key={j} className="h-8 rounded" />
                ))}
              </div>
            ))}

            {/* Pagination */}
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
