import { fetchTireServiceContextForEquipment } from '@/features/Mantenimiento/Gomeria/Ordenes/actions/tire-service-qr.server';
import TireServiceQrClient from '@/features/Mantenimiento/Gomeria/Ordenes/components/TireServiceQrClient';
import { MaintenanceHeader } from '@/features/Mantenimiento/shared/components/maintenance-header';
import { getSessionUserId } from '@/shared/lib/session'; // P4: auth
import { redirect } from 'next/navigation';

/**
 * Operación de gomería del equipo escaneado por el QR.
 *
 * La empresa y la plantilla de cubiertas salen del equipo de la ruta: en este flujo no hay
 * empresa activa en la sesión. Sin plantilla efectiva (ni override ni subtipo) no hay
 * diagrama que mostrar, así que se vuelve al dashboard del equipo.
 */
export async function TireServiceQrServer({ equipmentId }: { equipmentId: string }) {
  const userId = await getSessionUserId(); // P4: auth

  if (!userId) {
    redirect('/maintenance');
  }

  const context = await fetchTireServiceContextForEquipment(equipmentId);

  if (!context) {
    redirect('/maintenance?error=equipment_not_found');
  }

  if (!context.tireTemplateId) {
    redirect(`/maintenance/equipment/${equipmentId}`);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MaintenanceHeader
        title="Operación de Gomería"
        showBack
        backHref={`/maintenance/equipment/${equipmentId}`}
      />
      <main className="flex-1 flex flex-col p-4 pb-24">
        <TireServiceQrClient vehicleId={equipmentId} companyId={context.companyId} />
      </main>
    </div>
  );
}
