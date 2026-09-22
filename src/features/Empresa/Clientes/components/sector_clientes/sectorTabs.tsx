'use client';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { usePermissions } from '@/features/Permissions/hooks/usePermissions';
import { useState } from 'react';
import type { SectorCustomerRow } from '../../actions/sectors.server';
import type { CustomerRef } from '../../lib/serializers';
import SectorForm from './sectorForm';
import SectorTable from './sectorTable';

interface SectorTabsProps {
  customers: CustomerRef[];
  contractorSectors: SectorCustomerRow[];
}

/** Pestaña "Sectores" de Comercial: formulario lateral + tabla sector ↔ cliente. */
function SectorTabs({ customers, contractorSectors }: SectorTabsProps) {
  const [selectedSector, setSelectedSector] = useState<SectorCustomerRow | null>(null);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const { hasPermission } = usePermissions();

  const canCreateOrUpdate =
    hasPermission('comercial', 'sector', 'create') || hasPermission('comercial', 'sector', 'update');

  return (
    <div>
      <ResizablePanelGroup direction="horizontal" className="min-h-[400px]">
        {canCreateOrUpdate && (
          <>
            <ResizablePanel defaultSize={30}>
              <SectorForm
                customers={customers}
                mode={mode}
                setMode={setMode}
                selectedSector={selectedSector}
                setSelectedSector={setSelectedSector}
              />
            </ResizablePanel>
            <ResizableHandle withHandle />
          </>
        )}
        <ResizablePanel defaultSize={canCreateOrUpdate ? 70 : 100}>
          <SectorTable contractorSectors={contractorSectors} setSelectedSector={setSelectedSector} setMode={setMode} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

export default SectorTabs;
