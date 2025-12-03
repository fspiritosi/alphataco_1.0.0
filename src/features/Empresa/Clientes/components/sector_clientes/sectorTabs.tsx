'use client';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { usePermissions } from '@/features/Permissions/hooks/usePermissions';
import { useState } from 'react';
import { fechAllCustomers, fetchAllContractorSectorBySectorIds, fetchAllSectors } from '../../actions/create';
import SectorForm from './sectorForm';
import SectorTable from './sectorTable';

// Eliminamos la interfaz local y usamos la importada
// interface Sector {
//   id: string;
//   name: string;
//   // Agrega otros campos que necesites
// }

interface SectorTabsProps {
  customers: Awaited<ReturnType<typeof fechAllCustomers>>;
  sectors: Awaited<ReturnType<typeof fetchAllSectors>>;
  contractorSectors: Awaited<ReturnType<typeof fetchAllContractorSectorBySectorIds>>;
}

function SectorTabs({ customers, sectors, contractorSectors }: SectorTabsProps) {
  const [SelectedSector, setSelectedSector] = useState<
    Awaited<ReturnType<typeof fetchAllContractorSectorBySectorIds>>[number] | null
  >(null);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const { hasPermission } = usePermissions();

  // Verificar si tiene permisos de crear o editar
  const canCreateOrUpdate =
    hasPermission('comercial', 'sector', 'create') || hasPermission('comercial', 'sector', 'update');

  return (
    <div>
      <ResizablePanelGroup direction="horizontal" className="min-h-[400px]">
        {canCreateOrUpdate && (
          <>
            <ResizablePanel defaultSize={40}>
              <SectorForm
                customers={customers}
                sectors={sectors}
                mode={mode}
                setMode={setMode}
                selectedSector={SelectedSector}
                setSelectedSector={setSelectedSector}
              />
            </ResizablePanel>
            <ResizableHandle withHandle />
          </>
        )}
        <ResizablePanel defaultSize={canCreateOrUpdate ? 60 : 100}>
          <SectorTable
            customers={customers}
            contractorSectors={contractorSectors}
            sectors={sectors}
            selectedSector={SelectedSector}
            setSelectedSector={setSelectedSector}
            setMode={setMode}
            mode={mode}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

export default SectorTabs;
