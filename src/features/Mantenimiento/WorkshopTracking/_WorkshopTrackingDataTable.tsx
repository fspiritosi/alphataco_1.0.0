'use client';

import { DataTable } from '@/shared/components/common/DataTable';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import type {
  DataTableFacetedFilterConfig,
  DataTableFilterOption,
  DataTableSearchParams,
} from '@/shared/components/common/DataTable/types';
import { useQuery } from '@tanstack/react-query';
import { CircleOff } from 'lucide-react';
import { useMemo, useState } from 'react';
import { OrderDetailDialog } from '../MaintenanceOrders/components/OrderDetailDialog';
import type { WorkshopTrackingListItem } from './actions.server';
import { getAllWorkshopTrackingForExport, getWorkshopTrackingFacets } from './actions.server';
import {
  HIDDEN_COLUMNS_BY_DEFAULT,
  WORKSHOP_STATUS_FILTER_OPTIONS,
  getWorkshopTrackingColumns,
  getWorkshopTrackingExportFormatters,
} from './workshopTrackingColumns';

// ============================================================================
// CONSTANTS
// ============================================================================

const TABLE_ID = 'workshop-tracking';

const DEFAULT_VISIBLE_FILTERS = ['status', 'vehicle', 'workshop_entry_date'];

// ============================================================================
// PROPS
// ============================================================================

interface WorkshopTrackingDataTableProps {
  data: WorkshopTrackingListItem[];
  totalRows: number;
  searchParams: DataTableSearchParams;
  initialColumnVisibility?: Record<string, boolean>;
  initialFilterVisibility?: Record<string, boolean>;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function _WorkshopTrackingDataTable({
  data,
  totalRows,
  searchParams,
  initialColumnVisibility,
  initialFilterVisibility,
}: WorkshopTrackingDataTableProps) {
  // ── Dialog state ──────────────────────────────────────────────────────────
  const [selectedOrder, setSelectedOrder] = useState<WorkshopTrackingListItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const handleViewDetail = (order: WorkshopTrackingListItem) => {
    setLoadingDetail(true);
    setSelectedOrder(order);
    setDialogOpen(true);
  };

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns = useMemo(
    () => getWorkshopTrackingColumns({ onViewDetail: handleViewDetail }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ── Facets (cross-filtering) ──────────────────────────────────────────────
  const facetParams = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { page, pageSize, sort, sortBy, sortOrder, ...rest } = searchParams as Record<string, unknown>;
    return rest as DataTableSearchParams;
  }, [searchParams]);

  const { data: facets, isFetching: isFetchingFacets } = useQuery({
    queryKey: ['workshop-tracking-facets', facetParams],
    queryFn: () => getWorkshopTrackingFacets(facetParams),
    staleTime: 5 * 60 * 1000,
  });

  // ── Faceted Filters ────────────────────────────────────────────────────────
  const facetedFilters: DataTableFacetedFilterConfig[] = useMemo(() => {
    // Status options (always all statuses + null if needed)
    const statusOptions = WORKSHOP_STATUS_FILTER_OPTIONS.filter(
      (opt) => !facets?.status || facets.status.has(opt.value) || facets.status.size === 0
    );

    // Vehicle options
    const vehicleOptions: DataTableFilterOption[] = (facets?.vehicleOptions ?? []).map((v) => ({
      value: v.id,
      label: [v.domain || v.serie || 'Sin dominio', v.intern_number ? `(${v.intern_number})` : '']
        .filter(Boolean)
        .join(' '),
    }));
    if (facets?.vehicle?.has(NULL_FILTER_VALUE)) {
      vehicleOptions.push({ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff });
    }

    return [
      {
        columnId: 'status',
        title: 'Estado',
        type: 'faceted' as const,
        options: statusOptions,
        externalCounts: facets?.status,
      },
      {
        columnId: 'vehicle',
        title: 'Equipo',
        type: 'faceted' as const,
        options: vehicleOptions,
        externalCounts: facets?.vehicle,
      },
      {
        columnId: 'workshop_entry_date',
        title: 'Fecha Ingreso',
        type: 'dateRange' as const,
      },
      {
        columnId: 'created_at',
        title: 'Fecha Creación',
        type: 'dateRange' as const,
      },
      {
        columnId: 'order_number',
        title: 'N° Orden',
        type: 'text' as const,
      },
      {
        columnId: 'domain',
        title: 'Dominio',
        type: 'text' as const,
      },
      {
        columnId: 'serie',
        title: 'Serie',
        type: 'text' as const,
      },
      {
        columnId: 'intern_number',
        title: 'N° Interno',
        type: 'text' as const,
      },
      {
        columnId: 'description',
        title: 'Descripción',
        type: 'text' as const,
      },
    ];
  }, [facets]);

  // ── Filter visibility ─────────────────────────────────────────────────────
  const mergedFilterVisibility = useMemo(() => {
    if (initialFilterVisibility && Object.keys(initialFilterVisibility).length > 0) {
      return initialFilterVisibility;
    }
    return Object.fromEntries(facetedFilters.map((f) => [f.columnId, DEFAULT_VISIBLE_FILTERS.includes(f.columnId)]));
  }, [initialFilterVisibility, facetedFilters]);

  // ── Export config ─────────────────────────────────────────────────────────
  const exportFormatters = useMemo(() => getWorkshopTrackingExportFormatters(), []);

  const exportConfig = {
    options: {
      filename: 'seguimiento-taller',
      sheetName: 'Seguimiento Taller',
    },
    fetchAllData: () => getAllWorkshopTrackingForExport(searchParams),
    formatters: exportFormatters,
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <DataTable
        columns={columns}
        data={data}
        totalRows={totalRows}
        searchParams={searchParams}
        tableId={TABLE_ID}
        paramNamespace={TABLE_ID}
        searchPlaceholder="Buscar por N° de orden..."
        emptyMessage="No hay órdenes de mantenimiento en taller"
        showFilterToggle={true}
        facetedFilters={facetedFilters}
        isFetchingFacets={isFetchingFacets}
        exportConfig={exportConfig}
        initialColumnVisibility={{
          ...Object.fromEntries(HIDDEN_COLUMNS_BY_DEFAULT.map((c) => [c, false])),
          ...(initialColumnVisibility ?? {}),
        }}
        initialFilterVisibility={mergedFilterVisibility}
      />

      {/* Loading overlay para carga de detalle */}
      {loadingDetail && (
        <div className="fixed inset-0 bg-background/50 flex items-center justify-center z-50">
          <div className="bg-card p-4 rounded-lg shadow-lg flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm">Cargando detalle de orden...</span>
          </div>
        </div>
      )}

      {/* Dialog de detalle — solo lectura para operaciones */}
      <OrderDetailDialog
        orderId={selectedOrder?.id}
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setSelectedOrder(null);
        }}
        onLoaded={() => setLoadingDetail(false)}
        context="operations"
      />
    </>
  );
}
