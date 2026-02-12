import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getMaintenanceOrders } from '../MaintenanceOrders/actions/actionsServer';
import { WorkshopTrackingClient } from './components/WorkshopTrackingClient';

/**
 * Tab de Seguimiento en Taller - Operaciones (solo lectura)
 *
 * Permite a Operaciones ver el estado actual de los equipos en taller
 * sin poder realizar acciones. Reutiliza el OrdenDetalleDialog en modo readOnly.
 */
export async function WorkshopTrackingTabContent() {
  const initialData = await getMaintenanceOrders();

  return (
    <Card>
      <CardHeader className="bg-gh dark:bg-muted/50 border-b-2">
        <CardTitle>Seguimiento en Taller</CardTitle>
        <CardDescription>Vista de lectura del progreso de equipos en taller</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <WorkshopTrackingClient initialData={initialData} />
      </CardContent>
    </Card>
  );
}
