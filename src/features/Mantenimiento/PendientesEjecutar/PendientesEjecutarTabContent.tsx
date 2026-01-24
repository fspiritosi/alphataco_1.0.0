import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getMaintenanceOrdersPendingApproval } from '../actions/actionsServer';
import { PendientesEjecutarTableClient } from './components/PendientesEjecutarTableClient';

/**
 * Tab de Pendientes de Ejecutar
 *
 * Muestra los pedidos de mantenimiento que tienen fecha planificada:
 * - Pendientes de aprobación por parte de Operaciones (scheduled)
 * - Ya confirmados y listos para ejecución (date_confirmed)
 *
 * Desde aquí se puede:
 * - Ver detalle de cualquier pedido
 * - Aprobar la fecha (solo scheduled): El pedido pasa a 'date_confirmed'
 * - Rechazar la fecha (solo scheduled): El pedido vuelve a 'pending_scheduling'
 *
 * Estados que se muestran: 'scheduled', 'date_confirmed'
 * Ordenamiento: scheduled primero (pendientes), luego date_confirmed (confirmados)
 */
export async function PendientesEjecutarTabContent() {
  const initialData = await getMaintenanceOrdersPendingApproval();

  return (
    <Card>
      <CardHeader className="bg-gh dark:bg-muted/50 border-b-2">
        <CardTitle>Pendientes de Ejecutar</CardTitle>
        <CardDescription>Pedidos de mantenimiento pendientes de aprobación y confirmados</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <PendientesEjecutarTableClient initialData={initialData} />
      </CardContent>
    </Card>
  );
}
