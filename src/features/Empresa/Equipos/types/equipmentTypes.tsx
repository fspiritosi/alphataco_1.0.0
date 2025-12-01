'use client';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { usePermissions } from '@/features/Permissions';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
// import { EquipmentType } from '../actions/actions';
import React from 'react';
import { FetchTypeOfVehicles } from '../actions/actions';
import EquipmentTypesForm from './equipmentTypesForm';
import EquipmentTypesTable from './equipmentTypesTable';
function EquipmentTypes({ vehicleTypes }: { vehicleTypes: Awaited<ReturnType<typeof FetchTypeOfVehicles>> }) {
  // Estado para el tipo de equipo que se está editando
  const [editingType, setEditingType] = useState<any | null>(null);
  const queryClient = React.useMemo(() => new QueryClient(), []);
  const handleSuccess = () => {
    // Aquí podrías mostrar un mensaje de éxito o actualizar la lista

    queryClient.invalidateQueries({ queryKey: ['equipment-types-table-type'] });
  };

  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('empresa', 'tipos', 'create');
  const canUpdate = hasPermission('empresa', 'tipos', 'update');
  const showForm = canCreate || canUpdate;

  return (
    <div>
      {showForm ? (
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={35}>
            <EquipmentTypesForm
              initialData={editingType}
              onReset={() => setEditingType(null)}
              isEditing={!!editingType}
              onSuccess={handleSuccess}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={65} className="ml-4">
            <QueryClientProvider client={queryClient}>
              <EquipmentTypesTable vehicleTypes={vehicleTypes} onEdit={setEditingType} canEdit={canUpdate} />
            </QueryClientProvider>
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <QueryClientProvider client={queryClient}>
          <EquipmentTypesTable vehicleTypes={vehicleTypes} onEdit={setEditingType} canEdit={canUpdate} />
        </QueryClientProvider>
      )}
    </div>
  );
}

export default EquipmentTypes;
