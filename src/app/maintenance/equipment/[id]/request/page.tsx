import { MaintenanceRequestServer } from '@/features/Mantenimiento/NuevoPedido/MaintenanceRequestServer';

export default async function MaintenanceEquipmentRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <MaintenanceRequestServer equipmentId={id} />;
}
