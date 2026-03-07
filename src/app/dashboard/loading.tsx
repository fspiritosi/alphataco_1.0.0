import { Skeleton } from '@/components/ui/skeleton';
import { KpiCardsSkeleton } from '@/features/Dashboard/Principal/fallback/KpiCardsSkeleton';
import { SectionSkeleton } from '@/features/Dashboard/Principal/fallback/SectionSkeleton';

export default function Loading() {
  return (
    <div>
      <div className="flex gap-1 border-b mb-4">
        <Skeleton className="h-10 w-28 rounded-t-md" />
        <Skeleton className="h-10 w-36 rounded-t-md" />
        <Skeleton className="h-10 w-32 rounded-t-md" />
      </div>

      <div className="flex flex-col gap-4 mb-4">
        <KpiCardsSkeleton />
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <SectionSkeleton />
          <SectionSkeleton />
          <SectionSkeleton />
          <SectionSkeleton />
        </div>
      </div>
    </div>
  );
}
