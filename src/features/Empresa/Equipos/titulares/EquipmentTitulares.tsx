'use client';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { useState } from 'react';
import EquipmentOwnerForm from './EquipmentOwnerForm';
import EquipmentOwnerTable from './EquipmentOwnerTable';
import { FetchEquipmentOwnersType } from './actions/actions';

interface TitularesProps {
  equipmentOwners: FetchEquipmentOwnersType;
}
function EquipmentTitulares({ equipmentOwners }: TitularesProps) {
  // Estado para el titular que se está editando
  const [editingOwner, setEditingOwner] = useState<FetchEquipmentOwnersType[0] | null>(null);

  return (
    <div>
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={35}>
          <EquipmentOwnerForm
            initialData={editingOwner}
            onReset={() => setEditingOwner(null)}
            isEditing={!!editingOwner}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={65} className="ml-4">
          <EquipmentOwnerTable equipmentOwners={equipmentOwners} onEdit={setEditingOwner} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

export default EquipmentTitulares;
