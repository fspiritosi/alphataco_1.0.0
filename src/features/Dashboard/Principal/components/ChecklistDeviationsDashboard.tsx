'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getTractorUnitsWithPendingDeviations } from '@/features/Mantenimiento/actions/maintenance-actions';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export function ChecklistDeviationsDashboard() {
  const { data: equipments = [], isLoading } = useQuery({
    queryKey: ['tractor-units-pending-deviations'],
    queryFn: () => getTractorUnitsWithPendingDeviations(),
    staleTime: 5 * 60 * 1000,
  });

  const totalDeviations = equipments.reduce((sum, eq) => sum + eq.deviation_count, 0);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Desvíos de Checklist Pendientes</CardTitle>
          <CardDescription>Cargando datos...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (equipments.length === 0) {
    return null; // No mostrar nada si no hay equipos con desvíos
  }

  return (
    <Card className="border-l-4 border-l-destructive">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Desvíos de Checklist Pendientes
            </CardTitle>
            <CardDescription>
              Equipos con desvíos sin solicitud de mantenimiento (solo unidades tractoras)
            </CardDescription>
          </div>
          <Badge variant="destructive" className="text-lg px-3 py-1">
            {totalDeviations} {totalDeviations === 1 ? 'desvío' : 'desvíos'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {equipments.map((equipment) => {
            const displayName = equipment.domain || equipment.serie || 'Sin dominio/serie';
            const equipmentUrl = `/maintenance/equipment/${equipment.id}`;

            return (
              <Link key={equipment.id} href={equipmentUrl} className="block">
                <Alert className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="flex items-center justify-between">
                    <span>
                      {displayName}
                      {equipment.intern_number && (
                        <span className="text-muted-foreground ml-1">(Nº {equipment.intern_number})</span>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive">
                        {equipment.deviation_count} {equipment.deviation_count === 1 ? 'desvío' : 'desvíos'}
                      </Badge>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </AlertTitle>
                  {equipment.type_name && (
                    <AlertDescription className="text-sm text-muted-foreground">
                      Tipo: {equipment.type_name}
                    </AlertDescription>
                  )}
                </Alert>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
