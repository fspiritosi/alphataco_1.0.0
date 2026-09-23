import { fetchEquipmentBasicDataForEquipment } from '@/features/Mantenimiento/actions/equipment-basic';
import { NuevoPedidoChecklistForm } from '@/features/Mantenimiento/NuevoPedido/components/NuevoPedidoChecklistForm';
import { getMaintenanceEmployeeForEquipment } from '@/features/Mantenimiento/shared/actions/employee-session.server';
import { getEquipmentCompanyIdOrNull } from '@/features/Mantenimiento/shared/actions/equipment-company.server';
import { MaintenanceHeader } from '@/features/Mantenimiento/shared/components/maintenance-header';
import { getSessionUserId } from '@/shared/lib/session';
import { redirect } from 'next/navigation';

/**
 * Nuevo pedido de mantenimiento desde el QR del equipo.
 *
 * El equipo de la ruta define la empresa: tanto la lista de equipos del selector como el
 * legajo del operario se piden por `equipmentId`, porque en este flujo no hay empresa
 * activa en la sesión y la cookie puede apuntar a otra.
 */
export async function MaintenanceRequestServer({ equipmentId }: { equipmentId: string }) {
  const userId = await getSessionUserId();

  if (!userId) {
    redirect('/maintenance');
  }

  const companyId = await getEquipmentCompanyIdOrNull(equipmentId);
  if (!companyId) {
    redirect('/maintenance?error=equipment_not_found');
  }

  const [employee, equipment] = await Promise.all([
    getMaintenanceEmployeeForEquipment(equipmentId),
    fetchEquipmentBasicDataForEquipment(equipmentId),
  ]);

  // Nombre del chofer sin el legajo: la UI lo muestra en un campo aparte.
  const driverName = employee ? `${employee.lastname} ${employee.firstname}`.trim() : undefined;

  return (
    <div className="flex min-h-screen flex-col">
      <MaintenanceHeader
        employeeName={employee ? `${employee.firstname} ${employee.lastname}` : undefined}
        employeeCuil={employee?.cuil ?? undefined}
        showBack={true}
        backHref={`/maintenance/equipment/${equipmentId}`}
      />
      <main className="flex-1 p-4">
        <NuevoPedidoChecklistForm
          equipment={equipment}
          default_equipment_id={equipmentId}
          driverEmployeeId={employee?.id}
          driverName={driverName}
          driverFileNumber={employee?.file ?? undefined}
          skipSupervisorQuestion={true}
          successRedirectUrl={`/maintenance/equipment/${equipmentId}`}
        />
      </main>
    </div>
  );
}
