import { getMaintenanceOrders } from './actions/actionsServer';
import { PedidosTableClient } from './components/PedidosTableClient';

export async function PedidosMantenimientoTabContent() {
  // Fetching en el servidor
  const initialData = await getMaintenanceOrders();

  return <PedidosTableClient initialData={initialData} />;
}
