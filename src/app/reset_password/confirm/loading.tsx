import { Skeleton } from '@/components/ui/skeleton';

/**
 * Reset password confirm loading skeleton.
 * Matches the confirm page: two-column layout with banner (left)
 * and status message (right) — NO form fields, just an info/error block.
 */
export default function Loading() {
  return (
    <section className="min-h-screen overflow-hidden bg-white dark:bg-transparent">
      <div className="container relative flex-col grid-cols-1 justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0 md:px-2 p-0">
        {/* Banner izquierdo */}
        <div className="hidden lg:flex flex-col min-h-screen border-r-2 p-10">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded" />
            <Skeleton className="h-6 w-40" />
          </div>
          <div className="mt-auto space-y-3">
            <Skeleton className="h-4 w-full max-w-md" />
            <Skeleton className="h-4 w-3/4 max-w-md" />
            <Skeleton className="h-3 w-32 mt-4" />
          </div>
        </div>

        {/* Panel derecho */}
        <div className="lg:p-8 relative z-50 md:p-8 pt-7 p-0 flex flex-col justify-center items-center w-full">
          {/* Logo mobile */}
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <Skeleton className="h-12 w-12 rounded" />
            <Skeleton className="h-7 w-40" />
          </div>

          <div className="w-full overflow-y-auto">
            {/* Titulo */}
            <Skeleton className="h-9 w-72 mb-4" />

            {/* Bloque de estado/info (borde coloreado) */}
            <div className="p-6 rounded-lg border space-y-3">
              <Skeleton className="h-5 w-48 mx-auto" />
              <Skeleton className="h-4 w-72 mx-auto" />
              <Skeleton className="h-10 w-48 mx-auto mt-4 rounded-md" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
