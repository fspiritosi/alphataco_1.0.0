'use client';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useState } from 'react';
import EquipmentBrandsForm from './equipmentBrandsForm';
import EquipmentBrandsTable from './equipmentBrandsTable';
function EquipmentBrands({ vehicleBrands }: { vehicleBrands: any[] }) {
  // Estado para el tipo de equipo que se está editando
  const [editingType, setEditingType] = useState<any | null>(null);
  const queryClient = React.useMemo(() => new QueryClient(), []);
  const handleSuccess = () => {
    // Aquí podrías mostrar un mensaje de éxito o actualizar la lista
    console.log('Operación exitosa');
    queryClient.invalidateQueries({ queryKey: ['equipment-brands-table-brand'] });
  };

  return (
    <div>
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={35}>
          <EquipmentBrandsForm
            initialData={editingType}
            onReset={() => setEditingType(null)}
            isEditing={!!editingType}
            onSuccess={handleSuccess}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={65} className="ml-4">
          <QueryClientProvider client={queryClient}>
            <EquipmentBrandsTable equipmentBrands={vehicleBrands} onEdit={setEditingType} />
          </QueryClientProvider>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

export default EquipmentBrands;
