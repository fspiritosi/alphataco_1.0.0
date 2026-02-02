import { Card, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function NuevoPedidoSkeleton() {
  return (
    <Card className="p-6">
      <div className="flex gap-6 pt-6">
        {/* Panel izquierdo - Formulario */}
        <div className="min-w-[280px] space-y-4 p-3">
          {/* Label + Input equipo */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>

          {/* Label + Input kilometraje */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>

          {/* Label + Select tipo de reparación */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-10 w-full" />
          </div>

          {/* Label + Select grupo */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-10 w-full" />
          </div>

          {/* Botón */}
          <div className="pt-4 border-t">
            <Skeleton className="h-10 w-36 ml-auto" />
          </div>
        </div>

        {/* Panel derecho - Tabla */}
        <div className="flex-1 space-y-4 pl-6">
          <CardTitle>Se registrarán los siguientes trabajos</CardTitle>

          <div className="space-y-3">
            {/* Headers de la tabla */}
            <div className="flex gap-4">
              <Skeleton className="h-8 w-[200px]" />
              <Skeleton className="h-8 w-[150px]" />
              <Skeleton className="h-8 w-[100px]" />
              <Skeleton className="h-8 w-[150px]" />
              <Skeleton className="h-8 w-[100px]" />
            </div>

            {/* Filas vacías de la tabla */}
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-12 w-[200px]" />
                <Skeleton className="h-12 w-[150px]" />
                <Skeleton className="h-12 w-[100px]" />
                <Skeleton className="h-12 w-[150px]" />
                <Skeleton className="h-12 w-[100px]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
