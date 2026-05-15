import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton del shell completo: donut + 3 acordeones cerrados.
 * Solo se ve mientras el Dynamic wrapper carga el chunk de Recharts —
 * los detalles de cada categoria se cargan despues, al abrir el acordeon
 * (su skeleton vive dentro de CategorySection).
 */
export function MantenimientoChartsSkeleton() {
  return (
    <section className="grid grid-cols-1 gap-3 mb-4">
      {/* Donut card skeleton */}
      <Card className="py-0">
        <CardHeader className="flex flex-col items-stretch border-b p-0! sm:flex-row">
          <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:py-4">
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-4 w-72" />
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <Skeleton className="h-8 w-[210px]" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-2 pt-6 pb-6 sm:px-6">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-center lg:justify-around">
              <Skeleton className="h-[220px] w-[220px] rounded-full" />
              <div className="flex flex-col gap-2.5 w-full max-w-xs">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 rounded-md border bg-card/40 px-3 py-2">
                    <Skeleton className="h-3 w-3 rounded-full" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-8" />
                    <Skeleton className="h-3 w-10" />
                  </div>
                ))}
              </div>
            </div>
            {/* Banda de KPIs de condicion */}
            <div className="flex flex-wrap items-center justify-center gap-2 border-t pt-4 lg:gap-4">
              <Skeleton className="h-3 w-16" />
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-6 w-28 rounded-md" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3 secciones cerradas — solo el header */}
      {[1, 2, 3].map((i) => (
        <Card key={i} className="py-0">
          <CardHeader className="flex flex-row items-center justify-between gap-3 px-6 py-3 border-b">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-10 rounded-full" />
            </div>
            <Skeleton className="h-8 w-[220px]" />
          </CardHeader>
        </Card>
      ))}
    </section>
  );
}
