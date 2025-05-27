'use client';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { VisibilityState } from '@tanstack/react-table';
import { useState } from 'react';
import ContractTypeForm from './ContractTypeForm';
import ContractTypeTable from './ContractTypeTable';

export default function ContractTypesTab({
  allContractTypes,
  savedVisibility,
  savedFilter,
}: {
  allContractTypes: ContractType[];
  savedVisibility: VisibilityState;
  savedFilter: string[];
}) {
  const [editingContractType, setEditingContractType] = useState<ContractType | null>(null);

  return (
    <div className="w-full">
      <ResizablePanelGroup className="min-h-[400px]" direction="horizontal">
        <ResizablePanel defaultSize={40}>
          <ContractTypeForm editingContractType={editingContractType} />
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={60}>
          <ContractTypeTable
            savedFilter={savedFilter}
            contractTypes={allContractTypes}
            onEdit={setEditingContractType}
            savedVisibility={savedVisibility}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
