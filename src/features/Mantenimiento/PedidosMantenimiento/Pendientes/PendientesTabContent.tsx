import { getMaintenanceOrdersPending } from '../actions/actionsServer';
import { PendientesTableClient } from './components/PendientesTableClient';

/**
 * Subtab de Pedidos Pendientes
 *
 * Muestra los pedidos de mantenimiento:
 * - pending_scheduling: Pendientes de planificar fecha
 * - scheduled: Pendientes de aprobación de fecha (ya planificados)
 *
 * Ordenamiento: pending_scheduling primero, luego scheduled, de más viejo a más reciente
 */
export async function PendientesTabContent() {
  const initialData = await getMaintenanceOrdersPending();

  return <PendientesTableClient initialData={initialData} />;
}
