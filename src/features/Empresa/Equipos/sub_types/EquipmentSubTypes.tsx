'use client';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { usePermissions } from '@/features/Permissions';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { useCallback, useEffect, useState } from 'react';
import { Database } from '../../../../../database.types';
import EquipmentSubTypesForm from './equipmentSubTypesForm';
import EquipmentSubTypesTable from './equipmentSubTypesTable';
import { useSubTypeChecklists } from './hooks/useSubTypeChecklists';

type VehicleType = Database['public']['Tables']['type']['Row'];
type VehicleSubType = Database['public']['Tables']['sub_type']['Row'];

interface CompatibleItem {
  id: string;
  type: 'sub_type' | 'type';
}

interface EquipmentSubTypesProps {
  vehicleTypes: VehicleType[];
  vehicleSubTypes: VehicleSubType[];
}

function EquipmentSubTypes({ vehicleTypes, vehicleSubTypes }: EquipmentSubTypesProps) {
  // Estado para el tipo de equipo que se está editando
  const [editingType, setEditingType] = useState<VehicleSubType | null>(null);
  const [compatibleItems, setCompatibleItems] = useState<CompatibleItem[]>([]);

  // Hook para obtener checklists asignados al subtipo
  const { data: checklistIds = [], isLoading: isLoadingChecklists } = useSubTypeChecklists(editingType?.id || null);

  // Cargar los items compatibles cuando se edita un subtipo
  const loadCompatibleItems = useCallback(async (subTypeId: string) => {
    const supabase = supabaseBrowser();
    const { data, error } = await supabase
      .from('sub_type_compatible_items')
      .select('compatible_item_id, item_type')
      .eq('sub_type_id', subTypeId);

    if (error) {
      console.error('Error loading compatible items:', error);
      setCompatibleItems([]);
      return;
    }

    setCompatibleItems(
      data?.map((item) => ({
        id: item.compatible_item_id,
        type: item.item_type as 'sub_type' | 'type',
      })) || []
    );
  }, []);

  // Cuando cambia el subtipo en edición, cargar sus items compatibles
  useEffect(() => {
    if (editingType?.id) {
      loadCompatibleItems(editingType.id);
    } else {
      setCompatibleItems([]);
    }
  }, [editingType?.id, loadCompatibleItems]);

  const handleSuccess = () => {
    // Aquí podrías mostrar un mensaje de éxito o actualizar la lista
  };

  const handleReset = () => {
    setEditingType(null);
    setCompatibleItems([]);
  };

  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('empresa', 'subtipos', 'create');
  const canUpdate = hasPermission('empresa', 'subtipos', 'update');
  const showForm = canCreate || canUpdate;

  return (
    <div>
      {showForm ? (
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={30}>
            <EquipmentSubTypesForm
              initialData={editingType}
              onReset={handleReset}
              isEditing={!!editingType}
              onSuccess={handleSuccess}
              types={vehicleTypes}
              allSubTypes={vehicleSubTypes}
              initialCompatibleItems={compatibleItems}
              initialChecklistIds={checklistIds}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={70} className="ml-4">
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
