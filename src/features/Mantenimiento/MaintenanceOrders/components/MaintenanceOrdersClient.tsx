'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { useMemo, useState } from 'react';
import type { MaintenanceOrderData, MaintenanceOrdersData } from '../actions/actionsServer';
import { useMaintenanceOrders } from '../hooks/useMaintenanceOrders';
import { OrderDetailDialog } from './OrderDetailDialog';
import { getMaintenanceOrdersColumns } from './columns';

interface MaintenanceOrdersClientProps {
  initialData: MaintenanceOrdersData;
  readOnly?: boolean;
}

type StatusFilter =
  | 'in_workshop'
  | 'pending_workshop_validation'
  | 'pending_operations_validation'
  | 'completed'
  | 'all';

export function MaintenanceOrdersClient({ initialData, readOnly = false }: MaintenanceOrdersClientProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('in_workshop');
  const { data: orders } = useMaintenanceOrders(initialData, statusFilter);
  const [selectedOrder, setSelectedOrder] = useState<MaintenanceOrderData | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleViewDetail = (order: MaintenanceOrderData) => {
    setSelectedOrder(order);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedOrder(null);
  };

  const columns = useMemo(() => getMaintenanceOrdersColumns({ onViewDetail: handleViewDetail }), []);

  const equipmentOptions = useMemo(() => {
    const map = new Map<string, string>();
    (orders || []).forEach((order) => {
      const domain = order.vehicles?.domain || order.vehicles?.serie;
      if (domain) map.set(domain, domain);
    });
    return Array.from(map.values()).map((v) => ({ label: v, value: v }));
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'all') return orders || [];
    return (orders || []).filter((order) => order.status === statusFilter);
  }, [orders, statusFilter]);

  return (
    <div className="space-y-4">
      <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
        <TabsList>
          <TabsTrigger value="in_workshop">En Taller</TabsTrigger>
          <TabsTrigger value="pending_workshop_validation">Pend. Validación Taller</TabsTrigger>
          <TabsTrigger value="pending_operations_validation">Pend. Validación Operaciones</TabsTrigger>
          <TabsTrigger value="completed">Completadas</TabsTrigger>
          <TabsTrigger value="all">Todas</TabsTrigger>
        </TabsList>
      </Tabs>

      <BaseDataTable
        columns={columns}
        data={filteredOrders}
        tableId="ordenes-mantenimiento-table"
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

      <OrderDetailDialog order={selectedOrder} open={dialogOpen} onClose={handleCloseDialog} readOnly={readOnly} />
    </div>
  );
}
