'use client';

import { ServiceOrderWizard } from '@/features/Mantenimiento/Gomeria/Ordenes/components/ServiceOrderWizard';
import { useRouter } from 'next/navigation';

interface TireServiceClientProps {
  vehicleId: string;
  companyId: string;
}

export default function TireServiceClient({ vehicleId, companyId }: TireServiceClientProps) {
  const router = useRouter();

  const handleClose = () => {
    router.push(`/maintenance/equipment/${vehicleId}`);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <ServiceOrderWizard vehicleId={vehicleId} companyId={companyId} mode="qr" onClose={handleClose} />
    </div>
  );
}
