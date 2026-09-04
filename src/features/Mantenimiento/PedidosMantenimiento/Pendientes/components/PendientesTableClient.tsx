'use client';

import { Card } from '@/components/ui/card';
import { ActivityHistoryModal } from '@/features/Mantenimiento/components/ActivityHistoryModal';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  getMaintenanceOrdersPending,
  type MaintenanceOrderData,
  type MaintenanceOrdersPendingData,
} from '../../actions/actionsServer';
import { PedidoDetailDialog } from '../../components/PedidoDetailDialog';
import { PlanificarPedidoDialog } from '../../components/PlanificarPedidoDialog';
import { PEDIDOS_PENDIENTES_QUERY_KEY } from '../../hooks/useMaintenanceOrders';
import { getColumnsPendientes } from './columns';

const STATUS_OPTIONS = [{ label: 'Pendiente Planificar', value: 'pending_scheduling' }];

interface PendientesTableClientProps {
  initialData: MaintenanceOrdersPendingData;
}

export function PendientesTableClient({ initialData }: PendientesTableClientProps) {
  const [selectedOrder, setSelectedOrder] = useState<MaintenanceOrderData | null>(null);
  const [dialogType, setDialogType] = useState<'view' | 'schedule' | null>(null);
  const [historyOrder, setHistoryOrder] = useState<MaintenanceOrderData | null>(null);

  const { data: orders } = useQuery({
    queryKey: PEDIDOS_PENDIENTES_QUERY_KEY,
    queryFn: () => getMaintenanceOrdersPending(),
    initialData,
    staleTime: 0,
  });

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

  const handleView = (order: MaintenanceOrderData) => {
    setSelectedOrder(order);
    setDialogType('view');
  };

  const handleSchedule = (order: MaintenanceOrderData) => {
    setSelectedOrder(order);
    setDialogType('schedule');
  };

  const handleCloseDialog = () => {
    setSelectedOrder(null);
    setDialogType(null);
  };

  const handleViewHistory = (order: MaintenanceOrderData) => {
    setHistoryOrder(order);
  };

  const handleCloseHistory = () => {
    setHistoryOrder(null);
  };

  const columns = useMemo(
    () =>
      getColumnsPendientes({
        onView: handleView,
        onSchedule: handleSchedule,
        onViewHistory: handleViewHistory,
      }),
    []
  );

  return (
    <Card className="p-4">
      <BaseDataTable
        columns={columns}
        data={orders || []}
        tableId="pedidos-pendientes-table"
        savedVisibility={{}}
        toolbarOptions={{
          initialVisibleFilters: ['Estado', 'Equipo'],
          filterableColumns: [
            {
              columnId: 'Estado',
              title: 'Estado',
              options: STATUS_OPTIONS,
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
        <PedidoDetailDialog order={selectedOrder} open={true} onClose={handleCloseDialog} />
      )}

      {selectedOrder && dialogType === 'schedule' && (
        <PlanificarPedidoDialog order={selectedOrder} open={true} onClose={handleCloseDialog} />
      )}

      <ActivityHistoryModal
        open={!!historyOrder}
        onClose={handleCloseHistory}
        maintenanceOrderId={historyOrder?.id}
        maintenanceRequestId={historyOrder?.maintenance_requests?.id}
        title="Historial del Pedido"
      />
    </Card>
  );
}
