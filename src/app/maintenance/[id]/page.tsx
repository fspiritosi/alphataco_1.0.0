import { fetchMaintenanceChecklists } from '@/app/maintenance/actions';
import { fetchAllEquipment, fetchAllEquipmentBasicData } from '@/app/server/GET/actions';
import QrActionSelector from '@/components/QR/AcctionSelector';
import { fetchMaintenanceGroupsAction } from '@/components/Tipos_de_reparaciones/actions/maintenanceGroupActions';
import { supabaseServer } from '@/lib/supabase/server';
import { TypeOfRepair } from '@/types/types';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function Home({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  // En Next.js 15+, params es una Promise, necesitamos hacer await
  const resolvedParams = await params;
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const URL = process.env.NEXT_PUBLIC_BASE_URL;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const employeeFromCookie = cookiesStore.get('empleado_id')?.value;
  const employeeFromMetadata =
    ((user?.app_metadata as any)?.employee_id as string | undefined) ??
    ((user?.user_metadata as any)?.employee_id as string | undefined);
  const employee = employeeFromCookie ?? employeeFromMetadata;

  const empleadoNameFromCookie = cookiesStore.get('empleado_name')?.value;
  const empleadoNameFromMetadata =
    ((user?.user_metadata as any)?.fullname as string | undefined) ??
    ((user?.user_metadata as any)?.employeeName as string | undefined);
  const empleado_name = empleadoNameFromCookie ?? empleadoNameFromMetadata;

  if (!employee && !user?.id) {
    redirect('/maintenance');
  }

  let role: any;
  // const { equipments } = await fetch(`${URL}/api/equipment/${resolvedParams.id}`).then((e) => e.json());
  const equipments = await fetchAllEquipmentBasicData();

  if (!equipments || equipments.length === 0 || !equipments[0]?.company_id) {
    redirect('/maintenance?error=no_equipment');
  }

  if (user?.id) {
    const { shared_user } = await fetch(
      `${URL}/api/shared_company_role?company_id=${equipments[0].company_id}&profile_id=${user?.id}`
    ).then((e) => e.json());

    role = shared_user?.[0]?.role;
  }
  const { types_of_repairs } = await fetch(`${URL}/api/repairs?actual=${equipments[0].company_id}`).then((res) =>
    res.json()
  );

  const { data, error } = await supabase
    .from('repair_solicitudes')
    .select(
      '*,user_id(*),employee_id(*),equipment_id(*,type(*),brand(*),model(*)),reparation_type(*),repairlogs(*,modified_by_employee(*),modified_by_user(*))'
    )
    .eq('equipment_id', resolvedParams.id)
    .in('state', ['Pendiente', 'Esperando repuestos', 'En reparacion']);

  // Obtener información del equipo actual (tipo y subtipo)
  const { data: currentEquipmentData } = await supabase
    .from('vehicles')
    .select('type:type(id, name), subType:subType(id, name)')
    .eq('id', resolvedParams.id)
    .single();

  // Obtener employee_id y CUIL del empleado desde la sesión
  const employeeIdFromMetadata =
    ((user?.app_metadata as any)?.employee_id as string | undefined) ??
    ((user?.user_metadata as any)?.employee_id as string | undefined);

  const cuilFromMetadata =
    ((user?.user_metadata as any)?.cuil as string | undefined) ??
    ((user?.app_metadata as any)?.cuil as string | undefined);

  // Obtener checklists usando función específica para mantenimiento (usa company_id del empleado)
  // Pasar tipo y subtipo del equipo para filtrar
  const equipmentTypeId = (currentEquipmentData?.type as any)?.id;
  const equipmentSubTypeId = (currentEquipmentData?.subType as any)?.id;

  const checklistsRaw =
    employeeIdFromMetadata || cuilFromMetadata
      ? await fetchMaintenanceChecklists(employeeIdFromMetadata, cuilFromMetadata, equipmentTypeId, equipmentSubTypeId)
      : [];

  // Mapear checklists al formato esperado (CheckListWithAnswer)
  const checklists: CheckListWithAnswer[] = checklistsRaw.map((checklist) => ({
    id: checklist.id,
    name: checklist.name,
    form: checklist.form as {
      description?: string;
      frequency?: string;
      title?: string;
      vehicle_type?: string[];
    } | null,
    created_at: checklist.created_at || new Date().toISOString(),
    company_id: equipments[0]?.company_id || '',
    form_answers: [], // Los checklists nuevos no tienen respuestas aún
  }));

  const equipmentsForComboBox = (await fetchAllEquipment(equipments[0]?.company_id || '')).map((equipment) => ({
    label: equipment.domain
      ? `${equipment.domain} - ${equipment.intern_number}`
      : `${equipment.serie} - ${equipment.intern_number}`,
    value: equipment.id,
    domain: equipment.domain,
    serie: equipment.serie,
    kilometer: equipment.kilometer ?? '0',
    model: equipment.model?.name || '',
    brand: equipment.brand?.name || '',
    intern_number: equipment.intern_number || '',
    vehicle_type: equipment.type?.name || '',
  }));
  const currentEquipment = equipmentsForComboBox.find((equipment) => equipment.value === resolvedParams.id);
  const savedVisibility = cookiesStore.get('repair-entry-table')?.value;
  const savedFilters = cookiesStore.get('repair-entry-table-filters')?.value;

  const { groups: maintenanceGroups } = await fetchMaintenanceGroupsAction();

  return (
    <QrActionSelector
      user={user}
      maintenance_groups={maintenanceGroups}
      employee_id={employee}
      equipment={equipments}
      tipo_de_mantenimiento={types_of_repairs as TypeOfRepair}
      default_equipment_id={resolvedParams.id}
      savedVisibility={savedVisibility ? JSON.parse(savedVisibility) : {}}
      savedFilters={savedFilters ? JSON.parse(savedFilters) : []}
      role={role}
      pendingRequests={data as any}
      checkList={
        checklists.filter((checklist) => {
          // Excluir algunos checklists según rol
          if (
            (role === 'Invitado' || employee) &&
            checklist.form &&
            typeof checklist.form === 'object' &&
            'title' in checklist.form &&
            (checklist.form as any).title === 'Transporte SP-ANAY - CHK - HYS - 03'
          ) {
            return false;
          }
          return true;
        }) || []
      }
      equipmentsForComboBox={equipmentsForComboBox}
      empleado_name={empleado_name}
    />
  );
}
