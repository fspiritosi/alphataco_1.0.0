import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getMaintenanceOrders } from './actions/actionsServer';
import { MaintenanceOrdersClient } from './components/MaintenanceOrdersClient';

/**
 * Tab de Ordenes de Mantenimiento - Taller
 *
 * Muestra las ordenes de mantenimiento con su progreso por sectores.
 * Permite ver el detalle con timeline de sectores y estado de cada tarea.
 */
export async function MaintenanceOrdersTabContent() {
  const initialData = await getMaintenanceOrders();

  return (
    <Card>
      <CardHeader className="bg-gh dark:bg-muted/50 border-b-2">
        <CardTitle>Ordenes de Mantenimiento</CardTitle>
        <CardDescription>Seguimiento de ordenes con progreso por sectores y secuencia de ejecucion</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <MaintenanceOrdersClient initialData={initialData} />
      </CardContent>
    </Card>
  );
}
