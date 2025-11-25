import { Skeleton } from '@/components/ui/skeleton';

export function SkeletonTable() {
  return (
    <div className="space-y-4">
      {/* Filtros y controles de columnas */}
      <div className="flex items-center py-4">
        <Skeleton className="h-10 w-[300px]" />
        <Skeleton className="ml-auto h-10 w-[150px]" />
      </div>

      {/* Tabla */}
      <div className="rounded-md border">
        {/* Encabezados de tabla */}
        <div className="flex border-b p-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={`header-${i}`} className="mx-2 h-8 flex-1" />
          ))}
        </div>

        {/* Filas de tabla */}
        <div className="space-y-4 p-2">
          {[...Array(5)].map((_, rowIndex) => (
            <div key={`row-${rowIndex}`} className="flex">
              {[...Array(6)].map((_, cellIndex) => (
                <div key={`cell-${rowIndex}-${cellIndex}`} className="mx-2 flex-1">
                  <Skeleton className="h-6 w-full" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Paginación */}
      {/* <div className="flex items-center justify-end space-x-2 py-4">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-20" />
      </div> */}
    </div>
  );
}
