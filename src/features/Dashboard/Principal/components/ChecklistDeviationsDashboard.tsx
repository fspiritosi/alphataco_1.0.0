'use client';

import { getTractorUnitsWithPendingDeviations } from '@/app/maintenance/actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type EquipmentWithDeviations = {
  id: string;
  domain: string | null;
  serie: string | null;
  intern_number: string | null;
  type_name: string | null;
  deviation_count: number;
};

export function ChecklistDeviationsDashboard() {
  const [equipments, setEquipments] = useState<EquipmentWithDeviations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalDeviations, setTotalDeviations] = useState(0);

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const equipmentsData = await getTractorUnitsWithPendingDeviations();
        setEquipments(equipmentsData as any);
        const total = equipmentsData.reduce((sum, eq) => sum + eq.deviation_count, 0);
        setTotalDeviations(total);
      } catch (error) {
        console.error('Error loading equipments with deviations:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Desvíos de Checklist Pendientes</CardTitle>
          <CardDescription>Cargando datos...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (equipments.length === 0) {
    return null; // No mostrar nada si no hay equipos con desvíos
  }

  return (
    <Card>
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
