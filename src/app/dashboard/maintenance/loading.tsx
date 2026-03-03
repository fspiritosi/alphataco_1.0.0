import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* 7 tabs */}
      <div className="flex gap-1 border-b overflow-x-auto">
        <Skeleton className="h-10 w-36 rounded-none" />
        <Skeleton className="h-10 w-36 rounded-none" />
        <Skeleton className="h-10 w-32 rounded-none border-b-2 border-primary" />
        <Skeleton className="h-10 w-24 rounded-none" />
        <Skeleton className="h-10 w-32 rounded-none" />
        <Skeleton className="h-10 w-40 rounded-none" />
        <Skeleton className="h-10 w-32 rounded-none" />
      </div>

      {/* Pipeline: 4 chevron blocks */}
      <div className="flex gap-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[88px] flex-1 rounded-none" />
        ))}
      </div>

      {/* Pipeline content */}
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    </div>
  );
}
