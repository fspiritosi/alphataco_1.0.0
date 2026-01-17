'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { useMemo, useState } from 'react';
import type { MaintenanceOperationData } from '../actions/actionsServer';
import { useMaintenanceOperations } from '../hooks/useMaintenanceOperations';
import { AprobarEntradaTallerDialog } from './AprobarEntradaTallerDialog';
import { OperacionDetailDialog } from './OperacionDetailDialog';
import { RechazarOperacionDialog } from './RechazarOperacionDialog';
import { getColumns } from './columns';

const STATUS_OPTIONS = [
  { label: 'Planificado', value: 'scheduled' },
  { label: 'En Taller', value: 'in_workshop' },
];

export function OperacionesTable() {
  const [selectedOperation, setSelectedOperation] = useState<MaintenanceOperationData | null>(null);
  const [dialogType, setDialogType] = useState<'view' | 'approve' | 'reject' | null>(null);

  const { data: operations, isLoading, error } = useMaintenanceOperations();

  // Generar opciones de equipos dinámicamente desde los datos
  const equipmentOptions = useMemo(() => {
    if (!operations) return [];
    const uniqueEquipments = new Map<string, { label: string; value: string }>();
    operations.forEach((op) => {
      const vehicle = op.vehicles;
      if (vehicle) {
        const label = vehicle.domain || vehicle.serie || 'Sin identificar';
        const displayLabel = vehicle.intern_number ? `${label} (#${vehicle.intern_number})` : label;
        uniqueEquipments.set(vehicle.id, { label: displayLabel, value: label });
      }
    });
    return Array.from(uniqueEquipments.values());
  }, [operations]);

  const handleView = (operation: MaintenanceOperationData) => {
    setSelectedOperation(operation);
    setDialogType('view');
  };

  const handleApprove = (operation: MaintenanceOperationData) => {
    setSelectedOperation(operation);
    setDialogType('approve');
  };

  const handleReject = (operation: MaintenanceOperationData) => {
    setSelectedOperation(operation);
    setDialogType('reject');
  };

  const handleCloseDialog = () => {
    setSelectedOperation(null);
    setDialogType(null);
  };

  const columns = useMemo(
    () =>
      getColumns({
        onView: handleView,
        onApprove: handleApprove,
        onReject: handleReject,
      }),
    []
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Operaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-64 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Operaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500">Error al cargar las operaciones: {error.message}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Operaciones Pendientes de Ejecutar</CardTitle>
        </CardHeader>
        <CardContent>
          <BaseDataTable
            columns={columns}
            data={operations || []}
            tableId="operaciones-mantenimiento-table"
            savedVisibility={{}}
            toolbarOptions={{
              initialVisibleFilters: ['Equipo'],
              filterableColumns: [
                {
                  columnId: 'Equipo',
                  title: 'Equipo',
                  options: equipmentOptions,
                },
                {
                  columnId: 'Estado',
                  title: 'Estado',
                  options: STATUS_OPTIONS,
                },
              ],
              showViewOptions: true,
            }}
          />
        </CardContent>
      </Card>

      {selectedOperation && dialogType === 'view' && (
        <OperacionDetailDialog operation={selectedOperation} open={true} onClose={handleCloseDialog} />
      )}

      {selectedOperation && dialogType === 'approve' && (
        <AprobarEntradaTallerDialog operation={selectedOperation} open={true} onClose={handleCloseDialog} />
      )}

      {selectedOperation && dialogType === 'reject' && (
        <RechazarOperacionDialog operation={selectedOperation} open={true} onClose={handleCloseDialog} />
      )}
    </>
  );
}
