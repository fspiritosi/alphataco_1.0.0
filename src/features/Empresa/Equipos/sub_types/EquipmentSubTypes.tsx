'use client';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { usePermissions } from '@/features/Permissions';
import { Logger } from '@/lib/logger';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { useCallback, useEffect, useState } from 'react';
import { Database } from '../../../../../database.types';
import EquipmentSubTypesForm from './equipmentSubTypesForm';
import EquipmentSubTypesTable from './equipmentSubTypesTable';
import { useSubTypeChecklists } from './hooks/useSubTypeChecklists';

const logger = new Logger('EquipmentSubTypes');

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
  const [editingType, setEditingType] = useState<VehicleSubType | null>(null);
  const [compatibleItems, setCompatibleItems] = useState<CompatibleItem[]>([]);

  const { data: checklistIds = [], isLoading: isLoadingChecklists } = useSubTypeChecklists(editingType?.id || null);

  const loadCompatibleItems = useCallback(async (subTypeId: string) => {
    const supabase = supabaseBrowser();
    const { data, error } = await supabase
      .from('sub_type_compatible_items')
      .select('compatible_item_id, item_type')
      .eq('sub_type_id', subTypeId);

    if (error) {
      logger.error('Error al cargar items compatibles', { data: { error } });
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

  useEffect(() => {
    if (editingType?.id) {
      loadCompatibleItems(editingType.id);
    } else {
      setCompatibleItems([]);
    }
  }, [editingType?.id, loadCompatibleItems]);

  const handleSuccess = () => {};

  const handleReset = () => {
    setEditingType(null);
    setCompatibleItems([]);
  };

  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('empresa', 'subtipos', 'create');
  const canUpdate = hasPermission('empresa', 'subtipos', 'update');
  const showForm = canCreate || canUpdate;

  return (
    <div className="w-full">
      {showForm ? (
        <ResizablePanelGroup direction="horizontal" className="min-h-[400px]">
          <ResizablePanel defaultSize={30}>
            <div className="overflow-auto h-full pr-2">
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
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={70}>
            <div className="overflow-auto h-full pl-2">
              <EquipmentSubTypesTable
                vehicleTypes={vehicleTypes}
                vehicleSubTypes={vehicleSubTypes}
                onEdit={setEditingType}
                canEdit={canUpdate}
              />
            </div>
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
