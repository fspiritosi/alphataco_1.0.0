import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function ConfirmedOrderSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Toolbar skeleton */}
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-9 w-64" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
          {/* Table skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
          {/* Pagination skeleton */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-8 w-48" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
