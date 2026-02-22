import { CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function OtherEquipmentHeaderSkeleton() {
  return (
    <div className="w-full">
      <CardContent className="p-2">
        <div className="flex items-start gap-6">
          {/* Icono placeholder */}
          <div className="flex-shrink-0">
            <Skeleton className="size-28 rounded-lg" />
          </div>

          {/* Información del equipo */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-5 w-24" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-20" />
                <Skeleton className="h-9 w-9" />
                <Skeleton className="h-10 w-[1px]" />
                <Skeleton className="h-9 w-20" />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-5 w-24" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </div>
  );
}
