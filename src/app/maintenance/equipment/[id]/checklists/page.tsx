import { fetchAllEquipment } from '@/app/server/GET/actions';
import ChecklistsListClient from '@/features/Mantenimiento/Checklists/components/checklists-list-client';
import { fetchMaintenanceChecklists } from '@/features/Mantenimiento/actions/maintenance-actions';
import { supabaseServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function ChecklistsListPage({
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

  const employee =
    ((user?.app_metadata as unknown as Record<string, unknown>)?.employee_id as string | undefined) ??
    ((user?.user_metadata as unknown as Record<string, unknown>)?.employee_id as string | undefined);

  if (!employee && !user?.id) {
    redirect('/maintenance');
  }

  // Obtener company_id del equipo y tipo/subtipo
  const { data: equipmentData } = await supabase
    .from('vehicles')
    .select('company_id, type:type(id, name), subType:subType(id, name)')
    .eq('id', resolvedParams.id)
    .single();

  if (!equipmentData?.company_id) {
    redirect('/maintenance?error=equipment_not_found');
  }

  // Obtener role si es usuario
  const URL = process.env.NEXT_PUBLIC_BASE_URL;
  let role: string | undefined;
  if (user?.id) {
    const { shared_user } = await fetch(
      `${URL}/api/shared_company_role?company_id=${equipmentData.company_id}&profile_id=${user.id}`
    )
      .then((e) => e.json())
      .catch(() => ({ shared_user: null }));
    role = shared_user?.[0]?.role;
  }

  // Obtener employee_id y CUIL del empleado desde la sesión
  const employeeIdFromMetadata =
    ((user?.app_metadata as unknown as Record<string, unknown>)?.employee_id as string | undefined) ??
    ((user?.user_metadata as unknown as Record<string, unknown>)?.employee_id as string | undefined);

  const cuilFromMetadata =
    ((user?.user_metadata as unknown as Record<string, unknown>)?.cuil as string | undefined) ??
    ((user?.app_metadata as unknown as Record<string, unknown>)?.cuil as string | undefined);

  // Obtener checklists usando función específica para mantenimiento (usa company_id del empleado)
  // Pasar tipo y subtipo del equipo para filtrar
  const equipmentTypeId = (equipmentData?.type as { id?: string } | null)?.id;
  const equipmentSubTypeId = (equipmentData?.subType as { id?: string } | null)?.id;

  const checklistsRaw =
    employeeIdFromMetadata || cuilFromMetadata
      ? await fetchMaintenanceChecklists(employeeIdFromMetadata, cuilFromMetadata, equipmentTypeId, equipmentSubTypeId)
      : [];

  // Mapear checklists al formato esperado
  const checklists = checklistsRaw.map((checklist) => ({
    id: checklist.id,
    name: checklist.name,
    form: checklist.form as {
      description?: string;
      frequency?: string;
      title?: string;
      vehicle_type?: string[];
    } | null,
    created_at: checklist.created_at,
  }));

  // Obtener equipos para el combobox
  const equipmentsForComboBox = (await fetchAllEquipment(equipmentData.company_id)).map((equipment) => ({
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

  // Filtrar checklists por tipo de vehículo
  const filteredChecklists = checklists
    .filter((checklist) => {
      if (!checklist.form || typeof checklist.form !== 'object') return false;
      const form = checklist.form as { vehicle_type?: string[] };
      return form.vehicle_type?.includes(currentEquipment?.vehicle_type || '') || form.vehicle_type?.includes('all');
    })
    .filter((checklist) => {
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
    });

  return <ChecklistsListClient equipmentId={resolvedParams.id} checklists={filteredChecklists as any} />;
}
