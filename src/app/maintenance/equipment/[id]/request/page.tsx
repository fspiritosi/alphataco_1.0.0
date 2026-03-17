import { NuevoPedidoForm } from '@/features/Mantenimiento/NuevoPedido/components/NuevoPedidoForm';
import { fetchAllTypesOfRepairs } from '@/features/Mantenimiento/TiposReparaciones/actions/actions';
import { fetchMaintenanceGroupsAction } from '@/features/Mantenimiento/TiposReparaciones/actions/maintenanceGroupActions';
import { fetchAllEquipmentBasicData } from '@/features/Mantenimiento/actions/equipment-basic';
import { MaintenanceHeader } from '@/features/Mantenimiento/shared/components/maintenance-header';
import { supabaseServer } from '@/lib/supabase/server';
import { TypeOfRepair } from '@/shared/types/legacy';
import { redirect } from 'next/navigation';

export default async function RequestMaintenancePage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const resolvedParams = await params;
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    redirect('/maintenance');
  }

  // Obtener company_id del equipo
  const { data: equipmentData } = await supabase
    .from('vehicles')
    .select('company_id')
    .eq('id', resolvedParams.id)
    .single();

  if (!equipmentData?.company_id) {
    redirect('/maintenance?error=equipment_not_found');
  }

  // Obtener datos necesarios
  const types_of_repairs = await fetchAllTypesOfRepairs();
  const equipments = await fetchAllEquipmentBasicData();
  const { groups: maintenanceGroups } = await fetchMaintenanceGroupsAction();

  // Filtrar equipos por company_id
  const filteredEquipments = equipments?.filter((e) => e.company_id === equipmentData.company_id) || [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MaintenanceHeader
        title="Crear Pedido de Mantenimiento"
        showBack
        backHref={`/maintenance/equipment/${resolvedParams.id}`}
      />
      <main className="flex-1 p-4 pb-24">
        <NuevoPedidoForm
          equipment={filteredEquipments}
          types_of_repairs={types_of_repairs as TypeOfRepair}
          maintenance_groups={maintenanceGroups || []}
          default_equipment_id={resolvedParams.id}
        />
      </main>
    </div>
  );
}
