import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton para la tabla de Marcas de Equipos mientras carga el Server Component.
 * Simula el layout con formulario a la izquierda y tabla a la derecha.
 */
export function EquipmentBrandTableSkeleton() {
  return (
    <div className="flex gap-4 min-h-[400px]">
      {/* Panel izquierdo: formulario */}
      <div className="w-[30%] space-y-4 p-2">
        <Skeleton className="h-7 w-48" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <div className="flex gap-4">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-20" />
          </div>
        </div>
        <Skeleton className="h-10 w-24" />
      </div>

      {/* Divisor */}
      <div className="w-px bg-border" />

      {/* Panel derecho: tabla */}
      <div className="flex-1 space-y-4 p-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-[220px]" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-9 w-48" />
        </div>
      </div>
    </div>
  );
}
