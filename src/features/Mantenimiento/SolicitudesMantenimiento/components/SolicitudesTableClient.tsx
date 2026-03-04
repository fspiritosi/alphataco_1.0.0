'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ActivityHistoryModal } from '@/features/Mantenimiento/components/ActivityHistoryModal';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  getMaintenanceRequests,
  type MaintenanceRequestData,
  type MaintenanceRequestsData,
} from '../actions/actionsServer';
import { MAINTENANCE_REQUESTS_QUERY_KEY } from '../hooks/useMaintenanceRequests';
import { ReassignSupervisorDialog } from './ReassignSupervisorDialog';
import { SolicitudApprovalDialog } from './SolicitudApprovalDialog';
import { SolicitudDetailDialog } from './SolicitudDetailDialog';
import { SolicitudRejectDialog } from './SolicitudRejectDialog';
import { getColumns } from './columns';

const STATUS_OPTIONS = [
  { label: 'Pendiente', value: 'pending_approval' },
  { label: 'Aprobada', value: 'approved' },
  { label: 'Rechazada', value: 'rejected' },
];

interface SolicitudesTableClientProps {
  initialData: MaintenanceRequestsData;
}

export function SolicitudesTableClient({ initialData }: SolicitudesTableClientProps) {
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequestData | null>(null);
  const [dialogType, setDialogType] = useState<'view' | 'approve' | 'reject' | null>(null);
  const [historyRequestId, setHistoryRequestId] = useState<string | null>(null);
  const [reassignRequest, setReassignRequest] = useState<MaintenanceRequestData | null>(null);
  const [showReassignDialog, setShowReassignDialog] = useState(false);

  // useQuery con initialData para refetching/invalidacion
  const { data: requests } = useQuery({
    queryKey: MAINTENANCE_REQUESTS_QUERY_KEY,
    queryFn: () => getMaintenanceRequests(),
    initialData,
  });

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

  const handleReassign = (request: MaintenanceRequestData) => {
    setReassignRequest(request);
    setShowReassignDialog(true);
  };

  const columns = useMemo(
    () =>
      getColumns({
        onView: handleView,
        onApprove: handleApprove,
        onReject: handleReject,
        onViewHistory: handleViewHistory,
        onReassign: handleReassign,
      }),
    []
  );

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

      {reassignRequest && (
        <ReassignSupervisorDialog
          request={reassignRequest}
          open={showReassignDialog}
          onOpenChange={(open) => {
            setShowReassignDialog(open);
            if (!open) setReassignRequest(null);
          }}
        />
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
