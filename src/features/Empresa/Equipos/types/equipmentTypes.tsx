'use client';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { usePermissions } from '@/features/Permissions';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useCallback, useEffect, useState } from 'react';
import { FetchTypeOfVehicles } from '../actions/actions';
import EquipmentTypesForm from './equipmentTypesForm';
import EquipmentTypesTable from './equipmentTypesTable';
import { useTypeChecklists } from './hooks/useTypeChecklists';

function EquipmentTypes({ vehicleTypes }: { vehicleTypes: Awaited<ReturnType<typeof FetchTypeOfVehicles>> }) {
  // Estado para el tipo de equipo que se está editando
  const [editingType, setEditingType] = useState<Awaited<ReturnType<typeof FetchTypeOfVehicles>>[0] | null>(null);
  const [hitchTypeIds, setHitchTypeIds] = useState<string[]>([]);
  const queryClient = React.useMemo(() => new QueryClient(), []);

  // Hook para obtener checklists asignados al type
  const { data: checklistIds = [], isLoading: isLoadingChecklists } = useTypeChecklists(editingType?.id || null);

  // Handler para editar que convierte el tipo de EquipmentType a FetchTypeOfVehicles[0]
  const handleEdit = React.useCallback(
    (equipmentType: { id: string; name: string; is_active: boolean; created_at?: string; updated_at?: string }) => {
      // Buscar el tipo completo en vehicleTypes
      const fullType = vehicleTypes.find((type) => type.id === equipmentType.id);
      if (fullType) {
        setEditingType(fullType);
      }
    },
    [vehicleTypes]
  );

  // Cargar los tipos de enganche cuando se edita un tipo
  const loadHitchTypes = useCallback(async (typeId: string) => {
    const supabase = supabaseBrowser();
    const { data, error } = await supabase.from('type_hitch_types').select('compatible_type_id').eq('type_id', typeId);

    if (error) {
      console.error('Error loading hitch types:', error);
      setHitchTypeIds([]);
      return;
    }

    setHitchTypeIds(data?.map((item) => item.compatible_type_id) || []);
  }, []);

  // Cuando cambia el tipo en edición, cargar sus tipos de enganche
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
    <div>
      {showForm ? (
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={35}>
            <EquipmentTypesForm
              initialData={editingType}
              onReset={handleReset}
              isEditing={!!editingType}
              onSuccess={handleSuccess}
              allTypes={vehicleTypes}
              initialHitchTypeIds={hitchTypeIds}
              initialChecklistIds={checklistIds}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={65} className="ml-4">
            <QueryClientProvider client={queryClient}>
              <EquipmentTypesTable vehicleTypes={vehicleTypes} onEdit={handleEdit} canEdit={canUpdate} />
            </QueryClientProvider>
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <QueryClientProvider client={queryClient}>
          <EquipmentTypesTable vehicleTypes={vehicleTypes} onEdit={handleEdit} canEdit={canUpdate} />
        </QueryClientProvider>
      )}
    </div>
  );
}

export default EquipmentTypes;
