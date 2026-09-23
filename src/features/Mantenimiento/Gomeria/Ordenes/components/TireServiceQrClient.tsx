'use client';

import { ServiceOrderWizard } from '@/features/Mantenimiento/Gomeria/Ordenes/components/ServiceOrderWizard';
import { useRouter } from 'next/navigation';

interface TireServiceQrClientProps {
  vehicleId: string;
}

/**
 * Operación de gomería desde el QR del equipo: el vehículo ya viene fijado por la ruta,
 * así que el asistente salta el paso de búsqueda.
 */
export default function TireServiceQrClient({ vehicleId }: TireServiceQrClientProps) {
  const router = useRouter();

  const handleClose = () => {
    router.push(`/maintenance/equipment/${vehicleId}`);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <ServiceOrderWizard vehicleId={vehicleId} mode="qr" onClose={handleClose} />
    </div>
  );
}
