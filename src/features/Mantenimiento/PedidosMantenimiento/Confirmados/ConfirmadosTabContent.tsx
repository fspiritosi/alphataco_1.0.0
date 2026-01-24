import { getMaintenanceOrdersConfirmed } from '../actions/actionsServer';
import { ConfirmadosTableClient } from './components/ConfirmadosTableClient';

/**
 * Subtab de Pedidos Confirmados
 *
 * Muestra los pedidos de mantenimiento con fecha confirmada (date_confirmed)
 * Listos para aprobar entrada a taller
 *
 * Ordenamiento: de más viejo a más reciente
 */
export async function ConfirmadosTabContent() {
  const initialData = await getMaintenanceOrdersConfirmed();

  return <ConfirmadosTableClient initialData={initialData} />;
}
