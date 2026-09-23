import { getSessionRoleForEquipment } from '@/features/Mantenimiento/EquipmentDashboard/actions/equipment-access.server';
import { fetchEquipmentForDashboard } from '@/features/Mantenimiento/EquipmentDashboard/actions/equipment-dashboard.server';
import EquipmentDashboardClient from '@/features/Mantenimiento/EquipmentDashboard/components/equipment-dashboard-client';
import {
  getSessionDisplayName,
  getSessionEmployeeIdClaim,
  getSessionUserId,
  isSessionAnonymous,
} from '@/shared/lib/session'; // P4: auth
import { redirect } from 'next/navigation';

/**
 * Dashboard del equipo escaneado por el QR.
 *
 * Todo el perímetro sale del `equipmentId` de la ruta: acá no hay empresa activa (la sesión
 * es anónima o de un invitado) y ninguna lectura puede depender de `getActiveCompanyId()`.
 */
export async function EquipmentDashboardServer({ equipmentId }: { equipmentId: string }) {
  const [userId, employeeId] = await Promise.all([getSessionUserId(), getSessionEmployeeIdClaim()]); // P4: auth

  if (!employeeId && !userId) {
    redirect('/maintenance');
  }

  const equipment = await fetchEquipmentForDashboard(equipmentId);

  if (!equipment) {
    redirect('/maintenance?error=equipment_not_found');
  }

  // El rol se resuelve contra la empresa DEL EQUIPO, no contra la de la sesión.
  const [role, empleadoName, isAnonymous] = await Promise.all([
    userId ? getSessionRoleForEquipment(equipmentId) : Promise.resolve(null),
    getSessionDisplayName(), // P4: auth
    isSessionAnonymous(), // P4: auth
  ]);

  return (
    <EquipmentDashboardClient
      equipment={equipment}
      equipmentId={equipmentId}
      isGuest={role === 'Invitado'}
      isAnonymous={isAnonymous}
      empleadoName={empleadoName ?? undefined}
    />
  );
}
