import { getMaintenanceRequests } from './actions/actionsServer';
import { SolicitudesTableClient } from './components/SolicitudesTableClient';

export async function SolicitudesMantenimientoTabContent() {
  // Fetching en el servidor
  const initialData = await getMaintenanceRequests();

  return <SolicitudesTableClient initialData={initialData} />;
}
