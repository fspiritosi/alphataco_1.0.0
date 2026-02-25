import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function VehicleTableSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-40" />
        </div>
        <div className="flex gap-2 mt-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Cabecera de tabla */}
          <Skeleton className="h-10 w-full" />
          {/* Filas */}
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
          {/* Paginación */}
          <div className="flex items-center justify-between pt-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-48" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
