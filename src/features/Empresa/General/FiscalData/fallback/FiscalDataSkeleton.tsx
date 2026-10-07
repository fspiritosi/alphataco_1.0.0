import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

/** Replica las secciones de Datos fiscales: resumen, ambiente, form del emisor, puntos de venta y certificado. */
export function FiscalDataSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-hidden>
      {/* Resumen */}
      <div className="flex flex-col gap-3 border p-4">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-6 w-56" />
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-44" />
          ))}
        </div>
      </div>

      {/* Ambiente */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-80" />
        <Skeleton className="h-9 w-40" />
      </div>
      <Separator />

      {/* Datos del emisor */}
      <div className="flex flex-col gap-4">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      </div>
      <Separator />

      {/* Puntos de venta */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-9 w-44" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
      <Separator />

      {/* Certificado */}
      <div className="flex flex-col gap-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-9 w-64" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="size-8 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-5 w-56" />
              <Skeleton className="h-4 w-full max-w-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
