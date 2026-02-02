'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ActivityHistoryModal } from '@/features/Mantenimiento/components/ActivityHistoryModal';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { useMemo, useState } from 'react';
import type { MaintenanceOperationData } from '../actions/actionsServer';
import { useMaintenanceOperations } from '../hooks/useMaintenanceOperations';
import { OperacionDetailDialog } from './OperacionDetailDialog';
import { getReadonlyColumns } from './columnsReadonly';

const STATUS_OPTIONS = [
  { label: 'Planificado', value: 'scheduled' },
  { label: 'En Taller', value: 'in_workshop' },
  { label: 'Completado', value: 'completed' },
  { label: 'Rechazado', value: 'rejected' },
];

export function OperacionesPlanificadasTable() {
  const [selectedOperation, setSelectedOperation] = useState<MaintenanceOperationData | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [historyOperation, setHistoryOperation] = useState<MaintenanceOperationData | null>(null);

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
    setShowDetail(true);
  };

  const handleCloseDialog = () => {
    setSelectedOperation(null);
    setShowDetail(false);
  };

  const handleViewHistory = (operation: MaintenanceOperationData) => {
    setHistoryOperation(operation);
  };

  const handleCloseHistory = () => {
    setHistoryOperation(null);
  };

  const columns = useMemo(
    () =>
      getReadonlyColumns({
        onView: handleView,
        onViewHistory: handleViewHistory,
      }),
    []
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Operaciones Planificadas</CardTitle>
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
          <CardTitle>Operaciones Planificadas</CardTitle>
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
          <CardTitle>Operaciones Planificadas (Solo Vista)</CardTitle>
          <CardDescription>Vista de solo lectura de las operaciones planificadas</CardDescription>
        </CardHeader>
        <CardContent>
          <BaseDataTable
            columns={columns}
            data={operations || []}
            tableId="operaciones-planificadas-table"
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

      {selectedOperation && showDetail && (
        <OperacionDetailDialog operation={selectedOperation} open={true} onClose={handleCloseDialog} />
      )}

      <ActivityHistoryModal
        open={!!historyOperation}
        onClose={handleCloseHistory}
        maintenanceOrderId={historyOperation?.id}
        maintenanceRequestId={historyOperation?.maintenance_requests?.id}
        title="Historial del Pedido"
      />
    </>
  );
}
