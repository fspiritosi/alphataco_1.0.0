'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  getMaintenanceOperations,
  type MaintenanceOperationData,
  type MaintenanceOperationsData,
} from '../actions/actionsServer';
import { MAINTENANCE_OPERATIONS_QUERY_KEY } from '../hooks/useMaintenanceOperations';
import { OperacionDetailDialog } from './OperacionDetailDialog';
import { getReadonlyColumns } from './columnsReadonly';

const STATUS_OPTIONS = [
  { label: 'Planificado', value: 'scheduled' },
  { label: 'En Taller', value: 'in_workshop' },
  { label: 'Completado', value: 'completed' },
  { label: 'Rechazado', value: 'rejected' },
];

interface OperacionesPlanificadasTableClientProps {
  initialData: MaintenanceOperationsData;
}

export function OperacionesPlanificadasTableClient({ initialData }: OperacionesPlanificadasTableClientProps) {
  const [selectedOperation, setSelectedOperation] = useState<MaintenanceOperationData | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // useQuery con initialData para refetching/invalidacion
  const { data: operations } = useQuery({
    queryKey: MAINTENANCE_OPERATIONS_QUERY_KEY,
    queryFn: () => getMaintenanceOperations(),
    initialData,
  });

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

  const columns = useMemo(
    () =>
      getReadonlyColumns({
        onView: handleView,
      }),
    []
  );

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
    </>
  );
}
