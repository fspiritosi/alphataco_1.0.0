import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function FormsTableSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Toolbar skeleton */}
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-9 w-[300px]" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>

          {/* Table skeleton */}
          <div className="rounded-md border">
            {/* Header */}
            <div className="border-b px-4 py-3 flex gap-4">
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-4 w-[150px]" />
              <Skeleton className="h-4 w-[80px]" />
              <Skeleton className="h-4 w-[80px]" />
              <Skeleton className="h-4 w-[100px]" />
            </div>

            {/* Rows */}
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="border-b px-4 py-3 flex gap-4 items-center last:border-0">
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-4 w-[150px]" />
                <Skeleton className="h-6 w-[80px] rounded-full" />
                <Skeleton className="h-6 w-[70px] rounded-full" />
                <Skeleton className="h-4 w-[90px]" />
              </div>
            ))}
          </div>

          {/* Pagination skeleton */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-[150px]" />
            <div className="flex gap-2">
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
