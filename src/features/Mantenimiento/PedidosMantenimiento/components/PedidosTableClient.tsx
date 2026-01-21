'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { getMaintenanceOrders, type MaintenanceOrderData, type MaintenanceOrdersData } from '../actions/actionsServer';
import { MAINTENANCE_ORDERS_QUERY_KEY } from '../hooks/useMaintenanceOrders';
import { EntradaTallerDialog } from './EntradaTallerDialog';
import { PedidoDetailDialog } from './PedidoDetailDialog';
import { PlanificarPedidoDialog } from './PlanificarPedidoDialog';
import { getColumns } from './columns';

const STATUS_OPTIONS = [
  { label: 'Pendiente Planificar', value: 'pending_scheduling' },
  { label: 'Fecha Confirmada', value: 'date_confirmed' },
];

interface PedidosTableClientProps {
  initialData: MaintenanceOrdersData;
}

export function PedidosTableClient({ initialData }: PedidosTableClientProps) {
  const [selectedOrder, setSelectedOrder] = useState<MaintenanceOrderData | null>(null);
  const [dialogType, setDialogType] = useState<'view' | 'schedule' | 'workshop_entry' | null>(null);

  // useQuery con initialData para refetching/invalidacion
  const { data: orders } = useQuery({
    queryKey: MAINTENANCE_ORDERS_QUERY_KEY,
    queryFn: () => getMaintenanceOrders(),
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

  const handleView = (order: MaintenanceOrderData) => {
    setSelectedOrder(order);
    setDialogType('view');
  };

  const handleSchedule = (order: MaintenanceOrderData) => {
    setSelectedOrder(order);
    setDialogType('schedule');
  };

  const handleApproveWorkshopEntry = (order: MaintenanceOrderData) => {
    setSelectedOrder(order);
    setDialogType('workshop_entry');
  };

  const handleCloseDialog = () => {
    setSelectedOrder(null);
    setDialogType(null);
  };

  const columns = useMemo(
    () =>
      getColumns({
        onView: handleView,
        onSchedule: handleSchedule,
        onApproveWorkshopEntry: handleApproveWorkshopEntry,
      }),
    []
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Pedidos de Mantenimiento</CardTitle>
        </CardHeader>
        <CardContent>
          <BaseDataTable
            columns={columns}
            data={orders || []}
            tableId="pedidos-mantenimiento-table"
            savedVisibility={{}}
            toolbarOptions={{
              initialVisibleFilters: ['Estado', 'Equipo'],
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

      {selectedOrder && dialogType === 'view' && (
        <PedidoDetailDialog order={selectedOrder} open={true} onClose={handleCloseDialog} />
      )}

      {selectedOrder && dialogType === 'schedule' && (
        <PlanificarPedidoDialog order={selectedOrder} open={true} onClose={handleCloseDialog} />
      )}

      {selectedOrder && dialogType === 'workshop_entry' && (
        <EntradaTallerDialog order={selectedOrder} open={true} onClose={handleCloseDialog} />
      )}
    </>
  );
}
