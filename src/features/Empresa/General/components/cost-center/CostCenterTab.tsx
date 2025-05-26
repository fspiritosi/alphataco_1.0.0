'use client';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { VisibilityState } from '@tanstack/react-table';
import { useState } from 'react';
import CostCenterForm from './CostCenterForm';
import CostCenterTable from './CostCenterTable';
function CostCenterTab({
  costCenters,
  savedVisibility,
  savedFilter,
}: {
  costCenters: CostCenter[];
  savedVisibility: VisibilityState;
  savedFilter: string[];
}) {
  const [costCenter, setCostCenter] = useState<CostCenter | null>(null);
  return (
    <div className="w-full">
      <ResizablePanelGroup className="min-h-[400px]" direction="horizontal">
        <ResizablePanel defaultSize={40}>
          <CostCenterForm editingCostCenter={costCenter} />
        </ResizablePanel>
        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={60}>
          <CostCenterTable
            savedVisibility={savedVisibility}
            costCenters={costCenters}
            onEdit={setCostCenter}
            savedFilter={savedFilter}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

export default CostCenterTab;
