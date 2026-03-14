'use client';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { usePermissions } from '@/features/Permissions';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import EquipmentModelForm from './equipmentModelForm';
import EquipmentModelTable from './equipmentModelTable';

function EquipmentsModel({ vehicleBrands, vehicleModels }: { vehicleBrands: any[]; vehicleModels: any[] }) {
  // Estado para el tipo de equipo que se está editando
  const [editingType, setEditingType] = useState<any | null>(null);
  const queryClient = new QueryClient();

  const handleSuccess = () => {
    // Invalidate the query to refetch the data
    queryClient.invalidateQueries({ queryKey: ['equipment-models-table'] });
    setEditingType(null);
  };

  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('empresa', 'modelos', 'create');
  const canUpdate = hasPermission('empresa', 'modelos', 'update');
  const showForm = canCreate || canUpdate;

  return (
    <div>
      {showForm ? (
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={30}>
            <EquipmentModelForm
              brands={vehicleBrands}
              initialData={editingType}
              onReset={() => setEditingType(null)}
              isEditing={!!editingType}
              onSuccess={handleSuccess}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={70} className="ml-4">
            <QueryClientProvider client={queryClient}>
              <EquipmentModelTable
                brands={vehicleBrands}
                onEdit={setEditingType}
                models={vehicleModels}
                canEdit={canUpdate}
              />
            </QueryClientProvider>
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <QueryClientProvider client={queryClient}>
          <EquipmentModelTable
            brands={vehicleBrands}
            onEdit={setEditingType}
            models={vehicleModels}
            canEdit={canUpdate}
          />
        </QueryClientProvider>
      )}
    </div>
  );
}

export default EquipmentsModel;
