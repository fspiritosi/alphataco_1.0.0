import { Skeleton } from '@/components/ui/skeleton';

/**
 * Register page loading skeleton.
 * Matches the register page: two-column layout with banner (left)
 * and registration form (right) with 5 fields + submit button + link.
 */
export default function Loading() {
  return (
    <section className="min-h-screen bg-white dark:bg-transparent">
      <div className="container relative flex-col grid-cols-1 justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0 md:px-4 min-h-screen">
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

        {/* Panel derecho — formulario */}
        <div className="lg:p-8 relative z-50 md:p-8 pt-7 p-0 flex flex-col justify-center items-center w-full">
          {/* Logo mobile */}
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <Skeleton className="h-12 w-12 rounded" />
            <Skeleton className="h-8 w-40" />
          </div>

          <div className="w-full overflow-y-auto max-h-screen">
            {/* Titulo */}
            <Skeleton className="h-7 w-80 mb-4" />

            {/* Formulario con 5 campos */}
            <div className="space-y-3">
              {/* Nombre */}
              <div className="space-y-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-10 w-full" />
              </div>
              {/* Apellido */}
              <div className="space-y-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
              {/* Email */}
              <div className="space-y-2">
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-10 w-full" />
              </div>
              {/* Contraseña */}
              <div className="space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
              {/* Confirmar Contraseña */}
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-10 w-full" />
              </div>

              {/* Boton + link */}
              <div className="flex flex-col items-center gap-5 pt-2">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-4 w-56" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
