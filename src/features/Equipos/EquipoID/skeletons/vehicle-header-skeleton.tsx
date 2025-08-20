import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function VehicleHeaderSkeleton() {
  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="flex items-start gap-6">
          {/* Vehicle Image Skeleton */}
          <div className="flex-shrink-0">
            <Skeleton className="h-24 w-24 rounded-lg" />
          </div>

          {/* Vehicle Info Skeleton */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-8 w-48" />
              <div className="flex gap-2">
                <Skeleton className="h-9 w-20" />
                <Skeleton className="h-9 w-9" />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-5 w-24" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-5 w-20" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-5 w-16" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-4 w-18" />
                <Skeleton className="h-5 w-28" />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
