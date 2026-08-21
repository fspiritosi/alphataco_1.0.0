import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function OperacionesChartsSkeleton() {
  return (
    <section className="grid grid-cols-1 gap-3 mb-4">
      {/* Main area chart skeleton */}
      <Card className="py-0">
        <CardHeader className="flex flex-col items-stretch border-b p-0! sm:flex-row">
          <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:py-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-36" />
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Skeleton className="h-8 w-[200px]" />
              <Skeleton className="h-8 w-[200px]" />
              <Skeleton className="h-8 w-[220px]" />
            </div>
          </div>
          <div className="flex">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
              >
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <Skeleton className="h-[280px] w-full" />
        </CardContent>
      </Card>

      {/* Client ranking skeleton */}
      <Card className="py-0">
        <CardHeader className="pb-2 pt-4 px-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-28" />
        </CardHeader>
        <CardContent className="px-2 pb-4 sm:px-6">
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-4 w-[130px]" />
                <Skeleton className="h-6 flex-1" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
