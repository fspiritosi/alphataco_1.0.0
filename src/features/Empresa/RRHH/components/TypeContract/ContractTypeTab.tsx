'use client';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { usePermissions } from '@/features/Permissions';
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

  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('empresa', 'contract-types', 'create');
  const canUpdate = hasPermission('empresa', 'contract-types', 'update');
  const showForm = canCreate || canUpdate;

  return (
    <div className="w-full">
      {showForm ? (
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
      ) : (
        <ContractTypeTable
          savedFilter={savedFilter}
          contractTypes={allContractTypes}
          onEdit={setEditingContractType}
          savedVisibility={savedVisibility}
        />
      )}
    </div>
  );
}
