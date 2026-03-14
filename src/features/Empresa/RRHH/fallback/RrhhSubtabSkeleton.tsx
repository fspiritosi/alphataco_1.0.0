import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton genérico para subtabs de RRHH con layout form+tabla resizable */
export function RrhhSubtabSkeleton() {
  return (
    <div className="flex gap-4 min-h-[400px]">
      {/* Panel izquierdo: formulario */}
      <div className="w-[40%] space-y-4 pr-2">
        <Skeleton className="h-7 w-48" />
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      {/* Separador */}
      <div className="w-px bg-border" />

      {/* Panel derecho: tabla */}
      <div className="flex-1 space-y-3 pl-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-[200px]" />
          <Skeleton className="h-9 w-[100px]" />
        </div>
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}

/** Skeleton para la subtab de CCT (árbol de convenios) */
export function CctSubtabSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-[200px]" />
        <Skeleton className="h-9 w-[120px]" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-8 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
