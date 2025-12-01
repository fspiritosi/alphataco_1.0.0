'use client';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { usePermissions } from '@/features/Permissions';
import { useState } from 'react';
// import { EquipmentType } from '../actions/actions';
import { Database } from '../../../../../database.types';
import EquipmentSubTypesForm from './equipmentSubTypesForm';
import EquipmentSubTypesTable from './equipmentSubTypesTable';

type VehicleType = Database['public']['Tables']['type']['Row'];
type VehicleSubType = Database['public']['Tables']['sub_type']['Row'];

interface EquipmentSubTypesProps {
  vehicleTypes: VehicleType[];
  vehicleSubTypes: VehicleSubType[];
}
function EquipmentSubTypes({ vehicleTypes, vehicleSubTypes }: EquipmentSubTypesProps) {
  // Estado para el tipo de equipo que se está editando
  const [editingType, setEditingType] = useState<VehicleSubType | null>(null);

  const handleSuccess = () => {
    // Aquí podrías mostrar un mensaje de éxito o actualizar la lista
  };

  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('empresa', 'subtipos', 'create');
  const canUpdate = hasPermission('empresa', 'subtipos', 'update');
  const showForm = canCreate || canUpdate;

  return (
    <div>
      {showForm ? (
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={35}>
            <EquipmentSubTypesForm
              initialData={editingType}
              onReset={() => setEditingType(null)}
              isEditing={!!editingType}
              onSuccess={handleSuccess}
              types={vehicleTypes}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={65} className="ml-4">
            <EquipmentSubTypesTable
              vehicleTypes={vehicleTypes}
              vehicleSubTypes={vehicleSubTypes}
              onEdit={setEditingType}
              canEdit={canUpdate}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <EquipmentSubTypesTable
          vehicleTypes={vehicleTypes}
          vehicleSubTypes={vehicleSubTypes}
          onEdit={setEditingType}
          canEdit={canUpdate}
        />
      )}
    </div>
  );
}

export default EquipmentSubTypes;
