'use client';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { usePermissions } from '@/features/Permissions';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AptitudTecnica } from '../../actions/rrhh/aptitudesTecnicas';
import { AptitudesForm } from './aptitudesForm';
import { AptitudesTable } from './aptitudesTable';

interface AptitudesClientProps {
  initialAptitudes: AptitudTecnica[];
  initialPositions: any[];
}

export function AptitudesClient({ initialAptitudes = [], initialPositions = [] }: AptitudesClientProps) {
  const [aptitudes, setAptitudes] = useState<AptitudTecnica[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAptitud, setEditingAptitud] = useState<AptitudTecnica | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Inicializar estados con los valores iniciales
  useEffect(() => {
    setAptitudes(initialAptitudes);
    setPositions(initialPositions);
    setIsLoading(false);
  }, [initialAptitudes, initialPositions]);

  // Sincronizar con los props iniciales
  useEffect(() => {
    setAptitudes(initialAptitudes);
  }, [initialAptitudes]);

  useEffect(() => {
    setPositions(initialPositions);
  }, [initialPositions]);

  const handleCreate = () => {
    setEditingAptitud(null);
    setIsFormOpen(true);
  };

  const handleEdit = (aptitud: AptitudTecnica) => {
    setEditingAptitud(aptitud);
    setIsFormOpen(true);
  };

  const handleSuccess = (aptitud: AptitudTecnica) => {
    if (editingAptitud) {
      // Actualizar aptitud existente
      setAptitudes(aptitudes.map((a) => (a.id === aptitud.id ? aptitud : a)));
      toast.success('Aptitud actualizada correctamente');
    } else {
      // Agregar nueva aptitud
      setAptitudes([aptitud, ...aptitudes]);
      toast.success('Aptitud creada correctamente');
    }
    setIsFormOpen(false);
  };

  const handleDelete = async (id: string) => {
    // Aquí iría la lógica para eliminar la aptitud
    // Por ahora, solo la quitamos del estado local
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
        <ResizablePanelGroup direction="horizontal" className="w-full">
          <ResizablePanel defaultSize={35}>
            <AptitudesForm onSuccess={handleSuccess} positions={positions} initialData={editingAptitud} />
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={65}>
            <AptitudesTable aptitudes={aptitudes} onEdit={handleEdit} />
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <AptitudesTable aptitudes={aptitudes} onEdit={handleEdit} />
      )}
    </div>
  );
}
