'use client';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { usePermissions } from '@/features/Permissions';
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
    queryClient.invalidateQueries({ queryKey: ['equipment-brands-table-brand'] });
  };

  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('empresa', 'marcas', 'create');
  const canUpdate = hasPermission('empresa', 'marcas', 'update');
  const showForm = canCreate || canUpdate;

  return (
    <div>
      {showForm ? (
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={30}>
            <EquipmentBrandsForm
              initialData={editingType}
              onReset={() => setEditingType(null)}
              isEditing={!!editingType}
              onSuccess={handleSuccess}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={70} className="ml-4">
            <QueryClientProvider client={queryClient}>
              <EquipmentBrandsTable equipmentBrands={vehicleBrands} onEdit={setEditingType} canEdit={canUpdate} />
            </QueryClientProvider>
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <QueryClientProvider client={queryClient}>
          <EquipmentBrandsTable equipmentBrands={vehicleBrands} onEdit={setEditingType} canEdit={canUpdate} />
        </QueryClientProvider>
      )}
    </div>
  );
}

export default EquipmentBrands;
