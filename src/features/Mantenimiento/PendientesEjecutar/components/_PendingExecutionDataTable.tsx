'use client';

import {
  DataTable,
  type DataTableFacetedFilterConfig,
  type DataTableSearchParams,
} from '@/shared/components/common/DataTable';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import { conditionLabels } from '@/shared/utils/mappers';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, CircleOff, Clock, Truck } from 'lucide-react';
import moment from 'moment';
import { useMemo, useState } from 'react';
import {
  getAllPendingExecutionOrdersForExport,
  getPendingExecutionFacets,
  type PendingExecutionListItem,
} from '../actions.server';
import { getPendingExecutionColumns, HIDDEN_COLUMNS_BY_DEFAULT, STATUS_LABELS } from '../columns';
import { AprobarFechaDialog } from './AprobarFechaDialog';
import { PendienteDetailDialog } from './PendienteDetailDialog';
import { RechazarFechaDialog } from './RechazarFechaDialog';

// ============================================================================
// TYPES
// ============================================================================

interface Props {
  data: PendingExecutionListItem[];
  totalRows: number;
  searchParams: DataTableSearchParams;
  tableId: string;
  canApproveReject: boolean;
  initialColumnVisibility: Record<string, boolean>;
  initialFilterVisibility: Record<string, boolean>;
}

// ============================================================================
// DEFAULT VISIBLE FILTERS
// ============================================================================

const DEFAULT_VISIBLE_FILTER_IDS = ['status', 'vehicle', 'scheduled_date'];

// ============================================================================
// CLIENT COMPONENT
// ============================================================================

export function _PendingExecutionDataTable({
  data,
  totalRows,
  searchParams,
  tableId,
  canApproveReject,
  initialColumnVisibility,
  initialFilterVisibility,
}: Props) {
  const [selectedOrder, setSelectedOrder] = useState<PendingExecutionListItem | null>(null);
  const [dialogType, setDialogType] = useState<'view' | 'approve' | 'reject' | null>(null);

  // Handlers de dialogos
  const handleView = (order: PendingExecutionListItem) => {
    setSelectedOrder(order);
    setDialogType('view');
  };

  const handleApprove = (order: PendingExecutionListItem) => {
    setSelectedOrder(order);
    setDialogType('approve');
  };

  const handleReject = (order: PendingExecutionListItem) => {
    setSelectedOrder(order);
    setDialogType('reject');
  };

  const handleCloseDialog = () => {
    setSelectedOrder(null);
    setDialogType(null);
  };

  // Extraer params de facets (sin page/sort)
  const facetParams = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { page, pageSize, sort, sortBy, sortOrder, ...rest } = searchParams;
    return rest;
  }, [searchParams]);

  // Facets con cross-filtering
  const { data: facets, isFetching: isFetchingFacets } = useQuery({
    queryKey: ['pending-execution-facets', facetParams],
    queryFn: () => getPendingExecutionFacets(facetParams),
    staleTime: 5 * 60 * 1000,
  });

  // Columnas
  const columns = useMemo(
    () =>
      getPendingExecutionColumns({
        onView: handleView,
        onApprove: handleApprove,
        onReject: handleReject,
        canApproveReject,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canApproveReject]
  );

  // Column visibility
  const mergedColumnVisibility = useMemo(() => {
    const defaults = Object.fromEntries(HIDDEN_COLUMNS_BY_DEFAULT.map((col) => [col, false]));
    return { ...defaults, ...initialColumnVisibility };
  }, [initialColumnVisibility]);

  // Filter visibility
  const mergedFilterVisibility = useMemo(() => {
    if (initialFilterVisibility && Object.keys(initialFilterVisibility).length > 0) {
      return initialFilterVisibility;
    }
    const allFilterIds = [
      'status',
      'vehicle',
      'condition',
      'scheduled_date',
      'created_at',
      'domain',
      'serie',
      'intern_number',
      'description',
    ];
    return Object.fromEntries(allFilterIds.map((id) => [id, DEFAULT_VISIBLE_FILTER_IDS.includes(id)]));
  }, [initialFilterVisibility]);

  // Filtros facetados
  const facetedFilters: DataTableFacetedFilterConfig[] = useMemo(
    () => [
      // Estado (enum)
      {
        columnId: 'status',
        title: 'Estado',
        options: [
          { value: 'scheduled', label: STATUS_LABELS['scheduled'], icon: Clock },
          { value: 'date_confirmed', label: STATUS_LABELS['date_confirmed'], icon: CheckCircle2 },
        ],
        externalCounts: facets?.status,
      },

      // Vehiculo (FK UUID -> vehicles)
      {
        columnId: 'vehicle',
        title: 'Equipo',
        options: [
          ...(facets?.vehicleOptions?.map((v) => ({
            value: v.id,
            label: [v.domain ?? v.serie ?? 'Sin identificar', v.intern_number ? `#${v.intern_number}` : '']
              .filter(Boolean)
              .join(' '),
            icon: Truck,
          })) ?? []),
          ...(facets?.vehicle?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin equipo', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.vehicle,
      },

      // Condicion actual del equipo (campo en vehicles)
      {
        columnId: 'condition',
        title: 'Condicion',
        options: [
          ...Object.keys(conditionLabels).map((value) => ({
            value,
            label: conditionLabels[value] ?? value,
          })),
          ...(facets?.condition?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin condicion', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.condition,
      },

      // Fecha planificada (dateRange)
      {
        columnId: 'scheduled_date',
        title: 'Fecha Planificada',
        type: 'dateRange' as const,
      },

      // Fecha creacion (dateRange) — oculto por defecto
      {
        columnId: 'created_at',
        title: 'Fecha Creacion',
        type: 'dateRange' as const,
      },

      // Dominio (texto libre en vehicles)
      {
        columnId: 'domain',
        title: 'Dominio',
        type: 'text' as const,
        placeholder: 'Buscar por dominio...',
      },

      // Serie (texto libre en vehicles)
      {
        columnId: 'serie',
        title: 'Serie',
        type: 'text' as const,
        placeholder: 'Buscar por serie...',
      },

      // Numero interno (texto libre en vehicles)
      {
        columnId: 'intern_number',
        title: 'N Interno',
        type: 'text' as const,
        placeholder: 'Buscar por numero interno...',
      },

      // Descripcion del pedido (texto libre)
      {
        columnId: 'description',
        title: 'Descripción',
        type: 'text' as const,
        placeholder: 'Buscar por descripción...',
      },
    ],
    [facets]
  );

  // Export config
  const exportConfig = useMemo(
    () => ({
      options: { filename: 'pendientes-ejecutar', sheetName: 'Pendientes de Ejecutar' },
      fetchAllData: () => getAllPendingExecutionOrdersForExport(searchParams),
      formatters: {
        vehicle: (_val: unknown, row: PendingExecutionListItem) => {
          const vehicle = row.vehicles;
          const label = vehicle?.domain ?? vehicle?.serie ?? 'Sin identificar';
          return vehicle?.intern_number ? `${label} (#${vehicle.intern_number})` : label;
        },
        scheduled_date: (val: unknown) =>
          val ? moment.utc(val as string).format('DD/MM/YYYY') : '',
        created_at: (val: unknown) =>
          val ? moment(val as string).format('DD/MM/YYYY HH:mm') : '',
        status: (val: unknown) => {
          const status = val as string;
          return STATUS_LABELS[status] ?? status ?? '';
        },
        condition: (_val: unknown, row: PendingExecutionListItem) => {
          const condition = row.vehicles?.condition;
          return condition ? (conditionLabels[condition] ?? condition) : '';
        },
        items_count: (_val: unknown, row: PendingExecutionListItem) => {
          const count = row.maintenance_order_items?.length ?? 0;
          return String(count);
        },
        kilometer: (_val: unknown, row: PendingExecutionListItem) => {
          const km = row.maintenance_requests?.kilometer;
          return km ? `${Number(km).toLocaleString()} km` : '';
        },
        description: (_val: unknown, row: PendingExecutionListItem) =>
          row.description ?? row.maintenance_requests?.description ?? '',
      },
    }),
    [searchParams]
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
        initialColumnVisibility={mergedColumnVisibility}
        initialFilterVisibility={mergedFilterVisibility}
        searchPlaceholder="Buscar por numero de orden..."
        emptyMessage="No hay pedidos pendientes de ejecutar"
        showFilterToggle={true}
      />

      {selectedOrder && dialogType === 'view' && (
        <PendienteDetailDialog
          order={selectedOrder}
          open={true}
          onClose={handleCloseDialog}
        />
      )}

      {selectedOrder && dialogType === 'approve' && (
        <AprobarFechaDialog
          order={selectedOrder}
          open={true}
          onClose={handleCloseDialog}
        />
      )}

      {selectedOrder && dialogType === 'reject' && (
        <RechazarFechaDialog
          order={selectedOrder}
          open={true}
          onClose={handleCloseDialog}
        />
      )}
    </>
  );
}
