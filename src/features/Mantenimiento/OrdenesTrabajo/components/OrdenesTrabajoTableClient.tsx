'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Clock, Loader2, Play } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { completeWorkOrder, startWorkOrder } from '../actions/actionsServer';
import { ORDENES_TRABAJO_QUERY_KEY, useOrdenesTrabajo } from '../hooks/useOrdenesTrabajo';
import type { WorkOrderRowData } from '../types';
import { OrdenDetalleDialog } from './OrdenDetalleDialog';
import { getColumns } from './columns';

export function OrdenesTrabajoTableClient() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>('pending');
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrderRowData | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // Queries por estado
  const { data: pendingOrders, isLoading: loadingPending } = useOrdenesTrabajo('pending');
  const { data: inProgressOrders, isLoading: loadingInProgress } = useOrdenesTrabajo('in_progress');
  const { data: completedOrders, isLoading: loadingCompleted } = useOrdenesTrabajo('completed');

  const handleViewDetail = (workOrder: WorkOrderRowData) => {
    setSelectedWorkOrder(workOrder);
    setDetailDialogOpen(true);
  };

  const handleStart = async (workOrder: WorkOrderRowData) => {
    try {
      await startWorkOrder(workOrder.id);
      toast.success('Orden de trabajo iniciada');
      queryClient.invalidateQueries({ queryKey: ORDENES_TRABAJO_QUERY_KEY });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al iniciar orden');
    }
  };

  const handleComplete = async (workOrder: WorkOrderRowData) => {
    try {
      await completeWorkOrder(workOrder.id);
      toast.success('Orden de trabajo completada');
      queryClient.invalidateQueries({ queryKey: ORDENES_TRABAJO_QUERY_KEY });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al completar orden');
    }
  };

  const columns = getColumns({
    onViewDetail: handleViewDetail,
    onStart: handleStart,
    onComplete: handleComplete,
  });

  const renderTable = (data: WorkOrderRowData[] | undefined, isLoading: boolean) => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    return (
      <BaseDataTable
        columns={columns}
        data={data || []}
        tableId="ordenes-trabajo-table"
        savedVisibility={{}}
        toolbarOptions={{
          initialVisibleFilters: [],
          searchableColumns: [{ columnId: 'NroOrden', placeholder: 'Buscar por número de orden...' }],
        }}
      />
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Órdenes de Trabajo</CardTitle>
          <CardDescription>Gestión de órdenes de trabajo asignadas a talleres</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pendientes
                {pendingOrders && pendingOrders.length > 0 && (
                  <span className="ml-1 px-2 py-0.5 text-xs bg-secondary rounded-full">{pendingOrders.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="in_progress" className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                En Proceso
                {inProgressOrders && inProgressOrders.length > 0 && (
                  <span className="ml-1 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded-full">
                    {inProgressOrders.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Completadas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending">{renderTable(pendingOrders, loadingPending)}</TabsContent>

            <TabsContent value="in_progress">{renderTable(inProgressOrders, loadingInProgress)}</TabsContent>

            <TabsContent value="completed">{renderTable(completedOrders, loadingCompleted)}</TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialog de detalle */}
      <OrdenDetalleDialog
        workOrder={selectedWorkOrder}
        open={detailDialogOpen}
        onClose={() => {
          setDetailDialogOpen(false);
          setSelectedWorkOrder(null);
        }}
      />
    </>
  );
}
