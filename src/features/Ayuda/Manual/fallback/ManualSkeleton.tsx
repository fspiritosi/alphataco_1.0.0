import { Skeleton } from '@/components/ui/skeleton';

/** Misma grilla que el manual (índice · contenido · "En esta guía") para que nada salte al cargar. */
export function ManualSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando el manual"
      className="grid min-w-0 gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8 xl:grid-cols-[15rem_minmax(0,1fr)_13rem]"
    >
      <div className="space-y-2">
        <Skeleton className="h-10 w-full lg:hidden" />
        <div className="hidden space-y-2 lg:block">
          {Array.from({ length: 9 }, (_, index) => (
            <Skeleton key={index} className="h-8 w-full" />
          ))}
        </div>
      </div>

      <div className="min-w-0 space-y-6">
        <div className="space-y-4 border bg-card p-6 sm:p-8">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-full max-w-prose" />
          <Skeleton className="h-12 w-full max-w-2xl" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
      </div>

      <div className="hidden space-y-2 xl:block">
        <Skeleton className="h-4 w-24" />
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-4 w-full" />
        ))}
      </div>
    </div>
  );
}
