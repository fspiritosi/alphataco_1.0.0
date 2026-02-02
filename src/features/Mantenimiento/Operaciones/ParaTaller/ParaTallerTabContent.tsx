import { getOrdersForWorkshop } from '../actions/actionsServer';
import { ParaTallerTableClient } from './components/ParaTallerTableClient';

/**
 * Subtab "Para Taller" en Operaciones
 *
 * Muestra los pedidos de mantenimiento con fecha confirmada (date_confirmed)
 * Listos para aprobar entrada a taller (cambiar a in_workshop)
 *
 * Ordenamiento: por fecha planificada ascendente
 */
export async function ParaTallerTabContent() {
  const initialData = await getOrdersForWorkshop();

  return <ParaTallerTableClient initialData={initialData} />;
}
