'use client';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Toaster } from '@/components/ui/toaster';
import { VisibilityState } from '@tanstack/react-table';
import { useState } from 'react';
import MaintenanceGroupForm from './MaintenanceGroupForm';
import MaintenanceGroupsTable from './MaintenanceGroupsTable';
import { fetchMaintenanceGroupsActionType, fetchTypesOfRepairActionType } from './actions/maintenanceGroupActions';

interface MaintenanceGroupsClientProps {
  groups: fetchMaintenanceGroupsActionType['groups'];
  savedVisibility: VisibilityState;
  savedFilter: string[];
  types: fetchTypesOfRepairActionType['types'];
}

export default function MaintenanceGroupsClient({
  groups,
  savedVisibility,
  savedFilter,
  types,
}: MaintenanceGroupsClientProps) {
  const [selectedGroup, setSelectedGroup] = useState<fetchMaintenanceGroupsActionType['groups'][number] | null>(null);
  const [mode, setMode] = useState<'create' | 'edit'>('create');

  return (
    <div>
      <ResizablePanelGroup className="min-h-[400px]" direction="horizontal">
        <ResizablePanel defaultSize={40}>
          <MaintenanceGroupForm group={selectedGroup} mode={mode} setMode={setMode} types={types} />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={60}>
          <MaintenanceGroupsTable
            savedFilter={savedFilter}
            savedVisibility={savedVisibility}
            groups={groups}
            selectedGroup={selectedGroup}
            setSelectedGroup={setSelectedGroup}
            setMode={setMode}
            types={types}
            mode={mode}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
      <Toaster />
      {/* {error && <div className="text-red-500 mt-2">Error: {error}</div>} */}
    </div>
  );
}
