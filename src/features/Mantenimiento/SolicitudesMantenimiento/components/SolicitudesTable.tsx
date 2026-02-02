'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ActivityHistoryModal } from '@/features/Mantenimiento/components/ActivityHistoryModal';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { useMemo, useState } from 'react';
import type { MaintenanceRequestData } from '../actions/actionsServer';
import { useMaintenanceRequests } from '../hooks/useMaintenanceRequests';
import { SolicitudApprovalDialog } from './SolicitudApprovalDialog';
import { SolicitudDetailDialog } from './SolicitudDetailDialog';
import { SolicitudRejectDialog } from './SolicitudRejectDialog';
import { getColumns } from './columns';

const STATUS_OPTIONS = [
  { label: 'Pendiente', value: 'pending_approval' },
  { label: 'Aprobada', value: 'approved' },
  { label: 'Rechazada', value: 'rejected' },
];

export function SolicitudesTable() {
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequestData | null>(null);
  const [dialogType, setDialogType] = useState<'view' | 'approve' | 'reject' | null>(null);
  const [historyRequestId, setHistoryRequestId] = useState<string | null>(null);

  const { data: requests, isLoading, error } = useMaintenanceRequests();

  // Generar opciones de equipos dinámicamente desde los datos
  const equipmentOptions = useMemo(() => {
    if (!requests) return [];
    const uniqueEquipments = new Map<string, { label: string; value: string }>();
    requests.forEach((req) => {
      const vehicle = req.vehicles;
      if (vehicle) {
        const label = vehicle.domain || vehicle.serie || 'Sin identificar';
        const displayLabel = vehicle.intern_number ? `${label} (#${vehicle.intern_number})` : label;
        uniqueEquipments.set(vehicle.id, { label: displayLabel, value: label });
      }
    });
    return Array.from(uniqueEquipments.values());
  }, [requests]);

  const handleView = (request: MaintenanceRequestData) => {
    setSelectedRequest(request);
    setDialogType('view');
  };

  const handleApprove = (request: MaintenanceRequestData) => {
    setSelectedRequest(request);
    setDialogType('approve');
  };

  const handleReject = (request: MaintenanceRequestData) => {
    setSelectedRequest(request);
    setDialogType('reject');
  };

  const handleCloseDialog = () => {
    setSelectedRequest(null);
    setDialogType(null);
  };

  const handleViewHistory = (request: MaintenanceRequestData) => {
    setHistoryRequestId(request.id);
  };

  const handleCloseHistory = () => {
    setHistoryRequestId(null);
  };

  const columns = useMemo(
    () =>
      getColumns({
        onView: handleView,
        onApprove: handleApprove,
        onReject: handleReject,
        onViewHistory: handleViewHistory,
      }),
    []
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Solicitudes de Mantenimiento</CardTitle>
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
          <CardTitle>Solicitudes de Mantenimiento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500">Error al cargar las solicitudes: {error.message}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Solicitudes de Mantenimiento</CardTitle>
        </CardHeader>
        <CardContent>
          <BaseDataTable
            columns={columns}
            data={requests || []}
            tableId="solicitudes-mantenimiento-table"
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

      {selectedRequest && dialogType === 'view' && (
        <SolicitudDetailDialog request={selectedRequest} open={true} onClose={handleCloseDialog} />
      )}

      {selectedRequest && dialogType === 'approve' && (
        <SolicitudApprovalDialog request={selectedRequest} open={true} onClose={handleCloseDialog} />
      )}

      {selectedRequest && dialogType === 'reject' && (
        <SolicitudRejectDialog request={selectedRequest} open={true} onClose={handleCloseDialog} />
      )}

      <ActivityHistoryModal
        open={!!historyRequestId}
        onClose={handleCloseHistory}
        maintenanceRequestId={historyRequestId}
        title="Historial de la Solicitud"
      />
    </>
  );
}
