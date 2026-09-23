import { EquipmentDashboardServer } from '@/features/Mantenimiento/EquipmentDashboard/EquipmentDashboardServer';

export default async function EquipmentDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <EquipmentDashboardServer equipmentId={id} />;
}
