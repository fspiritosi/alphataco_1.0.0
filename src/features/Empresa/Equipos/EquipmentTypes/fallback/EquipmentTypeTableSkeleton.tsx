import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton para la tabla de Tipos de Equipo mientras carga el Server Component.
 * Simula el layout resizable con formulario a la izquierda y tabla a la derecha.
 */
export function EquipmentTypeTableSkeleton() {
  return (
    <div className="flex gap-4 min-h-[500px]">
      {/* Panel izquierdo: formulario */}
      <div className="w-[35%] space-y-5 p-2">
        <Skeleton className="h-7 w-52" />
        {/* Campo nombre */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
        {/* Radio group Aplica a */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <div className="flex gap-4">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-32" />
          </div>
        </div>
        {/* Radio group Activo */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <div className="flex gap-4">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-20" />
          </div>
        </div>
        {/* Checkbox */}
        <div className="flex gap-3 items-center">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-4 w-36" />
        </div>
        {/* Botones */}
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      {/* Divisor */}
      <div className="w-px bg-border" />

      {/* Panel derecho: tabla */}
      <div className="flex-1 space-y-4 p-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-[240px]" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 8 }).map((_, i) => (
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
