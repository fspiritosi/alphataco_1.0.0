import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function _VerifyDocumentsSkeleton() {
  return (
    <div className="space-y-4">
      {/* Badges de resumen */}
      <div className="flex gap-2">
        <Skeleton className="h-6 w-28 rounded-full" />
        <Skeleton className="h-6 w-28 rounded-full" />
      </div>

      {/* Texto descriptivo */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* Card con tabla simulada */}
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {/* Header de tabla */}
            <div className="flex gap-4 border-b pb-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
            </div>
            {/* Filas */}
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-4 py-1.5">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Boton al pie */}
      <div className="flex justify-end">
        <Skeleton className="h-9 w-48" />
      </div>
    </div>
  );
}
