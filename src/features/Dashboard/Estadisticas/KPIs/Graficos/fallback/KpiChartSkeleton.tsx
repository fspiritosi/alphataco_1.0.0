import { Card, CardAction, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton que replica la estructura exacta de un KpiChart card.
 * Muestra: header con titulo + controles, area de grafico, y footer con promedio.
 */
export function KpiChartSkeleton() {
  return (
    <Card className="@container/card w-full">
      <CardHeader className="border-b">
        <div className="grid gap-1">
          {/* Titulo del KPI */}
          <Skeleton className="h-5 w-44" />
          {/* Descripcion */}
          <Skeleton className="h-4 w-72" />
        </div>
        <CardAction>
          <div className="flex items-center gap-2">
            {/* Select de rango */}
            <Skeleton className="h-9 w-[140px] rounded-md" />
            {/* Boton calendario */}
            <Skeleton className="h-9 w-[260px] rounded-md" />
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="px-4">
        <div className="relative h-[250px] w-full flex flex-col justify-between py-4">
          {/* Simular lineas de grid del grafico */}
          <Skeleton className="h-px w-full opacity-40" />
          <Skeleton className="h-px w-full opacity-40" />
          <Skeleton className="h-px w-full opacity-40" />
          <Skeleton className="h-px w-full opacity-40" />
          {/* Linea de tendencia simulada */}
          <div className="absolute inset-x-4 top-1/2 -translate-y-1/2">
            <Skeleton className="h-0.5 w-full" />
          </div>
          {/* Eje X */}
          <div className="flex justify-between pt-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-8" />
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t">
        <div className="flex flex-col gap-1">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-36" />
        </div>
      </CardFooter>
    </Card>
  );
}

/**
 * Skeleton del grid completo de 6 KPIs (para el Suspense del tab).
 */
export function GraficosGridSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <KpiChartSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
