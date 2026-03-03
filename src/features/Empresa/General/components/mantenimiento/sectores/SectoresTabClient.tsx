'use client';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/features/Permissions/hooks/usePermissions';
import { Suspense } from 'react';
import type { WorkshopSector } from '../../../actions/workshops.actions';
import SectoresForm from './SectoresForm';
import SectoresTable from './SectoresTable';

interface SectoresTabClientProps {
  workshopSectors: Promise<WorkshopSector[]>;
  internalWorkshops: Promise<{ id: string; name: string }[]>;
  savedVisibility: Record<string, boolean>;
  savedFilter: string[];
}

export function SectoresTabClient({
  workshopSectors,
  internalWorkshops,
  savedVisibility,
  savedFilter,
}: SectoresTabClientProps) {
  const { hasPermission } = usePermissions();

  // Verificar si tiene permisos de crear o editar
  const canCreateOrUpdate =
    hasPermission('empresa', 'sectores_taller', 'create') || hasPermission('empresa', 'sectores_taller', 'update');

  return (
    <div className="w-full">
      <ResizablePanelGroup className="min-h-[400px]" direction="horizontal">
        {canCreateOrUpdate && (
          <>
            <ResizablePanel defaultSize={40}>
              <SectoresForm internalWorkshops={internalWorkshops} />
            </ResizablePanel>
            <ResizableHandle withHandle />
          </>
        )}

        <ResizablePanel defaultSize={canCreateOrUpdate ? 60 : 100}>
          <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-md" />}>
            <SectoresTable
              savedVisibility={savedVisibility}
              workshopSectors={workshopSectors}
              savedFilter={savedFilter}
            />
          </Suspense>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
