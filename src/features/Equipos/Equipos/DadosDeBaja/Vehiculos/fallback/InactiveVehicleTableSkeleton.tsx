import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function InactiveVehicleTableSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Toolbar skeleton */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-64" />
              <Skeleton className="h-9 w-24" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
          {/* Table skeleton */}
          <div className="rounded-md border">
            <div className="border-b px-4 py-3">
              <div className="flex gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 flex-1" />
                ))}
              </div>
            </div>
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="border-b px-4 py-3 last:border-0">
                <div className="flex gap-4">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <Skeleton key={j} className="h-4 flex-1" />
                  ))}
                </div>
              </div>
            ))}
          </div>
          {/* Pagination skeleton */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-48" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-9" />
              <Skeleton className="h-9 w-9" />
              <Skeleton className="h-9 w-9" />
              <Skeleton className="h-9 w-9" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
