import { fetchAllEquipment, fetchChecklistTemplateById, getCurrentProfile } from '@/app/server/GET/actions';
import { NormalizedChecklistForm } from '@/components/CheckList/NormalizedChecklistForm';
import { MaintenanceHeader } from '@/components/maintenance/maintenance-header';
import { fetchActiveCustomersForChecklist } from '@/features/Checklist';
import { supabaseServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function ChecklistFormPage({
  params,
}: {
  params: Promise<{
    id: string;
    checklistId: string;
  }>;
}) {
  const resolvedParams = await params;
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const employee =
    ((user?.app_metadata as Record<string, unknown>)?.employee_id as string | undefined) ??
    ((user?.user_metadata as Record<string, unknown>)?.employee_id as string | undefined);

  if (!employee && !user?.id) {
    redirect('/maintenance');
  }

  // Obtener company_id, kilometraje y horómetro del equipo
  const { data: equipmentData } = await supabase
    .from('vehicles')
    .select('company_id, kilometer, engine_hours')
    .eq('id', resolvedParams.id)
    .single();

  if (!equipmentData?.company_id) {
    redirect('/maintenance?error=equipment_not_found');
  }

  // Obtener datos del empleado logueado
  let employeeData = null;
  if (employee && equipmentData.company_id) {
    // Obtener el empleado directamente usando Supabase
    const { data: empData } = await supabase
      .from('employees')
      .select('id, firstname, lastname, cuil')
      .eq('id', employee)
      .eq('company_id', equipmentData.company_id)
      .single();

    employeeData = empData;
  }

  // Obtener template del checklist
  const template = await fetchChecklistTemplateById(resolvedParams.checklistId);
  if (!template) {
    redirect(`/maintenance/equipment/${resolvedParams.id}/checklists?error=template_not_found`);
  }

  // Obtener equipos para el combobox
  const equipments = await fetchAllEquipment(equipmentData.company_id);
  const equipmentsForComboBox = equipments.map((equipment) => ({
    label: equipment.domain
      ? `${equipment.domain} - ${equipment.intern_number || '(Sin información)'}`
      : `${equipment.serie} - ${equipment.intern_number || '(Sin información)'}`,
    value: equipment.id,
    domain: equipment.domain,
    serie: equipment.serie,
    kilometer: equipment.kilometer ?? '0',
    engine_hours: equipment.engine_hours ?? '0',
    model: equipment.model?.name || '',
    brand: equipment.brand?.name || '',
    intern_number: equipment.intern_number || '',
    sub_type_id: (equipment.subType as { id?: string } | null)?.id || null,
    type_name: equipment.type?.name || 'N/A',
    sub_type_name: equipment.subType?.name || 'N/A',
  }));

  // Obtener el equipo seleccionado para el kilometraje y horómetro
  const selectedEquipment = equipments.find((eq) => eq.id === resolvedParams.id);
  const defaultKilometer = selectedEquipment?.kilometer ?? equipmentData?.kilometer ?? '0';
  const defaultHorometro = selectedEquipment?.engine_hours ?? equipmentData?.engine_hours ?? '0';

  // Obtener perfil del usuario actual y clientes activos
  const [currentUserProfiles, customers] = await Promise.all([
    user?.id ? getCurrentProfile() : Promise.resolve(null),
    fetchActiveCustomersForChecklist(),
  ]);
  const currentUser = currentUserProfiles?.find((p) => p.credential_id === user?.id) || null;

  // Obtener nombre completo del empleado
  const employeeFullName = employeeData
    ? `${employeeData.firstname || ''} ${employeeData.lastname || ''}`.trim()
    : null;
  const employeeCuil = employeeData?.cuil || null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MaintenanceHeader
        title={template.name}
        showBack
        backHref={`/maintenance/equipment/${resolvedParams.id}/checklists`}
        employeeName={employeeFullName}
        employeeCuil={employeeCuil}
      />
      <main className="flex-1 p-4 pb-24">
        <NormalizedChecklistForm
          template={template}
          equipments={equipmentsForComboBox}
          customers={customers}
          currentUser={currentUser}
          defaultEquipmentId={resolvedParams.id}
          defaultEmployeeId={employee || undefined}
          defaultEmployeeName={employeeFullName || undefined}
          defaultKilometer={defaultKilometer}
          defaultHorometro={defaultHorometro}
        />
      </main>
    </div>
  );
}
