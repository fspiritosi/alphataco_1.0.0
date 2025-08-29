'use client';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
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

  return (
    <div>
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={35}>
          <EquipmentModelForm
            brands={vehicleBrands}
            initialData={editingType}
            onReset={() => setEditingType(null)}
            isEditing={!!editingType}
            onSuccess={handleSuccess}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={65} className="ml-4">
          <QueryClientProvider client={queryClient}>
            <EquipmentModelTable brands={vehicleBrands} onEdit={setEditingType} models={vehicleModels} />
          </QueryClientProvider>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

export default EquipmentsModel;
