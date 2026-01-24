import { fetchAllEquipmentBasicData } from '@/app/server/GET/actions';
import { fetchAllTypesOfRepairs } from '@/components/Tipos_de_reparaciones/actions/actions';
import { fetchMaintenanceGroupsAction } from '@/components/Tipos_de_reparaciones/actions/maintenanceGroupActions';
import { TypeOfRepair } from '@/types/types';
import { NuevoPedidoForm } from './components/NuevoPedidoForm';

interface NuevoPedidoTabContentProps {
  equipment_id?: string;
}

/**
 * Server Component para la tab de Nuevo Pedido de Mantenimiento
 * Carga todos los datos necesarios del servidor y los pasa al formulario cliente
 */
export async function NuevoPedidoTabContent({ equipment_id }: NuevoPedidoTabContentProps) {
  // Fetch data del servidor
  const [typesOfRepairs, equipments, maintenanceGroupsResult] = await Promise.all([
    fetchAllTypesOfRepairs(),
    fetchAllEquipmentBasicData(),
    fetchMaintenanceGroupsAction(),
  ]);

  // Filtrar equipos si hay uno por defecto
  const vehiclesFormatted = equipment_id ? equipments?.filter((e) => e.id === equipment_id) || [] : equipments || [];

  return (
    <NuevoPedidoForm
      equipment={vehiclesFormatted}
      types_of_repairs={typesOfRepairs as TypeOfRepair}
      maintenance_groups={maintenanceGroupsResult.groups || []}
      default_equipment_id={equipment_id}
    />
  );
}
