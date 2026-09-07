'use client';

import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { useMemo, useState } from 'react';
import { getResourceLabel } from '../../shared/maintenance-resource';
import type { ExternalWorkshop, OrderManagementData, WorkshopSector } from '../actions/actionsServer';
import { useOrderManagement } from '../hooks/useOrderManagement';
import { ManageOrderWizard } from './ManageOrderWizard';
import { getOrderManagementColumns } from './columns';

interface OrderManagementClientProps {
  initialData: OrderManagementData;
  sectors: WorkshopSector[];
  repairTypes: Array<{ id: string; name: string }>;
  externalWorkshops: ExternalWorkshop[];
}

export function OrderManagementClient({
  initialData,
  sectors,
  repairTypes,
  externalWorkshops,
}: OrderManagementClientProps) {
  const { data: orders } = useOrderManagement(initialData);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Derivar selectedOrder desde orders para que siempre tenga datos frescos
  const selectedOrder = useMemo(() => {
    if (!selectedOrderId || !orders) return null;
    return orders.find((o) => o.id === selectedOrderId) ?? null;
  }, [selectedOrderId, orders]);

  const handleManage = (order: OrderManagementData[number]) => {
    setSelectedOrderId(order.id);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedOrderId(null);
  };

  const columns = useMemo(() => getOrderManagementColumns({ onManage: handleManage }), []);

  // Dynamic filter options
  const equipmentOptions = useMemo(() => {
    const map = new Map<string, string>();
    (orders || []).forEach((order) => {
      // Ticket 596: sin esto los equipamientos quedaban fuera del filtro de equipo
      const label = getResourceLabel(order);
      if (label && label !== 'Sin identificar') map.set(label, label);
    });
    return Array.from(map.values()).map((v) => ({ label: v, value: v }));
  }, [orders]);

  return (
    <>
      <BaseDataTable
        columns={columns}
        data={orders || []}
        tableId="order-management-table"
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

      <ManageOrderWizard
        order={selectedOrder}
        open={dialogOpen}
        onClose={handleCloseDialog}
        sectors={sectors}
        repairTypes={repairTypes}
        externalWorkshops={externalWorkshops}
      />
    </>
  );
}
