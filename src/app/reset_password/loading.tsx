import { Skeleton } from '@/components/ui/skeleton';

/**
 * Reset password loading skeleton.
 * Matches the recovery password page: two-column layout with banner (left)
 * and recovery form (right) with 1 email field + description + submit + link.
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
            {/* Titulo largo (text-3xl, multilínea en mobile) */}
            <Skeleton className="h-9 w-full max-w-lg mb-1" />
            <Skeleton className="h-9 w-3/4 max-w-md mb-5" />

            {/* Formulario */}
            <div className="space-y-8">
              {/* Campo Email: label + input + FormDescription */}
              <div className="space-y-2">
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-4 w-full max-w-sm" />
              </div>

              {/* Boton full-width */}
              <Skeleton className="h-10 w-full" />

              {/* Link "¿Recordaste tu contraseña?" */}
              <Skeleton className="h-4 w-56 mx-auto" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
