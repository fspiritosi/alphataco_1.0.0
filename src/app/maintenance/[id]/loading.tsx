import { Skeleton } from '@/components/ui/skeleton';

/**
 * Maintenance [id] loading skeleton.
 * Matches QrActionSelector default view: a centered Card (max-w-md) with:
 * - Logo at top
 * - Equipment info (domain/serie badges)
 * - "Seleccione una opcion" title
 * - 3 large action buttons
 * - Exit button footer
 */
export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-2">
      <div className="w-full max-w-md space-y-6 rounded-xl border bg-white p-6 py-0 shadow-lg">
        {/* CardHeader */}
        <div className="pt-6 space-y-3">
          {/* Logo centrado */}
          <div className="flex items-center justify-center mb-4">
            <Skeleton className="h-15 w-60" />
          </div>
          {/* Descripcion */}
          <Skeleton className="h-4 w-72 mx-auto" />

          {/* Info del equipo */}
          <div className="space-y-2 pt-2">
            <Skeleton className="h-4 w-40 mx-auto" />
            <Skeleton className="h-7 w-48 mx-auto rounded-full" />
            <Skeleton className="h-7 w-40 mx-auto rounded-full" />
          </div>
        </div>

        {/* Titulo "Seleccione una opcion" */}
        <Skeleton className="h-9 w-64 mx-auto" />

        {/* 3 botones grandes de accion */}
        <div className="space-y-4 pb-2">
          <Skeleton className="h-14 w-full rounded-md" />
          <Skeleton className="h-14 w-full rounded-md" />
          <Skeleton className="h-14 w-full rounded-md" />
        </div>

        {/* CardFooter — Boton "Salir" */}
        <div className="pb-6">
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}
