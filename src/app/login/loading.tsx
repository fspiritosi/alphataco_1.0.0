import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <section className="min-h-screen overflow-hidden bg-white dark:bg-transparent">
      <div className="container relative flex-col grid-cols-1 justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0 md:px-2 p-0">
        {/* Banner izquierdo — solo visible en lg */}
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
            <Skeleton className="h-7 w-40" />
          </div>

          <div className="w-full overflow-y-auto">
            {/* CardHeader — Titulo */}
            <div className="px-6 pb-4">
              <Skeleton className="h-9 w-80 lg:w-96" />
            </div>

            {/* CardContent — Formulario */}
            <div className="px-6 space-y-8">
              {/* Campo Email: label + input + descripcion */}
              <div className="w-full space-y-2">
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-4 w-52" />
              </div>

              {/* Campo Password: label + input + descripcion */}
              <div className="space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-4 w-56" />
              </div>

              {/* Boton de login */}
              <div className="flex justify-center">
                <Skeleton className="h-10 w-36" />
              </div>

              {/* Separador */}
              <Skeleton className="h-px w-[70%] mx-auto" />

              {/* Link de recuperacion */}
              <Skeleton className="h-4 w-64 mx-auto" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
