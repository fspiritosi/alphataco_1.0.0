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

  const statusOptions = useMemo(() => {
    const statusMap: Record<string, string> = {
      in_workshop: 'En Taller',
      pending_workshop_validation: 'Pend. Validación Taller',
      pending_operations_validation: 'Pend. Validación Operaciones',
      operations_rejected: 'Rechazada por Ops',
      workshop_rejected: 'Rechazada por Taller',
      completed: 'Completada',
    };
    const found = new Set<string>();
    (orders || []).forEach((order) => {
      if (order.status) found.add(order.status);
    });
    return Array.from(found).map((s) => ({ label: statusMap[s] || s, value: s }));
  }, [orders]);

  return (
    <>
      <BaseDataTable
        columns={columns}
        data={orders || []}
        tableId="seguimiento-taller-table"
        savedVisibility={{}}
        toolbarOptions={{
          initialVisibleFilters: ['Equipo', 'Estado'],
          filterableColumns: [
            {
              columnId: 'Equipo',
              title: 'Equipo',
              options: equipmentOptions,
            },
            {
              columnId: 'Estado',
              title: 'Estado',
              options: statusOptions,
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
        context="operations"
      />
    </>
  );
}
