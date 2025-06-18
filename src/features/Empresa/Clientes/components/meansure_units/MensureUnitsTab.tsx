'use client';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { useState } from 'react';
import MensureUnitsForm from './MensureUnitsForm';
import MensureUnitsTable from './MensureUnitsTable';

function MensureUnitsTab() {
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  const [mode, setMode] = useState<'create' | 'edit'>('create');

  return (
    <div>
      <ResizablePanelGroup direction="horizontal" className="min-h-[400px]">
        <ResizablePanel defaultSize={40}>
          <MensureUnitsForm />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={60}>
          <MensureUnitsTable />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

export default MensureUnitsTab;
