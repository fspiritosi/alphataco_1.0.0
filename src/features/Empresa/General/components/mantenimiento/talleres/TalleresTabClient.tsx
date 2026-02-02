'use client';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { usePermissions } from '@/features/Permissions/hooks/usePermissions';
import { Suspense } from 'react';
import type { Workshop } from '../../../actions/workshops.actions';
import TalleresForm from './TalleresForm';
import TalleresTable from './TalleresTable';

interface TalleresTabClientProps {
  workshops: Promise<Workshop[]>;
  savedVisibility: Record<string, boolean>;
  savedFilter: string[];
}

export function TalleresTabClient({ workshops, savedVisibility, savedFilter }: TalleresTabClientProps) {
  const { hasPermission } = usePermissions();

  // Verificar si tiene permisos de crear o editar
  const canCreateOrUpdate =
    hasPermission('empresa', 'talleres', 'create') || hasPermission('empresa', 'talleres', 'update');

  return (
    <div className="w-full">
      <ResizablePanelGroup className="min-h-[400px]" direction="horizontal">
        {canCreateOrUpdate && (
          <>
            <ResizablePanel defaultSize={40}>
              <TalleresForm />
            </ResizablePanel>
            <ResizableHandle withHandle />
          </>
        )}

        <ResizablePanel defaultSize={canCreateOrUpdate ? 60 : 100}>
          <Suspense fallback={<p>Cargando...</p>}>
            <TalleresTable savedVisibility={savedVisibility} workshops={workshops} savedFilter={savedFilter} />
          </Suspense>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
