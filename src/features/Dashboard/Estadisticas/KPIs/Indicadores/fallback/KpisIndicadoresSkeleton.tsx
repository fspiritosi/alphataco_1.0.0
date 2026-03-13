import { Skeleton } from '@/components/ui/skeleton';

export function KpisIndicadoresSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-64" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-[400px] w-full rounded-md" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-48" />
      </div>
    </div>
  );
}
