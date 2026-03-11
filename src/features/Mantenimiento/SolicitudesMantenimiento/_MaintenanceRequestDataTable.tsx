'use client';

import { ActivityHistoryModal } from '@/features/Mantenimiento/components/ActivityHistoryModal';
import { DataTable } from '@/shared/components/common/DataTable';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable';
import { useQuery } from '@tanstack/react-query';
import { CircleOff } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import moment from 'moment';
import { useMemo, useState } from 'react';
import {
  getAllMaintenanceRequestsForExport,
  getMaintenanceRequestFacets,
  type MaintenanceRequestFacets,
  type MaintenanceRequestListItem,
} from './actions/actionsTableServer';
import { getMaintenanceRequestById } from './actions/actionsServer';
import { ReassignSupervisorDialog } from './components/ReassignSupervisorDialog';
import { SolicitudApprovalDialog } from './components/SolicitudApprovalDialog';
import { SolicitudDetailDialog } from './components/SolicitudDetailDialog';
import { SolicitudRejectDialog } from './components/SolicitudRejectDialog';
import {
  HIDDEN_COLUMNS_BY_DEFAULT,
  ORDER_STATUS_LABELS,
  REQUEST_STATUS_LABELS,
  SOURCE_LABELS,
  STATUS_ICONS,
  getMaintenanceRequestColumns,
} from './tableColumns';

// Filtros visibles por defecto
const DEFAULT_VISIBLE_FILTERS = ['status', 'vehicle', 'source'];

interface MaintenanceRequestDataTableProps {
  data: MaintenanceRequestListItem[];
  totalRows: number;
  searchParams: DataTableSearchParams;
  tableId: string;
  initialFacets: MaintenanceRequestFacets;
  initialColumnVisibility: Record<string, boolean>;
  initialFilterVisibility: Record<string, boolean>;
  canApproveReject?: boolean;
  fetchAllForExport: typeof getAllMaintenanceRequestsForExport;
}

export function MaintenanceRequestDataTable({
  data,
  totalRows,
  searchParams,
  tableId,
  initialFacets,
  initialColumnVisibility,
  initialFilterVisibility,
  canApproveReject = false,
  fetchAllForExport,
}: MaintenanceRequestDataTableProps) {
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [dialogType, setDialogType] = useState<'view' | 'approve' | 'reject' | null>(null);
  const [historyRequestId, setHistoryRequestId] = useState<string | null>(null);
  const [reassignRequestId, setReassignRequestId] = useState<string | null>(null);
  const [showReassignDialog, setShowReassignDialog] = useState(false);

  // Cargar request completo cuando se abre un diálogo (para datos detallados)
  const { data: fullRequest } = useQuery({
    queryKey: ['maintenance-request-detail', selectedRequestId],
    queryFn: () => getMaintenanceRequestById(selectedRequestId!),
    enabled: !!selectedRequestId,
    staleTime: 0,
  });

  const { data: fullReassignRequest } = useQuery({
    queryKey: ['maintenance-request-detail', reassignRequestId],
    queryFn: () => getMaintenanceRequestById(reassignRequestId!),
    enabled: !!reassignRequestId,
    staleTime: 0,
  });

  // Parámetros para facets (sin page/sort para cross-filtering)
  const facetParams = useMemo(() => {
    const { page, pageSize, sort, sortBy, sortOrder, ...rest } = searchParams as Record<string, unknown>;
    return rest as DataTableSearchParams;
  }, [searchParams]);

  // Cargar facets en el cliente con cross-filtering
  const { data: facets, isFetching: isFetchingFacets } = useQuery({
    queryKey: ['maintenance-request-facets', facetParams],
    queryFn: () => getMaintenanceRequestFacets(facetParams),
    staleTime: 5 * 60 * 1000,
    initialData: initialFacets,
  });

  // Handlers de acciones
  const handleView = (request: MaintenanceRequestListItem) => {
    setSelectedRequestId(request.id);
    setDialogType('view');
  };

  const handleApprove = (request: MaintenanceRequestListItem) => {
    setSelectedRequestId(request.id);
    setDialogType('approve');
  };

  const handleReject = (request: MaintenanceRequestListItem) => {
    setSelectedRequestId(request.id);
    setDialogType('reject');
  };

  const handleCloseDialog = () => {
    setSelectedRequestId(null);
    setDialogType(null);
  };

  const handleViewHistory = (request: MaintenanceRequestListItem) => {
    setHistoryRequestId(request.id);
  };

  const handleCloseHistory = () => {
    setHistoryRequestId(null);
  };

  const handleReassign = (request: MaintenanceRequestListItem) => {
    setReassignRequestId(request.id);
    setShowReassignDialog(true);
  };

  // Columnas del DataTable
  const columns = useMemo(
    () =>
      getMaintenanceRequestColumns({
        onView: handleView,
        onApprove: handleApprove,
        onReject: handleReject,
        onViewHistory: handleViewHistory,
        onReassign: handleReassign,
        canApproveReject,
      }),
    [canApproveReject]
  );

  // Construir opciones de vehículos para el filtro facetado
  const vehicleOptions = useMemo(() => {
    if (!facets?.vehicles) return [];
    const opts: Array<{ value: string; label: string; icon?: LucideIcon }> = [];
    for (const [vehicleId] of facets.vehicles.entries()) {
      if (vehicleId === NULL_FILTER_VALUE) continue;
      const vehicle = facets.vehicleDetails?.get(vehicleId);
      if (vehicle) {
        const label = vehicle.domain || vehicle.serie || 'Sin identificar';
        const displayLabel = vehicle.intern_number ? `${label} (#${vehicle.intern_number})` : label;
        opts.push({ value: vehicleId, label: displayLabel });
      }
    }
    opts.sort((a, b) => a.label.localeCompare(b.label));
    if (facets.vehicles.has(NULL_FILTER_VALUE)) {
      opts.push({ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff });
    }
    return opts;
  }, [facets]);

  // Construir opciones de supervisores para el filtro facetado
  const supervisorOptions = useMemo(() => {
    if (!facets?.supervisors) return [];
    const opts: Array<{ value: string; label: string; icon?: LucideIcon }> = [];
    for (const [supervisorId] of facets.supervisors.entries()) {
      if (supervisorId === NULL_FILTER_VALUE) continue;
      const profile = facets.supervisorDetails?.get(supervisorId);
      if (profile) {
        opts.push({ value: supervisorId, label: profile.fullname ?? supervisorId });
      }
    }
    opts.sort((a, b) => a.label.localeCompare(b.label));
    if (facets.supervisors.has(NULL_FILTER_VALUE)) {
      opts.push({ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff });
    }
    return opts;
  }, [facets]);

  // Construir opciones de status para el filtro facetado
  const statusOptions = useMemo(() => {
    if (!facets?.status) return [];
    return (['pending_approval', 'approved', 'rejected'] as const)
      .filter((s) => (facets.status?.get(s) ?? 0) > 0)
      .map((s) => ({
        value: s,
        label: REQUEST_STATUS_LABELS[s],
        icon: STATUS_ICONS[s],
      }));
  }, [facets]);

  // Construir opciones de source para el filtro facetado
  const sourceOptions = useMemo(() => {
    if (!facets?.source) return [];
    const opts: Array<{ value: string; label: string; icon?: LucideIcon }> = [];
    for (const [sourceVal] of facets.source.entries()) {
      if (sourceVal === NULL_FILTER_VALUE) continue;
      opts.push({
        value: sourceVal,
        label: SOURCE_LABELS[sourceVal] ?? sourceVal,
      });
    }
    if (facets.source.has(NULL_FILTER_VALUE)) {
      opts.push({ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff });
    }
    return opts;
  }, [facets]);

  // Configuración de filtros facetados
  const facetedFilters = useMemo(
    () => [
      {
        columnId: 'status',
        title: 'Estado',
        options: statusOptions,
        externalCounts: facets?.status,
      },
      {
        columnId: 'vehicle',
        title: 'Equipo',
        options: vehicleOptions,
        externalCounts: facets?.vehicles,
      },
      {
        columnId: 'source',
        title: 'Origen',
        options: sourceOptions,
        externalCounts: facets?.source,
      },
      {
        columnId: 'supervisor',
        title: 'Supervisor',
        options: supervisorOptions,
        externalCounts: facets?.supervisors,
      },
      // Filtro de fecha (dateRange) — columna created_at
      {
        columnId: 'created_at',
        title: 'Fecha Solicitud',
        type: 'dateRange' as const,
      },
    ],
    [statusOptions, vehicleOptions, sourceOptions, supervisorOptions, facets]
  );

  // Visibilidad de filtros por defecto (preferencias de BD tienen prioridad)
  const mergedFilterVisibility = useMemo(() => {
    if (initialFilterVisibility && Object.keys(initialFilterVisibility).length > 0) {
      return initialFilterVisibility;
    }
    return Object.fromEntries(
      facetedFilters.map((f) => [f.columnId, DEFAULT_VISIBLE_FILTERS.includes(f.columnId)])
    );
  }, [initialFilterVisibility, facetedFilters]);

  // Visibilidad de columnas por defecto
  const columnVisibility = useMemo(() => {
    const defaults = Object.fromEntries(HIDDEN_COLUMNS_BY_DEFAULT.map((col) => [col, false]));
    return { ...defaults, ...initialColumnVisibility };
  }, [initialColumnVisibility]);

  // Configuración de exportación a Excel
  const exportConfig = useMemo(
    () => ({
      options: {
        filename: `solicitudes-mantenimiento-${moment().format('YYYY-MM-DD')}`,
        sheetName: 'Solicitudes',
      },
      fetchAllData: () => fetchAllForExport(searchParams),
      formatters: {
        created_at: (val: unknown) =>
          val ? moment(val as string).format('DD/MM/YYYY HH:mm') : '-',
        status: (val: unknown) => {
          const s = val as string;
          return REQUEST_STATUS_LABELS[s] ?? ORDER_STATUS_LABELS[s] ?? s ?? '-';
        },
        source: (val: unknown) => SOURCE_LABELS[val as string] ?? String(val ?? '-'),
        kilometer: (val: unknown) => (val ? `${val} km` : '-'),
        engine_hours: (val: unknown) => (val ? `${val} hs` : '-'),
        items_count: (val: unknown) => String(val ?? 0),
        // accessorFn retorna string vacío cuando no hay valor — normalizar a '-'
        supervisor: (val: unknown) => (val ? String(val) : 'Sin asignar'),
        driver: (val: unknown) => (val ? String(val) : '-'),
        vehicle: (val: unknown) => (val ? String(val) : '-'),
      },
    }),
    [fetchAllForExport, searchParams]
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={data}
        totalRows={totalRows}
        searchParams={searchParams}
        paramNamespace={tableId}
        tableId={tableId}
        facetedFilters={facetedFilters}
        isFetchingFacets={isFetchingFacets}
        exportConfig={exportConfig}
        initialColumnVisibility={columnVisibility}
        initialFilterVisibility={mergedFilterVisibility}
        searchPlaceholder="Buscar solicitudes..."
        emptyMessage="No hay solicitudes de mantenimiento"
        showFilterToggle={true}
      />

      {selectedRequestId && dialogType === 'view' && fullRequest && (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <SolicitudDetailDialog
          request={fullRequest as any}
          open={true}
          onClose={handleCloseDialog}
        />
      )}

      {selectedRequestId && dialogType === 'approve' && fullRequest && (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <SolicitudApprovalDialog
          request={fullRequest as any}
          open={true}
          onClose={handleCloseDialog}
        />
      )}

      {selectedRequestId && dialogType === 'reject' && fullRequest && (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <SolicitudRejectDialog
          request={fullRequest as any}
          open={true}
          onClose={handleCloseDialog}
        />
      )}

      {reassignRequestId && fullReassignRequest && (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <ReassignSupervisorDialog
          request={fullReassignRequest as any}
          open={showReassignDialog}
          onOpenChange={(open) => {
            setShowReassignDialog(open);
            if (!open) setReassignRequestId(null);
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
