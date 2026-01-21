import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getMaintenanceOrdersPendingApproval } from '../actions/actionsServer';
import { PendientesEjecutarTableClient } from './components/PendientesEjecutarTableClient';

/**
 * Tab de Pendientes de Ejecutar
 *
 * Muestra los pedidos de mantenimiento que tienen fecha planificada
 * y están pendientes de aprobación por parte de Operaciones.
 *
 * Desde aquí se puede:
 * - Aprobar la fecha: El pedido pasa a 'date_confirmed' y queda listo
 *   para que el taller apruebe la entrada del equipo.
 * - Rechazar la fecha: El pedido vuelve a 'pending_scheduling' para
 *   que se planifique una nueva fecha.
 *
 * Estados que se muestran: 'scheduled'
 */
export async function PendientesEjecutarTabContent() {
  const initialData = await getMaintenanceOrdersPendingApproval();

  return (
    <Card>
      <CardHeader className="bg-gh dark:bg-muted/50 border-b-2">
        <CardTitle>Pendientes de Ejecutar</CardTitle>
        <CardDescription>Pedidos de mantenimiento con fecha planificada pendientes de aprobación</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <PendientesEjecutarTableClient initialData={initialData} />
      </CardContent>
    </Card>
  );
}
