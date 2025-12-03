'use client';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { usePermissions } from '@/features/Permissions/hooks/usePermissions';
import { Suspense } from 'react';
import CostCenterForm from './CostCenterForm';
import CostCenterTable from './CostCenterTable';

interface CostCenterTabClientProps {
  costCenters: Promise<any[]>;
  savedVisibility: any;
  savedFilter: any;
}

export function CostCenterTabClient({ costCenters, savedVisibility, savedFilter }: CostCenterTabClientProps) {
  const { hasPermission } = usePermissions();

  // Verificar si tiene permisos de crear o editar
  const canCreateOrUpdate =
    hasPermission('empresa', 'cost-center', 'create') || hasPermission('empresa', 'cost-center', 'update');

  return (
    <div className="w-full">
      <ResizablePanelGroup className="min-h-[400px]" direction="horizontal">
        {canCreateOrUpdate && (
          <>
            <ResizablePanel defaultSize={40}>
              <CostCenterForm />
            </ResizablePanel>
            <ResizableHandle withHandle />
          </>
        )}

        <ResizablePanel defaultSize={canCreateOrUpdate ? 60 : 100}>
          <Suspense fallback={<p>Loading...</p>}>
            <CostCenterTable savedVisibility={savedVisibility} costCenters={costCenters} savedFilter={savedFilter} />
          </Suspense>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
