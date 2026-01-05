import { fetchAllEquipmentBasicData } from '@/app/server/GET/actions';
import { fetchAllTypesOfRepairs } from '@/components/Tipos_de_reparaciones/actions/actions';
import { fetchMaintenanceGroupsAction } from '@/components/Tipos_de_reparaciones/actions/maintenanceGroupActions';
import { MaintenanceHeader } from '@/components/maintenance/maintenance-header';
import { supabaseServer } from '@/lib/supabase/server';
import { TypeOfRepair } from '@/types/types';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import RepairEntryWithRouter from './repair-entry-with-router';

export default async function RequestMaintenancePage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const resolvedParams = await params;
  const supabase = await supabaseServer();
  const cookiesStore = await cookies();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const employeeFromCookie = cookiesStore.get('empleado_id')?.value;
  const employeeFromMetadata =
    ((user?.app_metadata as any)?.employee_id as string | undefined) ??
    ((user?.user_metadata as any)?.employee_id as string | undefined);
  const employee = employeeFromCookie ?? employeeFromMetadata;

  if (!employee && !user?.id) {
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

  // Obtener el vehículo actual para mostrar en mobile
  const currentVehicle = filteredEquipments.find((e) => e.id === resolvedParams.id);

  // Obtener preferencias guardadas
  const savedVisibility = cookiesStore.get('repair-entry-table')?.value;
  const savedFilters = cookiesStore.get('repair-entry-table-filters')?.value;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MaintenanceHeader
        title="Solicitar Mantenimiento"
        showBack
        backHref={`/maintenance/equipment/${resolvedParams.id}`}
      />
      <main className="flex-1 p-4 pb-24">
        <RepairEntryWithRouter
          equipmentId={resolvedParams.id}
          user_id={user?.id}
          equipment={filteredEquipments}
          tipo_de_mantenimiento={types_of_repairs as TypeOfRepair}
          maintenance_groups={maintenanceGroups || []}
          default_equipment_id={resolvedParams.id}
          employee_id={employee}
          savedVisibility={savedVisibility ? JSON.parse(savedVisibility) : {}}
          savedFilters={savedFilters ? JSON.parse(savedFilters) : []}
          vehicle={currentVehicle}
        />
      </main>
    </div>
  );
}
