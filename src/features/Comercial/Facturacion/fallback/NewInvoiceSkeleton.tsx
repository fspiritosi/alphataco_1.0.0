import { Skeleton } from '@/components/ui/skeleton';

/** Estructura de "Nueva factura": volver, título, selector de cliente y lista. */
export function NewInvoiceSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 py-4" aria-busy="true">
      <span className="sr-only">Cargando…</span>
      <Skeleton className="h-5 w-28" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-80" />
        <Skeleton className="h-4 w-full max-w-lg" />
      </div>
      <div className="flex max-w-xl flex-col gap-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-9 w-full" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    </div>
  );
}
