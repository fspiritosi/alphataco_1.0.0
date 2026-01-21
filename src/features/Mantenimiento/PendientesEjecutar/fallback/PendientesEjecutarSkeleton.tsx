import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function PendientesEjecutarSkeleton() {
  return (
    <Card>
      <CardHeader className="bg-gh dark:bg-muted/50 border-b-2">
        <CardTitle>Pendientes de Ejecutar</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Toolbar skeleton */}
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
          {/* Table skeleton */}
          <div className="border rounded-lg">
            {/* Header */}
            <div className="border-b p-4 flex gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
            {/* Rows */}
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="border-b p-4 flex gap-4 items-center">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
