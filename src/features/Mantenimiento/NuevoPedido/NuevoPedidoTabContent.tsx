import { fetchAllEquipmentBasicData } from '@/features/Mantenimiento/actions/equipment-basic';
import { NuevoPedidoChecklistForm } from './components/NuevoPedidoChecklistForm';

interface NuevoPedidoTabContentProps {
  equipment_id?: string;
}

/**
 * Server Component para la tab de Nuevo Pedido de Mantenimiento
 * Carga la lista de equipos del servidor y los pasa al formulario cliente
 * El formulario permite crear pedidos seleccionando items de checklist
 */
export async function NuevoPedidoTabContent({ equipment_id }: NuevoPedidoTabContentProps) {
  // Fetch equipos del servidor
  const equipments = await fetchAllEquipmentBasicData();

  // Filtrar equipos si hay uno por defecto
  const vehiclesFormatted = equipment_id ? equipments?.filter((e) => e.id === equipment_id) || [] : equipments || [];

  return <NuevoPedidoChecklistForm equipment={vehiclesFormatted} default_equipment_id={equipment_id} />;
}
