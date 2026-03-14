'use client';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { usePermissions } from '@/features/Permissions';
import { useState } from 'react';
import { toast } from 'sonner';
import { AptitudTecnica } from '../../actions/rrhh/aptitudesTecnicas';
import { AptitudesForm } from './aptitudesForm';
import { AptitudesTable } from './aptitudesTable';

interface AptitudesClientProps {
  initialAptitudes: AptitudTecnica[];
  initialPositions: any[];
}

export function AptitudesClient({ initialAptitudes = [], initialPositions = [] }: AptitudesClientProps) {
  const [aptitudes, setAptitudes] = useState<AptitudTecnica[]>(initialAptitudes);
  const [editingAptitud, setEditingAptitud] = useState<AptitudTecnica | null>(null);

  const handleEdit = (aptitud: AptitudTecnica) => {
    setEditingAptitud(aptitud);
  };

  const handleSuccess = (aptitud: AptitudTecnica) => {
    if (editingAptitud) {
      setAptitudes(aptitudes.map((a) => (a.id === aptitud.id ? aptitud : a)));
      toast.success('Aptitud actualizada correctamente');
    } else {
      setAptitudes([aptitud, ...aptitudes]);
      toast.success('Aptitud creada correctamente');
    }
    setEditingAptitud(null);
  };

  const handleDelete = async (id: string) => {
    setAptitudes(aptitudes.filter((a) => a.id !== id));
    toast.success('Aptitud eliminada correctamente');
  };

  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('empresa', 'aptitudes', 'create');
  const canUpdate = hasPermission('empresa', 'aptitudes', 'update');
  const showForm = canCreate || canUpdate;

  return (
    <div className="w-full">
      {showForm ? (
        <div className="w-full">
          <ResizablePanelGroup direction="horizontal" className="min-h-[400px]">
            <ResizablePanel defaultSize={30}>
              <div className="overflow-auto h-full pr-2">
                <AptitudesForm onSuccess={handleSuccess} positions={initialPositions} initialData={editingAptitud} />
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={70}>
              <div className="overflow-auto h-full pl-2">
                <AptitudesTable aptitudes={aptitudes} onEdit={handleEdit} />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      ) : (
        <AptitudesTable aptitudes={aptitudes} onEdit={handleEdit} />
      )}
    </div>
  );
}
