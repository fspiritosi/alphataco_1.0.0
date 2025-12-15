'use client';

import { Card } from '@/components/ui/card';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { usePermissions } from '@/features/Permissions/hooks/usePermissions';
import { Suspense } from 'react';
import { KpiForm } from './components/KpiForm';
import { KpisTable } from './components/KpisTable';
import { KPI } from './types';

interface KpisTabClientProps {
  kpis: Promise<KPI[]>;
  savedVisibility: any;
  savedFilter: any;
}

export function KpisTabClient({ kpis, savedVisibility, savedFilter }: KpisTabClientProps) {
  const { hasPermission } = usePermissions();

  // Verificar si tiene permisos de crear o editar
  const canCreateOrUpdate =
    hasPermission('dashboard', 'kpis', 'create') || hasPermission('dashboard', 'kpis', 'update');

  return (
    <Card className="w-full">
      <ResizablePanelGroup className="min-h-[400px]" direction="horizontal">
        {canCreateOrUpdate && (
          <>
            <ResizablePanel defaultSize={40}>
              <KpiForm />
            </ResizablePanel>
            <ResizableHandle withHandle />
          </>
        )}

        <ResizablePanel defaultSize={canCreateOrUpdate ? 60 : 100}>
          <Suspense fallback={<p>Cargando KPIs...</p>}>
            <KpisTable savedVisibility={savedVisibility} kpis={kpis} savedFilter={savedFilter} />
          </Suspense>
        </ResizablePanel>
      </ResizablePanelGroup>
    </Card>
  );
}
