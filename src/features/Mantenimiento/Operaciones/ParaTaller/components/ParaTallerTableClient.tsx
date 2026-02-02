'use client';

import { Card } from '@/components/ui/card';
import { ActivityHistoryModal } from '@/features/Mantenimiento/components/ActivityHistoryModal';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  getOrdersForWorkshop,
  type OrderForWorkshopData,
  type OrdersForWorkshopData,
} from '../../actions/actionsServer';
import { ParaTallerDetailDialog } from './ParaTallerDetailDialog';
import { getColumnsParaTaller } from './columns';

export const PARA_TALLER_QUERY_KEY = ['maintenance', 'operaciones', 'para-taller'];

interface ParaTallerTableClientProps {
  initialData: OrdersForWorkshopData;
}

export function ParaTallerTableClient({ initialData }: ParaTallerTableClientProps) {
  const [selectedOrder, setSelectedOrder] = useState<OrderForWorkshopData | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [historyOrder, setHistoryOrder] = useState<OrderForWorkshopData | null>(null);

  const { data: orders } = useQuery({
    queryKey: PARA_TALLER_QUERY_KEY,
    queryFn: () => getOrdersForWorkshop(),
    initialData,
  });

  const handleViewDetail = (order: OrderForWorkshopData) => {
    setSelectedOrder(order);
    setShowDetail(true);
  };

  const handleCloseDetail = () => {
    setSelectedOrder(null);
    setShowDetail(false);
  };

  const handleViewHistory = (order: OrderForWorkshopData) => {
    setHistoryOrder(order);
  };

  const handleCloseHistory = () => {
    setHistoryOrder(null);
  };

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

  const columns = useMemo(
    () =>
      getColumnsParaTaller({
        onViewDetail: handleViewDetail,
        onViewHistory: handleViewHistory,
      }),
    []
  );

  return (
    <Card className="p-4">
      <BaseDataTable
        columns={columns}
        data={orders || []}
        tableId="operaciones-para-taller-table"
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

      {selectedOrder && showDetail && (
        <ParaTallerDetailDialog order={selectedOrder} open={true} onClose={handleCloseDetail} />
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
