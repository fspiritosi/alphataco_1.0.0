'use client';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
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

  // Manejar la creación de una nueva unidad

  return (
    <div>
      <ResizablePanelGroup direction="horizontal" className="min-h-[400px]">
        <ResizablePanel defaultSize={40}>
          <MensureUnitsForm
            selectedUnit={selectedUnit}
            setSelectedUnit={setSelectedUnit}
            mode={mode}
            setMode={setMode}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={60}>
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
