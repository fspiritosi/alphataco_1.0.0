'use client';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { usePermissions } from '@/features/Permissions';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { FetchBrandOfVehicles } from '../actions/actions';
import EquipmentBrandsForm from './equipmentBrandsForm';
import EquipmentBrandsTable from './equipmentBrandsTable';

type VehicleBrand = NonNullable<Awaited<ReturnType<typeof FetchBrandOfVehicles>>>[number];

function EquipmentBrands({ vehicleBrands }: { vehicleBrands: VehicleBrand[] }) {
  const [editingType, setEditingType] = useState<VehicleBrand | null>(null);
  const queryClient = useQueryClient();

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['equipment-brands-table-brand'] });
  };

  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('empresa', 'marcas', 'create');
  const canUpdate = hasPermission('empresa', 'marcas', 'update');
  const showForm = canCreate || canUpdate;

  return (
    <div className="w-full">
      {showForm ? (
        <ResizablePanelGroup direction="horizontal" className="min-h-[400px]">
          <ResizablePanel defaultSize={30}>
            <div className="overflow-auto h-full pr-2">
              <EquipmentBrandsForm
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
              <EquipmentBrandsTable
                equipmentBrands={vehicleBrands as any[]}
                onEdit={setEditingType as any}
                canEdit={canUpdate}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <EquipmentBrandsTable
          equipmentBrands={vehicleBrands as any[]}
          onEdit={setEditingType as any}
          canEdit={canUpdate}
        />
      )}
    </div>
  );
}

export default EquipmentBrands;
