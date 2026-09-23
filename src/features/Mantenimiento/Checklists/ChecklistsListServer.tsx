import { fetchChecklistTemplatesForEquipment } from '@/features/Checklists/actions/checklist-queries';
import ChecklistsListClient from '@/features/Mantenimiento/Checklists/components/checklists-list-client';
import { getSessionEmployeeIdClaim, getSessionUserId } from '@/shared/lib/session'; // P4: auth
import { redirect } from 'next/navigation';

/**
 * Plantillas de checklist aplicables al equipo escaneado por el QR.
 *
 * La empresa, el tipo y el subtipo salen del equipo de la ruta, nunca de la sesión: este
 * flujo corre sin empresa activa.
 */
export async function ChecklistsListServer({ equipmentId }: { equipmentId: string }) {
  const [userId, employeeId] = await Promise.all([getSessionUserId(), getSessionEmployeeIdClaim()]); // P4: auth

  if (!employeeId && !userId) {
    redirect('/maintenance');
  }

  const result = await fetchChecklistTemplatesForEquipment(equipmentId);

  if (result.status === 'not_found') {
    redirect('/maintenance?error=equipment_not_found');
  }
  // Un fallo de consulta no se disfraza de "este equipo no tiene checklists".
  if (result.status === 'error') {
    redirect(`/maintenance/equipment/${equipmentId}?error=checklists_unavailable`);
  }

  return (
    <ChecklistsListClient
      equipmentId={equipmentId}
      checklists={result.templates.map((checklist) => ({
        id: checklist.id,
        name: checklist.name,
        form: { description: checklist.description ?? checklist.name, title: checklist.name },
        created_at: checklist.created_at ? checklist.created_at.toISOString() : new Date().toISOString(),
      }))}
    />
  );
}
