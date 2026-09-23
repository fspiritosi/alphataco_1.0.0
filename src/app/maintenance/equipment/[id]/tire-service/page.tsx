import { TireServiceQrServer } from '@/features/Mantenimiento/Gomeria/Ordenes/TireServiceQrServer';

export default async function TireServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <TireServiceQrServer equipmentId={id} />;
}
