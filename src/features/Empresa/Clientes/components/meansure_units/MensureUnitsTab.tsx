'use client';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { usePermissions } from '@/features/Permissions/hooks/usePermissions';
import { VisibilityState } from '@tanstack/react-table';
import { useState } from 'react';
import MensureUnitsForm from './MensureUnitsForm';
import MensureUnitsTable from './MensureUnitsTable';
import { fetchMeasureUnits } from './actions/actions';

function MensureUnitsTab({
  units,
  savedVisibility,
  savedFilters,
}: {
  units: Awaited<ReturnType<typeof fetchMeasureUnits>>;
  savedVisibility: VisibilityState;
  savedFilters: string[];
}) {
  // Estado para la unidad seleccionada y el modo del formulario
  const [selectedUnit, setSelectedUnit] = useState<Awaited<ReturnType<typeof fetchMeasureUnits>>[number] | null>(null);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const { hasPermission } = usePermissions();

  // Verificar si tiene permisos de crear o editar
  const canCreateOrUpdate =
    hasPermission('comercial', 'mensure_units', 'create') || hasPermission('comercial', 'mensure_units', 'update');

  // Manejar la creación de una nueva unidad

  return (
    <div>
      <ResizablePanelGroup direction="horizontal" className="min-h-[400px]">
        {canCreateOrUpdate && (
          <>
            <ResizablePanel defaultSize={30}>
              <MensureUnitsForm
                selectedUnit={selectedUnit}
                setSelectedUnit={setSelectedUnit}
                mode={mode}
                setMode={setMode}
              />
            </ResizablePanel>
            <ResizableHandle withHandle />
          </>
        )}
        <ResizablePanel defaultSize={canCreateOrUpdate ? 70 : 100}>
          <MensureUnitsTable
            units={units}
            savedVisibility={savedVisibility}
            savedFilters={savedFilters}
            setSelectedUnit={setSelectedUnit}
            setMode={setMode}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

export default MensureUnitsTab;
