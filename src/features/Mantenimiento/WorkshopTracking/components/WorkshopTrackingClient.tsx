'use client';

import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { useMemo, useState } from 'react';
import type { MaintenanceOrderData, MaintenanceOrdersData } from '../../MaintenanceOrders/actions/actionsServer';
import { OrderDetailDialog } from '../../MaintenanceOrders/components/OrderDetailDialog';
import { useWorkshopTracking } from '../hooks/useWorkshopTracking';
import { getWorkshopTrackingColumns } from './columns';

interface WorkshopTrackingClientProps {
  initialData: MaintenanceOrdersData;
}

export function WorkshopTrackingClient({ initialData }: WorkshopTrackingClientProps) {
  const { data: orders } = useWorkshopTracking(initialData);
  const [selectedOrder, setSelectedOrder] = useState<MaintenanceOrderData | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleViewDetail = (order: MaintenanceOrderData) => {
    setSelectedOrder(order);
    setDialogOpen(true);
  };

  const columns = useMemo(() => getWorkshopTrackingColumns({ onViewDetail: handleViewDetail }), []);

  const equipmentOptions = useMemo(() => {
    const map = new Map<string, string>();
    (orders || []).forEach((order) => {
      const domain = order.vehicles?.domain || order.vehicles?.serie;
      if (domain) map.set(domain, domain);
    });
    return Array.from(map.values()).map((v) => ({ label: v, value: v }));
  }, [orders]);

  return (
    <>
      <BaseDataTable
        columns={columns}
        data={orders || []}
        tableId="seguimiento-taller-table"
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

      <OrderDetailDialog
        order={selectedOrder}
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setSelectedOrder(null);
        }}
        readOnly={true}
      />
    </>
  );
}
