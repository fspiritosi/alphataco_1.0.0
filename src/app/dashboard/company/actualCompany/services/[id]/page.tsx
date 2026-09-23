import { ServiceItemsSection } from '@/features/Empresa/Clientes/components/Services/ServiceItemsSection';

export default async function ServiceItemsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ServiceItemsSection customerServiceId={id} />;
}
