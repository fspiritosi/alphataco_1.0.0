'use client';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { usePermissions } from '@/features/Permissions';
import { Logger } from '@/lib/logger';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useEffect, useState } from 'react';
import { FetchTypeOfVehicles } from '../actions/actions';
import EquipmentTypesForm from './equipmentTypesForm';
import EquipmentTypesTable from './equipmentTypesTable';
import { useTypeChecklists } from './hooks/useTypeChecklists';

const logger = new Logger('EquipmentTypes');

function EquipmentTypes({ vehicleTypes }: { vehicleTypes: Awaited<ReturnType<typeof FetchTypeOfVehicles>> }) {
  const [editingType, setEditingType] = useState<Awaited<ReturnType<typeof FetchTypeOfVehicles>>[0] | null>(null);
  const [hitchTypeIds, setHitchTypeIds] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const { data: checklistIds = [], isLoading: isLoadingChecklists } = useTypeChecklists(editingType?.id || null);

  const handleEdit = React.useCallback(
    (equipmentType: { id: string; name: string; is_active: boolean; created_at?: string; updated_at?: string }) => {
      const fullType = vehicleTypes.find((type) => type.id === equipmentType.id);
      if (fullType) {
        setEditingType(fullType);
      }
    },
    [vehicleTypes]
  );

  const loadHitchTypes = useCallback(async (typeId: string) => {
    const supabase = supabaseBrowser();
    const { data, error } = await supabase.from('type_hitch_types').select('compatible_type_id').eq('type_id', typeId);

    if (error) {
      logger.error('Error al cargar tipos de enganche', { data: { error } });
      setHitchTypeIds([]);
      return;
    }

    setHitchTypeIds(data?.map((item) => item.compatible_type_id) || []);
  }, []);

  useEffect(() => {
    if (editingType?.id) {
      loadHitchTypes(editingType.id);
    } else {
      setHitchTypeIds([]);
    }
  }, [editingType?.id, loadHitchTypes]);

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['equipment-types-table-type'] });
  };

  const handleReset = () => {
    setEditingType(null);
    setHitchTypeIds([]);
  };

  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('empresa', 'tipos', 'create');
  const canUpdate = hasPermission('empresa', 'tipos', 'update');
  const showForm = canCreate || canUpdate;

  return (
    <div className="w-full">
      {showForm ? (
        <ResizablePanelGroup direction="horizontal" className="min-h-[400px]">
          <ResizablePanel defaultSize={30}>
            <div className="overflow-auto h-full pr-2">
              <EquipmentTypesForm
                initialData={editingType}
                onReset={handleReset}
                isEditing={!!editingType}
                onSuccess={handleSuccess}
                allTypes={vehicleTypes}
                initialHitchTypeIds={hitchTypeIds}
                initialChecklistIds={checklistIds}
              />
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={70}>
            <div className="overflow-auto h-full pl-2">
              <EquipmentTypesTable vehicleTypes={vehicleTypes} onEdit={handleEdit} canEdit={canUpdate} />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <EquipmentTypesTable vehicleTypes={vehicleTypes} onEdit={handleEdit} canEdit={canUpdate} />
      )}
    </div>
  );
}

export default EquipmentTypes;
