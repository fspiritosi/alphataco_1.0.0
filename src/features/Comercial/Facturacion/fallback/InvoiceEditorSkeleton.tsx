import { Skeleton } from '@/components/ui/skeleton';

/** Estructura del editor / detalle de un comprobante: encabezado + columna principal + columna de totales. */
export function InvoiceEditorSkeleton() {
  return (
    <div className="flex flex-col gap-6 py-4" aria-busy="true">
      <span className="sr-only">Cargando comprobante…</span>
      <Skeleton className="h-5 w-28" />
      <div className="flex items-center gap-3">
        <Skeleton className="size-12" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-72" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
          <Skeleton className="h-16 w-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
        <div className="flex flex-col gap-4 border p-4">
          <Skeleton className="size-12" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
    </div>
  );
}
