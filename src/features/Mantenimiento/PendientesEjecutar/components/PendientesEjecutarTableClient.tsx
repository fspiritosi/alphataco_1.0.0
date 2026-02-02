'use client';

import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  getMaintenanceOrdersPendingApproval,
  type MaintenanceOrderPendingApprovalData,
  type MaintenanceOrdersPendingApprovalData,
} from '../../actions/actionsServer';
import { PENDIENTES_EJECUTAR_QUERY_KEY } from '../hooks/usePendientesEjecutar';
import { AprobarFechaDialog } from './AprobarFechaDialog';
import { PendienteDetailDialog } from './PendienteDetailDialog';
import { RechazarFechaDialog } from './RechazarFechaDialog';
import { getColumns } from './columns';

interface PendientesEjecutarTableClientProps {
  initialData: MaintenanceOrdersPendingApprovalData;
}

export function PendientesEjecutarTableClient({ initialData }: PendientesEjecutarTableClientProps) {
  const [selectedOrder, setSelectedOrder] = useState<MaintenanceOrderPendingApprovalData | null>(null);
  const [dialogType, setDialogType] = useState<'view' | 'approve' | 'reject' | null>(null);

  // useQuery con initialData para refetching/invalidacion
  const { data: orders } = useQuery({
    queryKey: PENDIENTES_EJECUTAR_QUERY_KEY,
    queryFn: () => getMaintenanceOrdersPendingApproval(),
    initialData,
  });

  // Generar opciones de equipos dinámicamente desde los datos
  const equipmentOptions = useMemo(() => {
    if (!orders) return [];
    const uniqueEquipments = new Map<string, { label: string; value: string }>();
    orders.forEach((order) => {
      const vehicle = order.vehicles;
      if (vehicle) {
        const label = vehicle.domain || vehicle.serie || 'Sin identificar';
        const displayLabel = vehicle.intern_number ? `${label} (#${vehicle.intern_number})` : label;
        uniqueEquipments.set(vehicle.id, { label: displayLabel, value: label });
      }
    });
    return Array.from(uniqueEquipments.values());
  }, [orders]);

  const handleView = (order: MaintenanceOrderPendingApprovalData) => {
    setSelectedOrder(order);
    setDialogType('view');
  };

  const handleApprove = (order: MaintenanceOrderPendingApprovalData) => {
    setSelectedOrder(order);
    setDialogType('approve');
  };

  const handleReject = (order: MaintenanceOrderPendingApprovalData) => {
    setSelectedOrder(order);
    setDialogType('reject');
  };

  const handleCloseDialog = () => {
    setSelectedOrder(null);
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

  return (
    <>
      <BaseDataTable
        columns={columns}
        data={orders || []}
        tableId="pendientes-ejecutar-table"
        savedVisibility={{}}
        toolbarOptions={{
          initialVisibleFilters: ['Estado', 'Equipo'],
          filterableColumns: [
            {
              columnId: 'Estado',
              title: 'Estado',
              options: [
                { label: 'Pendiente Aprobación', value: 'scheduled' },
                { label: 'Fecha Confirmada', value: 'date_confirmed' },
              ],
            },
            {
              columnId: 'Equipo',
              title: 'Equipo',
              options: equipmentOptions,
            },
          ],
          showViewOptions: true,
        }}
      />

      {selectedOrder && dialogType === 'view' && (
        <PendienteDetailDialog order={selectedOrder} open={true} onClose={handleCloseDialog} />
      )}

      {selectedOrder && dialogType === 'approve' && (
        <AprobarFechaDialog order={selectedOrder} open={true} onClose={handleCloseDialog} />
      )}

      {selectedOrder && dialogType === 'reject' && (
        <RechazarFechaDialog order={selectedOrder} open={true} onClose={handleCloseDialog} />
      )}
    </>
  );
}
