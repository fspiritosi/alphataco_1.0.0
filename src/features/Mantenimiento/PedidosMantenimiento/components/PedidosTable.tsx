'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { useMemo, useState } from 'react';
import type { MaintenanceOrderData } from '../actions/actionsServer';
import { useMaintenanceOrders } from '../hooks/useMaintenanceOrders';
import { PedidoDetailDialog } from './PedidoDetailDialog';
import { PlanificarPedidoDialog } from './PlanificarPedidoDialog';
import { getColumns } from './columns';

const STATUS_OPTIONS = [
  { label: 'Pendiente Planificar', value: 'pending_scheduling' },
  { label: 'Planificado', value: 'scheduled' },
];

export function PedidosTable() {
  const [selectedOrder, setSelectedOrder] = useState<MaintenanceOrderData | null>(null);
  const [dialogType, setDialogType] = useState<'view' | 'schedule' | null>(null);

  const { data: orders, isLoading, error } = useMaintenanceOrders();

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

  const handleCloseDialog = () => {
    setSelectedOrder(null);
    setDialogType(null);
  };

  const columns = useMemo(
    () =>
      getColumns({
        onView: handleView,
        onSchedule: handleSchedule,
      }),
    []
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pedidos de Mantenimiento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-48" />
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
          <CardTitle>Pedidos de Mantenimiento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500">Error al cargar los pedidos: {error.message}</div>
        </CardContent>
      </Card>
    );
  }

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
    </>
  );
}
