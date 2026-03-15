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
        <div className="w-full">
          <ResizablePanelGroup className="min-h-[400px]" direction="horizontal">
            <ResizablePanel defaultSize={30}>
              <div className="overflow-auto h-full pr-2">
                <ContractTypeForm editingContractType={editingContractType} />
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={70}>
              <div className="overflow-auto h-full pl-2">
                <ContractTypeTable
                  savedFilter={savedFilter}
                  contractTypes={allContractTypes}
                  onEdit={setEditingContractType}
                  savedVisibility={savedVisibility}
                />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
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
