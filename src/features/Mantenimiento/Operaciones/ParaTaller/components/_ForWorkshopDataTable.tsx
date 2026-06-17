'use client';

import { ActivityHistoryModal } from '@/features/Mantenimiento/components/ActivityHistoryModal';
import {
  DataTable,
  type DataTableFacetedFilterConfig,
  type DataTableSearchParams,
} from '@/shared/components/common/DataTable';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import { useQuery } from '@tanstack/react-query';
import { CircleOff, Truck, type LucideIcon } from 'lucide-react';
import moment from 'moment';
import { useMemo, useState } from 'react';
import {
  getAllForWorkshopOrdersForExport,
  getForWorkshopOrdersFacets,
  type ForWorkshopOrderListItem,
} from '../actions.server';
import { conditionLabels, getForWorkshopColumns, HIDDEN_COLUMNS_BY_DEFAULT } from '../columns';
import { ParaTallerDetailDialog } from './ParaTallerDetailDialog';

// ============================================================================
// TYPES
// ============================================================================

interface Props {
  data: ForWorkshopOrderListItem[];
  totalRows: number;
  searchParams: DataTableSearchParams;
  tableId: string;
  initialColumnVisibility: Record<string, boolean>;
  initialFilterVisibility: Record<string, boolean>;
}

// ============================================================================
// DEFAULT VISIBLE FILTERS
// ============================================================================

const DEFAULT_VISIBLE_FILTER_IDS = ['vehicle', 'condition', 'scheduled_date'];

// ============================================================================
// CLIENT COMPONENT
// ============================================================================

export function _ForWorkshopDataTable({
  data,
  totalRows,
  searchParams,
  tableId,
  initialColumnVisibility,
  initialFilterVisibility,
}: Props) {
  const [selectedOrder, setSelectedOrder] = useState<ForWorkshopOrderListItem | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [historyOrder, setHistoryOrder] = useState<ForWorkshopOrderListItem | null>(null);

  // ── facetParams: solo filtros (sin page/sort) para el queryKey ────────────
  const facetParams = useMemo(() => {
    const { page, pageSize, sort, sortBy, sortOrder, ...rest } = searchParams as Record<string, unknown>;
    void page; void pageSize; void sort; void sortBy; void sortOrder;
    return rest as DataTableSearchParams;
  }, [searchParams]);

  // ── Facetas del servidor (cross-filtering) ─────────────────────────────────
  const { data: facets, isFetching: isFetchingFacets } = useQuery({
    queryKey: ['for-workshop-facets', facetParams],
    queryFn: () => getForWorkshopOrdersFacets(facetParams),
    staleTime: 5 * 60 * 1000,
  });

  // ── Handlers de acciones ───────────────────────────────────────────────────
  const handleViewDetail = (order: ForWorkshopOrderListItem) => {
    setSelectedOrder(order);
    setShowDetail(true);
  };

  const handleCloseDetail = () => {
    setSelectedOrder(null);
    setShowDetail(false);
  };

  const handleViewHistory = (order: ForWorkshopOrderListItem) => {
    setHistoryOrder(order);
  };

  const handleCloseHistory = () => {
    setHistoryOrder(null);
  };

  // ── Columnas ───────────────────────────────────────────────────────────────
  const columns = useMemo(
    () => getForWorkshopColumns({ onViewDetail: handleViewDetail, onViewHistory: handleViewHistory }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ── Opciones de condición del vehículo ─────────────────────────────────────
  const conditionOptions = useMemo(() => {
    const options: { value: string; label: string; icon?: LucideIcon }[] = [];
    const counts = facets?.conditionCounts;
    if (!counts) return options;

    for (const [value, count] of counts.entries()) {
      if (value === NULL_FILTER_VALUE) continue;
      options.push({
        value,
        label: conditionLabels[value] ?? value,
      });
      void count;
    }

    const nullCount = counts.get(NULL_FILTER_VALUE);
    if (nullCount && nullCount > 0) {
      options.push({ value: NULL_FILTER_VALUE, label: 'Sin datos', icon: CircleOff });
    }

    return options;
  }, [facets]);

  // ── Opciones de vehículos ─────────────────────────────────────────────────
  const vehicleOptions = useMemo(() => {
    const vehicles = facets?.vehicles ?? [];
    return vehicles.map((v) => ({
      value: v.id,
      label: v.domain || v.serie || v.intern_number || 'Sin identificar',
      icon: Truck,
    }));
  }, [facets]);

  // ── Filtros facetados ──────────────────────────────────────────────────────
  const facetedFilters = useMemo((): DataTableFacetedFilterConfig[] => {
    return [
      {
        columnId: 'vehicle',
        title: 'Equipo',
        options: vehicleOptions,
        externalCounts: facets?.vehicleCounts,
      },
      {
        columnId: 'condition',
        title: 'Condición',
        options: conditionOptions,
        externalCounts: facets?.conditionCounts,
      },
      {
        columnId: 'scheduled_date',
        title: 'Fecha Planificada',
        type: 'dateRange' as const,
      },
      {
        columnId: 'order_number',
        title: 'N° Pedido',
        type: 'text' as const,
      },
      {
        columnId: 'created_at',
        title: 'Fecha de Creación',
        type: 'dateRange' as const,
      },
      {
        columnId: 'description',
        title: 'Descripción',
        type: 'text' as const,
        placeholder: 'Buscar por descripción...',
      },
    ];
  }, [vehicleOptions, conditionOptions, facets]);

  // ── Preferencias de visibilidad de filtros ────────────────────────────────
  const mergedFilterVisibility = useMemo(() => {
    if (initialFilterVisibility && Object.keys(initialFilterVisibility).length > 0) {
      return initialFilterVisibility;
    }
    return Object.fromEntries(
      facetedFilters.map((f) => [f.columnId, DEFAULT_VISIBLE_FILTER_IDS.includes(f.columnId)])
    );
  }, [initialFilterVisibility, facetedFilters]);

  // ── Export config ─────────────────────────────────────────────────────────
  const exportConfig = useMemo(
    () => ({
      fetchAllData: () => getAllForWorkshopOrdersForExport(searchParams),
      options: {
        filename: 'pedidos-para-taller',
        sheetName: 'Para Taller',
      },
      formatters: {
        vehicle: (_val: unknown, row: ForWorkshopOrderListItem) => {
          const v = row.vehicles;
          const label = v?.domain || v?.serie || 'Sin identificar';
          return v?.intern_number ? `${label} (#${v.intern_number})` : label;
        },
        items_count: (_val: unknown, row: ForWorkshopOrderListItem) =>
          String(row.maintenance_order_items?.length ?? 0),
        scheduled_date: (val: unknown) =>
          val ? moment(val as string).format('DD/MM/YYYY') : '-',
        condition: (_val: unknown, row: ForWorkshopOrderListItem) => {
          const cond = row.vehicles?.condition;
          return cond ? (conditionLabels[cond] ?? cond) : '-';
        },
        kilometer: (_val: unknown, row: ForWorkshopOrderListItem) => {
          const km = row.vehicles?.kilometer;
          return km ? `${Number(km).toLocaleString('es-AR')} km` : '-';
        },
        order_number: (val: unknown) => String(val ?? '-'),
        created_at: (val: unknown) => (val ? moment(val as string).format('DD/MM/YYYY') : '-'),
        description: (_val: unknown, row: ForWorkshopOrderListItem) =>
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
        initialColumnVisibility={{
          ...Object.fromEntries(HIDDEN_COLUMNS_BY_DEFAULT.map((col) => [col, false])),
          ...initialColumnVisibility,
        }}
        initialFilterVisibility={mergedFilterVisibility}
        searchPlaceholder="Buscar por equipo (dominio, serie, N° interno) o N° pedido..."
        emptyMessage="No hay pedidos con fecha confirmada"
        showFilterToggle={true}
        data-testid="for-workshop-datatable"
      />

      {/* Dialog de detalle */}
      {selectedOrder && showDetail && (
        <ParaTallerDetailDialog order={selectedOrder} open={true} onClose={handleCloseDetail} />
      )}

      {/* Modal de historial */}
      <ActivityHistoryModal
        open={!!historyOrder}
        onClose={handleCloseHistory}
        maintenanceOrderId={historyOrder?.id}
        maintenanceRequestId={historyOrder?.maintenance_requests?.id}
        title="Historial del Pedido"
      />
    </>
  );
}
