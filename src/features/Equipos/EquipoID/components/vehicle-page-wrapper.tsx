'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { fetchAllContractorForVehicles } from '@/app/dashboard/employee/action/actions/actions';
import { VehicleById } from '@/app/dashboard/equipment/action/page';
import { Card } from '@/components/ui/card';
import { fetchAllCostCenters } from '@/features/Empresa/General/actions/actions';
import { toast } from 'sonner';
import { createVehicle, updateVehicle } from '../lib/actions/vehicle-actions';

interface VehiclePageWrapperProps {
  vehicleId?: string;
  vehicle: VehicleById;
  action: 'new' | 'edit' | 'view';
  contractorsPromise: ReturnType<typeof fetchAllContractorForVehicles>;
  costCentersPromise: ReturnType<typeof fetchAllCostCenters>;
}

export function VehiclePageWrapper({
  vehicleId,
  vehicle,
  action,
  contractorsPromise,
  costCentersPromise,
}: VehiclePageWrapperProps) {
  const router = useRouter();
  const [formErrors, setFormErrors] = useState({
    basicData: false,
    technicalData: false,
    assignmentData: false,
  });

  const handleSave = async (data: any) => {
    try {
      if (action === 'new') {
        const newVehicle = await createVehicle(data);
        toast.success('Equipo creado correctamente');
        router.push(`/dashboard/equipment/action?action=view&id=${newVehicle.id}`);
      } else {
        await updateVehicle(vehicleId!, data);
        toast.success('Equipo actualizado correctamente');
        router.push(`/dashboard/equipment/action?action=view&id=${vehicleId}`);
      }
    } catch (error) {
      console.error('Error saving vehicle:', error);
      toast.error('Error al guardar el equipo');
      throw error;
    }
  };

  return (
    <Card className="space-y-6 p-2">
      {/* <VehicleHeader vehicle={vehicle} mode={action} onSave={handleSave} /> */}
      {/* <VehicleTabs
                vehicleId={vehicleId}
                contractorsPromise={contractorsPromise}
                costCentersPromise={costCentersPromise}
                mode={action}
                vehicle={vehicle}
                onSave={handleSave}
                onErrorsChange={setFormErrors}
                documentsComponent={
                    <div>Documentos aqui</div>
                }
                repairsComponent={<div>repairsComponent aqui</div>}
                formErrors={formErrors}
            /> */}
    </Card>
  );
}
