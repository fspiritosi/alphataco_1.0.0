import { fetchEquipmentBasicDataForEquipment } from '@/features/Mantenimiento/actions/equipment-basic';
import { NuevoPedidoChecklistForm } from '@/features/Mantenimiento/NuevoPedido/components/NuevoPedidoChecklistForm';
import { MaintenanceHeader } from '@/features/Mantenimiento/shared/components/maintenance-header';
import { supabaseServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function MaintenanceEquipmentRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const supabase = await supabaseServer();

  // 1. Auth — same pattern as checklist page
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/maintenance');
  }

  const employeeId =
    ((user.app_metadata as Record<string, unknown>)?.employee_id as string | undefined) ??
    ((user.user_metadata as Record<string, unknown>)?.employee_id as string | undefined);

  // 2. Get equipment company_id
  const { data: equipmentData } = await supabase
    .from('vehicles')
    .select('company_id')
    .eq('id', resolvedParams.id)
    .single();

  if (!equipmentData?.company_id) {
    redirect('/maintenance?error=equipment_not_found');
  }

  // 3. Parallel fetches: employee data + equipment list
  //    La lista de equipos se pide por el equipo de la ruta: acá no hay empresa activa
  //    (sesión anónima del QR), así que la empresa la resuelve la action desde el vehículo.
  const [employeeData, equipment] = await Promise.all([
    employeeId
      ? supabase
          .from('employees')
          .select('id, firstname, lastname, cuil, file')
          .eq('id', employeeId)
          .eq('company_id', equipmentData.company_id)
          .single()
          .then((res) => res.data)
      : Promise.resolve(null),
    fetchEquipmentBasicDataForEquipment(resolvedParams.id),
  ]);

  // 4. Build driver display name (name only — legajo shown separately in UI)
  const driverName = employeeData ? `${employeeData.lastname} ${employeeData.firstname}`.trim() : undefined;
  const driverFileNumber = employeeData?.file ?? undefined;

  return (
    <div className="flex min-h-screen flex-col">
      <MaintenanceHeader
        employeeName={employeeData ? `${employeeData.firstname} ${employeeData.lastname}` : undefined}
        employeeCuil={employeeData?.cuil ?? undefined}
        showBack={true}
        backHref={`/maintenance/equipment/${resolvedParams.id}`}
      />
      <main className="flex-1 p-4">
        <NuevoPedidoChecklistForm
          equipment={equipment}
          default_equipment_id={resolvedParams.id}
          driverEmployeeId={employeeData?.id}
          driverName={driverName}
          driverFileNumber={driverFileNumber}
          skipSupervisorQuestion={true}
          successRedirectUrl={`/maintenance/equipment/${resolvedParams.id}`}
        />
      </main>
    </div>
  );
}
