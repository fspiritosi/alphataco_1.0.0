'use client';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { usePermissions } from '@/features/Permissions/hooks/usePermissions';
import { useState } from 'react';
import type { AreaRow } from '../actions/areas.server';
import type { CustomerRef } from '../lib/serializers';
import AreaForm, { type ProvinceOption } from './area_clientes/areaForm';
import AreaTable from './area_clientes/areaTable';

interface CustomerTabProps {
  customers: CustomerRef[];
  provinces: ProvinceOption[];
  areas: AreaRow[];
  savedFilters: string[];
}

/** Pestaña "Áreas" de Comercial: formulario lateral + tabla. */
function CustomerTab({ customers, provinces, areas, savedFilters }: CustomerTabProps) {
  const [selectedArea, setSelectedArea] = useState<AreaRow | null>(null);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const { hasPermission } = usePermissions();

  const canCreateOrUpdate =
    hasPermission('comercial', 'areas', 'create') || hasPermission('comercial', 'areas', 'update');

  return (
    <div>
      <ResizablePanelGroup direction="horizontal" className="min-h-[400px]">
        {canCreateOrUpdate && (
          <>
            <ResizablePanel defaultSize={30}>
              <AreaForm
                customers={customers}
                provinces={provinces}
                mode={mode}
                setMode={setMode}
                selectedArea={selectedArea}
                setSelectedArea={setSelectedArea}
              />
            </ResizablePanel>
            <ResizableHandle withHandle />
          </>
        )}
        <ResizablePanel defaultSize={canCreateOrUpdate ? 70 : 100}>
          <AreaTable areas={areas} savedFilters={savedFilters} setSelectedArea={setSelectedArea} setMode={setMode} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

export default CustomerTab;
