import { Skeleton } from '@/components/ui/skeleton';

export function OperacionesPipelineSkeleton() {
  return (
    <div className="space-y-6">
      {/* Skeleton de los chevrons del pipeline */}
      <div className="flex gap-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[88px] flex-1 rounded-none" />
        ))}
      </div>
      {/* Skeleton del contenido */}
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    </div>
  );
}
