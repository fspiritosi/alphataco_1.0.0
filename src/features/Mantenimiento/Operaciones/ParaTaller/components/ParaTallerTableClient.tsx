'use client';

import { Card } from '@/components/ui/card';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  getOrdersForWorkshop,
  type OrderForWorkshopData,
  type OrdersForWorkshopData,
} from '../../actions/actionsServer';
import { ParaTallerDetailDialog } from './ParaTallerDetailDialog';
import { ParaTallerEntradaDialog } from './ParaTallerEntradaDialog';
import { getColumnsParaTaller } from './columns';

export const PARA_TALLER_QUERY_KEY = ['maintenance', 'operaciones', 'para-taller'];

interface ParaTallerTableClientProps {
  initialData: OrdersForWorkshopData;
}

export function ParaTallerTableClient({ initialData }: ParaTallerTableClientProps) {
  const [selectedOrder, setSelectedOrder] = useState<OrderForWorkshopData | null>(null);
  const [dialogType, setDialogType] = useState<'view' | 'workshop_entry' | null>(null);

  const { data: orders } = useQuery({
    queryKey: PARA_TALLER_QUERY_KEY,
    queryFn: () => getOrdersForWorkshop(),
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

  const handleView = (order: OrderForWorkshopData) => {
    setSelectedOrder(order);
    setDialogType('view');
  };

  const handleApproveWorkshopEntry = (order: OrderForWorkshopData) => {
    setSelectedOrder(order);
    setDialogType('workshop_entry');
  };

  const handleCloseDialog = () => {
    setSelectedOrder(null);
    setDialogType(null);
  };

  const columns = useMemo(
    () =>
      getColumnsParaTaller({
        onView: handleView,
        onApproveWorkshopEntry: handleApproveWorkshopEntry,
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

      {selectedOrder && dialogType === 'view' && (
        <ParaTallerDetailDialog order={selectedOrder} open={true} onClose={handleCloseDialog} />
      )}

      {selectedOrder && dialogType === 'workshop_entry' && (
        <ParaTallerEntradaDialog order={selectedOrder} open={true} onClose={handleCloseDialog} />
      )}
    </Card>
  );
}
