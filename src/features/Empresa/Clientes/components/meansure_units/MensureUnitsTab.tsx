'use client';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { usePermissions } from '@/features/Permissions/hooks/usePermissions';
import type { VisibilityState } from '@tanstack/react-table';
import { useState } from 'react';
import type { MeasureUnitRow } from '../../actions/measure-units.server';
import MensureUnitsForm from './MensureUnitsForm';
import MensureUnitsTable from './MensureUnitsTable';

interface MensureUnitsTabProps {
  units: MeasureUnitRow[];
  savedVisibility: VisibilityState;
  savedFilters: string[];
}

/** Pestaña "Unidades de Medida" de Comercial: formulario lateral + tabla. */
function MensureUnitsTab({ units, savedVisibility, savedFilters }: MensureUnitsTabProps) {
  const [selectedUnit, setSelectedUnit] = useState<MeasureUnitRow | null>(null);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const { hasPermission } = usePermissions();

  const canCreateOrUpdate =
    hasPermission('comercial', 'mensure_units', 'create') || hasPermission('comercial', 'mensure_units', 'update');

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
