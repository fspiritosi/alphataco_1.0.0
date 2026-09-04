'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  getOrderForManagement,
  type ExternalWorkshop,
  type OrderManagementItem,
  type WorkshopSector,
} from '@/features/Mantenimiento/OrderManagement/actions/actionsServer';
import { ManageOrderWizard } from '@/features/Mantenimiento/OrderManagement/components/ManageOrderWizard';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { getResourceLabel } from '../../shared/maintenance-resource';
import type { MaintenanceOrderData, MaintenanceOrdersData } from '../actions/actionsServer';
import { useMaintenanceOrders } from '../hooks/useMaintenanceOrders';
import { OrderDetailDialog } from './OrderDetailDialog';
import { getMaintenanceOrdersColumns } from './columns';

interface MaintenanceOrdersClientProps {
  initialData: MaintenanceOrdersData;
  sectors: WorkshopSector[];
  repairTypes: Array<{ id: string; name: string }>;
  externalWorkshops: ExternalWorkshop[];
}

type StatusFilter =
  | 'in_workshop'
  | 'pending_workshop_validation'
  | 'pending_operations_validation'
  | 'operations_rejected'
  | 'workshop_rejected'
  | 'completed'
  | 'all';

export function MaintenanceOrdersClient({
  initialData,
  sectors,
  repairTypes,
  externalWorkshops,
}: MaintenanceOrdersClientProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('in_workshop');
  // Map 'all' to undefined so server returns all relevant statuses (default behavior)
  const serverFilter = statusFilter === 'all' ? undefined : statusFilter;
  const { data: orders } = useMaintenanceOrders(statusFilter === 'in_workshop' ? initialData : undefined, serverFilter);

  // Detail dialog state
  const [selectedOrder, setSelectedOrder] = useState<MaintenanceOrderData | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // Manage dialog state
  const [manageOrder, setManageOrder] = useState<OrderManagementItem | null>(null);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [loadingManageOrder, setLoadingManageOrder] = useState(false);

  const handleViewDetail = useCallback((order: MaintenanceOrderData) => {
    setSelectedOrder(order);
    setDetailDialogOpen(true);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailDialogOpen(false);
    setSelectedOrder(null);
  }, []);

  const handleManageOrder = useCallback(async (order: MaintenanceOrderData) => {
    setLoadingManageOrder(true);
    try {
      const detailedOrder = await getOrderForManagement(order.id);
      setManageOrder(detailedOrder);
      setManageDialogOpen(true);
    } catch {
      toast.error('Error al cargar los datos de gestión');
    } finally {
      setLoadingManageOrder(false);
    }
  }, []);

  const handleCloseManage = useCallback(() => {
    setManageDialogOpen(false);
    setManageOrder(null);
  }, []);

  const columns = useMemo(
    () =>
      getMaintenanceOrdersColumns({
        onViewDetail: handleViewDetail,
        onManageOrder: handleManageOrder,
      }),
    [handleViewDetail, handleManageOrder]
  );

  const equipmentOptions = useMemo(() => {
    const map = new Map<string, string>();
    (orders || []).forEach((order) => {
      // Ticket 596: sin esto los equipamientos quedaban fuera del filtro de equipo
      const label = getResourceLabel(order);
      if (label && label !== 'Sin identificar') map.set(label, label);
    });
    return Array.from(map.values()).map((v) => ({ label: v, value: v }));
  }, [orders]);

  // Server already filters by status, no need for client-side double filtering
  const filteredOrders = orders || [];

  return (
    <div className="space-y-4">
      <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
        <TabsList>
          <TabsTrigger value="in_workshop">En Taller</TabsTrigger>
          <TabsTrigger value="pending_workshop_validation">Pend. Validación Taller</TabsTrigger>
          <TabsTrigger value="pending_operations_validation">Pend. Validación Operaciones</TabsTrigger>
          <TabsTrigger value="operations_rejected">Rechazada por Ops</TabsTrigger>
          <TabsTrigger value="workshop_rejected">Rechazada por Taller</TabsTrigger>
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

      {/* Loading overlay para carga de datos de gestión */}
      {loadingManageOrder && (
        <div className="fixed inset-0 bg-background/50 flex items-center justify-center z-50">
          <div className="bg-card p-4 rounded-lg shadow-lg flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm">Cargando datos de gestión...</span>
          </div>
        </div>
      )}

      {/* Dialog de detalle (para estados no in_workshop) */}
      <OrderDetailDialog order={selectedOrder} open={detailDialogOpen} onClose={handleCloseDetail} context="workshop" />

      {/* Wizard de gestión (para in_workshop) */}
      <ManageOrderWizard
        order={manageOrder}
        open={manageDialogOpen}
        onClose={handleCloseManage}
        sectors={sectors}
        repairTypes={repairTypes}
        externalWorkshops={externalWorkshops}
      />
    </div>
  );
}
