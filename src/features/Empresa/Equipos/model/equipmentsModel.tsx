'use client';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { usePermissions } from '@/features/Permissions';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { FetchBrandOfVehicles, FetchModelOfVehicles } from '../actions/actions';
import EquipmentModelForm from './equipmentModelForm';
import EquipmentModelTable from './equipmentModelTable';

type VehicleBrand = NonNullable<Awaited<ReturnType<typeof FetchBrandOfVehicles>>>[number];
type VehicleModel = NonNullable<Awaited<ReturnType<typeof FetchModelOfVehicles>>>[number];

function EquipmentsModel({
  vehicleBrands,
  vehicleModels,
}: {
  vehicleBrands: VehicleBrand[];
  vehicleModels: VehicleModel[];
}) {
  const [editingType, setEditingType] = useState<VehicleModel | null>(null);
  const queryClient = useQueryClient();

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['equipment-models-table'] });
    setEditingType(null);
  };

  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('empresa', 'modelos', 'create');
  const canUpdate = hasPermission('empresa', 'modelos', 'update');
  const showForm = canCreate || canUpdate;

  return (
    <div className="w-full">
      {showForm ? (
        <ResizablePanelGroup direction="horizontal" className="min-h-[400px]">
          <ResizablePanel defaultSize={30}>
            <div className="overflow-auto h-full pr-2">
              <EquipmentModelForm
                brands={vehicleBrands}
                initialData={editingType}
                onReset={() => setEditingType(null)}
                isEditing={!!editingType}
                onSuccess={handleSuccess}
              />
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={70}>
            <div className="overflow-auto h-full pl-2">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <EquipmentModelTable
                brands={vehicleBrands as any[]}
                onEdit={setEditingType as any}
                models={vehicleModels as any[]}
                canEdit={canUpdate}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <EquipmentModelTable
          brands={vehicleBrands as any[]}
          onEdit={setEditingType as any}
          models={vehicleModels as any[]}
          canEdit={canUpdate}
        />
      )}
    </div>
  );
}

export default EquipmentsModel;
