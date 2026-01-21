import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchActiveWorkshops, fetchAllWorkshopSectors } from '@/features/Empresa/General/actions/workshops.actions';
import { getMaintenanceOrdersInWorkshop } from '../actions/actionsServer';
import { PlanificacionTableClient } from './components/PlanificacionTableClient';

/**
 * Tab de Planificación de Mantenimiento
 *
 * Muestra los desvíos de equipos que ya ingresaron al taller y están en proceso de planificación.
 * Desde aquí se asignan talleres, sectores y períodos de fecha a cada desvío.
 *
 * Estados que se muestran: 'in_workshop'
 */
export async function PlanificacionTabContent() {
  // Cargar datos en paralelo en el servidor
  const [initialData, workshopsData, sectorsData] = await Promise.all([
    getMaintenanceOrdersInWorkshop(),
    fetchActiveWorkshops(),
    fetchAllWorkshopSectors(),
  ]);

  // Mapear a formato simple para el cliente
  const workshops = workshopsData.map((w) => ({
    id: w.id,
    name: w.name,
    workshop_type: w.type,
  }));

  const sectors = sectorsData.map((s) => ({
    id: s.id,
    name: s.name,
    workshop_id: s.workshop_id,
  }));

  return (
    <Card>
      <CardHeader className="bg-gh dark:bg-muted/50 border-b-2">
        <CardTitle>Planificación de Mantenimiento</CardTitle>
        <CardDescription>Desvíos pendientes de asignación de taller, sector y período de fecha</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <PlanificacionTableClient initialData={initialData} workshops={workshops} sectors={sectors} />
      </CardContent>
    </Card>
  );
}
