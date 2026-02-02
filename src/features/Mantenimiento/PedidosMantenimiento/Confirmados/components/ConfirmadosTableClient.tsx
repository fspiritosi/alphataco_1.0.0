'use client';

import { Card } from '@/components/ui/card';
import { ActivityHistoryModal } from '@/features/Mantenimiento/components/ActivityHistoryModal';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  getMaintenanceOrdersConfirmed,
  type MaintenanceOrderData,
  type MaintenanceOrdersConfirmedData,
} from '../../actions/actionsServer';
import { EntradaTallerDialog } from '../../components/EntradaTallerDialog';
import { PedidoDetailDialog } from '../../components/PedidoDetailDialog';
import { getColumnsConfirmados } from './columns';

export const PEDIDOS_CONFIRMADOS_QUERY_KEY = ['maintenance', 'pedidos', 'confirmados'];

interface ConfirmadosTableClientProps {
  initialData: MaintenanceOrdersConfirmedData;
}

export function ConfirmadosTableClient({ initialData }: ConfirmadosTableClientProps) {
  const [selectedOrder, setSelectedOrder] = useState<MaintenanceOrderData | null>(null);
  const [dialogType, setDialogType] = useState<'view' | 'workshop_entry' | null>(null);
  const [historyOrder, setHistoryOrder] = useState<MaintenanceOrderData | null>(null);

  const { data: orders } = useQuery({
    queryKey: PEDIDOS_CONFIRMADOS_QUERY_KEY,
    queryFn: () => getMaintenanceOrdersConfirmed(),
    initialData,
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

  const handleApproveWorkshopEntry = (order: MaintenanceOrderData) => {
    setSelectedOrder(order);
    setDialogType('workshop_entry');
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
      getColumnsConfirmados({
        onView: handleView,
        onApproveWorkshopEntry: handleApproveWorkshopEntry,
        onViewHistory: handleViewHistory,
      }),
    []
  );

  return (
    <Card className="p-4">
      <BaseDataTable
        columns={columns}
        data={orders || []}
        tableId="pedidos-confirmados-table"
        savedVisibility={{}}
        toolbarOptions={{
          initialVisibleFilters: ['Equipo'],
          filterableColumns: [
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

      {selectedOrder && dialogType === 'workshop_entry' && (
        <EntradaTallerDialog order={selectedOrder} open={true} onClose={handleCloseDialog} />
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
