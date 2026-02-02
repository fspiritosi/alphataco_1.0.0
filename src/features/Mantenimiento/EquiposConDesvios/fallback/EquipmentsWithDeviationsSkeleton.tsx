import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function EquipmentsWithDeviationsSkeleton() {
  return (
    <Card className="p-6">
      <CardHeader className="px-0 pt-0">
        <CardTitle>Equipos con Desvíos Pendientes</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="space-y-4">
          {/* Toolbar skeleton */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-32" />
          </div>
          {/* Table skeleton */}
          <div className="rounded-md border">
            {/* Header */}
            <div className="border-b bg-muted/50 p-3">
              <div className="flex gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            {/* Rows */}
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="border-b p-3">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-8 w-32" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
