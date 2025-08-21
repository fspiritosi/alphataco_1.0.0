import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function EmployeeHeaderSkeleton() {
  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="flex items-start gap-6">
          {/* Profile Picture Skeleton */}
          <div className="flex-shrink-0">
            <Skeleton className="h-24 w-24 rounded-full" />
          </div>

          {/* Employee Info Skeleton */}
          <div className="flex-1 space-y-3">
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-5 w-48" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-32" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-28" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </div>
          </div>

          {/* Action Buttons Skeleton */}
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
