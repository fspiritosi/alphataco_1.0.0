'use client';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Toaster } from '@/components/ui/toaster';
import { usePermissions } from '@/features/Permissions';
import { Position } from '@/types/types';
import { VisibilityState } from '@tanstack/react-table';
import { useState } from 'react';
import PositionsForm from './positionsForm';
import PositionsTable from './positionsTable';

interface PositionsClientProps {
  positions: Position[];
  hierarchicalPositions: any[];
  aptitudes: any[];
  savedVisibility: VisibilityState;
  savedFilter: string[];
}

export default function PositionsClient({
  positions,
  hierarchicalPositions,
  aptitudes,
  savedVisibility,
  savedFilter,
}: PositionsClientProps) {
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [mode, setMode] = useState<'create' | 'edit'>('create');

  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('empresa', 'positions', 'create');
  const canUpdate = hasPermission('empresa', 'positions', 'update');
  const showForm = canCreate || canUpdate;

  return (
    <div>
      {showForm ? (
        <div className="w-full">
          <ResizablePanelGroup className="min-h-[400px]" direction="horizontal">
            <ResizablePanel defaultSize={30}>
              <div className="overflow-auto h-full pr-2">
                <PositionsForm
                  position={selectedPosition}
                  hierarchicalData={hierarchicalPositions}
                  aptitudes={aptitudes}
                  mode={mode}
                  setMode={setMode}
                />
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={70}>
              <div className="overflow-auto h-full pl-2">
                <PositionsTable
                  savedFilter={savedFilter}
                  savedVisibility={savedVisibility}
                  positions={positions}
                  hierarchicalPositions={hierarchicalPositions}
                  selectedPosition={selectedPosition}
                  setSelectedPosition={setSelectedPosition}
                  setMode={setMode}
                  mode={mode}
                />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      ) : (
        <PositionsTable
          savedFilter={savedFilter}
          savedVisibility={savedVisibility}
          positions={positions}
          hierarchicalPositions={hierarchicalPositions}
          selectedPosition={selectedPosition}
          setSelectedPosition={setSelectedPosition}
          setMode={setMode}
          mode={mode}
        />
      )}
      <Toaster />
    </div>
  );
}
