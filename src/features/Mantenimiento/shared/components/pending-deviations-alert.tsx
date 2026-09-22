'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getPendingDeviations } from '@/features/Mantenimiento/actions/maintenance-actions';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Wrench } from 'lucide-react';
import { useState } from 'react';
import { CriticalDeviationsRepairModal } from './critical-deviations-repair-modal';

interface PendingDeviationsAlertProps {
  equipmentId: string;
}

export function PendingDeviationsAlert({ equipmentId }: PendingDeviationsAlertProps) {
  const [showModal, setShowModal] = useState(false);

  // React Query sobre la server action: sin useEffect + useState para fetching.
  const {
    data: deviations = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['pending-deviations', equipmentId],
    queryFn: () => getPendingDeviations(equipmentId),
    enabled: !!equipmentId,
    staleTime: 60 * 1000,
  });

  if (isLoading) {
    return null;
  }

  if (deviations.length === 0) {
    return null;
  }

  // Agrupar desvíos por checklist_answer para mostrar información
  const checklistInfo = deviations[0]?.checklist_answers;
  const createdBy =
    deviations[0]?.profile?.fullname ||
    (deviations[0]?.employees
      ? `${deviations[0].employees.firstname || ''} ${deviations[0].employees.lastname || ''}`.trim()
      : 'Usuario desconocido');

  const checklistName = checklistInfo?.checklist_templates?.name || 'Checklist';
  const createdDate = checklistInfo?.created_at
    ? new Date(checklistInfo.created_at).toLocaleDateString('es-AR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const handleOpenModal = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    // Recargar desvíos después de cerrar el modal (por si se resolvieron)
    void refetch();
  };

  return (
    <>
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Desvíos de Checklist Pendientes</AlertTitle>
        <AlertDescription className="space-y-2">
          <div>
            <p className="font-medium mb-1">
              Hay{' '}
              <Badge variant="destructive" className="ml-1">
                {deviations.length}
              </Badge>{' '}
              item(s) crítico(s) con fallos que requieren generar solicitudes de reparación.
            </p>
            {checklistInfo && (
              <div className="text-sm text-muted-foreground mt-2 space-y-1">
                <p>
                  <span className="font-medium">Checklist:</span> {checklistName}
                </p>
                <p>
                  <span className="font-medium">Generado por:</span> {createdBy}
                </p>
                {createdDate && (
                  <p>
                    <span className="font-medium">Fecha:</span> {createdDate}
                  </p>
                )}
              </div>
            )}
          </div>
          <Button onClick={handleOpenModal} variant="destructive" size="sm" className="mt-3">
            <Wrench className="h-4 w-4 mr-2" />
            Resolver Desvíos
          </Button>
        </AlertDescription>
      </Alert>

      {showModal && (
        <CriticalDeviationsRepairModal
          isOpen={showModal}
          onClose={handleCloseModal}
          onComplete={handleCloseModal}
          deviations={deviations.map((d) => ({
            id: d.id,
            item_code: d.item_code,
            item_label: d.item_label,
            section_code: d.section_code,
            created_at: d.created_at?.toISOString() ?? new Date().toISOString(),
          }))}
          equipmentId={equipmentId}
        />
      )}
    </>
  );
}
