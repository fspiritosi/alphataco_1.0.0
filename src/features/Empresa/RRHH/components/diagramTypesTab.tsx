'use client';
import { fetchDiagramsTypes } from '@/app/server/GET/actions';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Toaster } from '@/components/ui/toaster';
import ListDiagrams from '@/features/Empresa/RRHH/components/listDiagrams';
import WorkDiagramForm from '@/features/Empresa/RRHH/components/work-diagram-form';
import { usePermissions } from '@/features/Permissions';
import { VisibilityState } from '@tanstack/react-table';
import { useState } from 'react';
import { fetchAllWorkDiagrams } from '../actions/rrhh/actions';

function diagramTypesTab({
  diagrams_types,
  data,
  savedVisibility,
  savedFilter,
}: {
  diagrams_types: Awaited<ReturnType<typeof fetchDiagramsTypes>>;
  data: Awaited<ReturnType<typeof fetchAllWorkDiagrams>>;
  savedVisibility: VisibilityState;
  savedFilter: string[];
}) {
  const [selectedDiagram, setSelectedDiagram] = useState<
    Awaited<ReturnType<typeof fetchAllWorkDiagrams>>[number] | null
  >(null);
  const [mode, setMode] = useState<'create' | 'edit'>('create');

  const handleEdit = (diagram: Awaited<ReturnType<typeof fetchAllWorkDiagrams>>[number]) => {
    setSelectedDiagram(diagram);
  };

  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('empresa', 'listado', 'create');
  const canUpdate = hasPermission('empresa', 'listado', 'update');
  const showForm = canCreate || canUpdate;

  return (
    <div>
      {showForm ? (
        <ResizablePanelGroup className="min-h-[400px]" direction="horizontal">
          <ResizablePanel defaultSize={40}>
            <WorkDiagramForm diagram={selectedDiagram} mode={mode} diagramsTypes={diagrams_types} setMode={setMode} />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={60}>
            <ListDiagrams
              data={data}
              diagramsTypes={diagrams_types}
              onEdit={handleEdit}
              onModeChange={setMode}
              savedVisibility={savedVisibility}
              savedFilter={savedFilter}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <ListDiagrams
          data={data}
          diagramsTypes={diagrams_types}
          onEdit={handleEdit}
          onModeChange={setMode}
          savedVisibility={savedVisibility}
          savedFilter={savedFilter}
        />
      )}
      <Toaster />
    </div>
  );
}

export default diagramTypesTab;
