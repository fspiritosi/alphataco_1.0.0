import { fetchAllEquipment, fetchChecklistTemplateById, getCurrentProfile } from '@/app/server/GET/actions';
import { NormalizedChecklistForm } from '@/components/CheckList/NormalizedChecklistForm';
import { MaintenanceHeader } from '@/components/maintenance/maintenance-header';
import { supabaseServer } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
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

  // Obtener company_id y kilometraje del equipo
  const { data: equipmentData } = await supabase
    .from('vehicles')
    .select('company_id, kilometer')
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
      ? `${equipment.domain} - ${equipment.intern_number}`
      : `${equipment.serie} - ${equipment.intern_number}`,
    value: equipment.id,
    domain: equipment.domain,
    serie: equipment.serie,
    kilometer: equipment.kilometer ?? '0',
    model: equipment.model?.name || '',
    brand: equipment.brand?.name || '',
    intern_number: equipment.intern_number || '',
    sub_type_id: (equipment as any).subType?.id || (equipment as any).sub_type_id || null,
  }));

  // Obtener el equipo seleccionado para el kilometraje
  const selectedEquipment = equipments.find((eq) => eq.id === resolvedParams.id);
  const defaultKilometer = selectedEquipment?.kilometer ?? equipmentData?.kilometer ?? '0';

  // Obtener perfil del usuario actual
  const currentUser = user?.id ? (await getCurrentProfile())?.find((p) => p.credential_id === user.id) || null : null;

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
          currentUser={currentUser}
          defaultEquipmentId={resolvedParams.id}
          defaultEmployeeId={employee || undefined}
          defaultEmployeeName={employeeFullName || undefined}
          defaultKilometer={defaultKilometer}
        />
      </main>
    </div>
  );
}
