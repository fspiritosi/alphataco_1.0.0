'use client';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { fetchAreasWithProvinces } from '@/features/Empresa/Clientes/actions/create';
import { usePermissions } from '@/features/Permissions/hooks/usePermissions';
import { useState } from 'react';
import AreaForm from './area_clientes/areaForm';
import AreaTable from './area_clientes/areaTable';

interface Cliente {
  cuit: number;
  id: string;
  name: string;
}

function CustomerTab({
  customers,
  provinces,
  areas,
  savedFilters,
}: {
  customers: Cliente[];
  provinces: any[];
  areas: Awaited<ReturnType<typeof fetchAreasWithProvinces>>;
  savedFilters: string[];
}) {
  const [selectedArea, setSelectedArea] = useState<any>(null);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const { hasPermission } = usePermissions();

  // Verificar si tiene permisos de crear o editar
  const canCreateOrUpdate =
    hasPermission('comercial', 'areas', 'create') || hasPermission('comercial', 'areas', 'update');

  return (
    <div>
      <ResizablePanelGroup direction="horizontal" className="min-h-[400px]">
        {canCreateOrUpdate && (
          <>
            <ResizablePanel defaultSize={40}>
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
        <ResizablePanel defaultSize={canCreateOrUpdate ? 60 : 100}>
          <AreaTable
            areas={areas}
            savedFilters={savedFilters}
            selectedArea={selectedArea}
            setSelectedArea={setSelectedArea}
            setMode={setMode}
            mode={mode}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
export default CustomerTab;
