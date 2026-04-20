import { Skeleton } from '@/components/ui/skeleton';

export function WorkshopSectorTasksSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {/* Toolbar skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>
      {/* Table skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
      {/* Pagination skeleton */}
      <div className="flex justify-end gap-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-9" />
        <Skeleton className="h-9 w-9" />
      </div>
    </div>
  );
}
