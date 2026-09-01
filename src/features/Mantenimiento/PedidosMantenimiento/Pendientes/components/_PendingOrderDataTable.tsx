'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  DataTable,
  type DataTableExportConfig,
  type DataTableFacetedFilterConfig,
  type DataTableSearchParams,
} from '@/shared/components/common/DataTable';
import { useQuery } from '@tanstack/react-query';
import { Clock, HourglassIcon, Loader2 } from 'lucide-react';
import moment from 'moment';
import { useMemo, useState } from 'react';

import { ActivityHistoryModal } from '@/features/Mantenimiento/components/ActivityHistoryModal';
import { getMaintenanceOrderById, type MaintenanceOrderData } from '../../actions/actionsServer';
import { PedidoDetailDialog } from '../../components/PedidoDetailDialog';
import { PlanificarPedidoDialog } from '../../components/PlanificarPedidoDialog';
import { PEDIDOS_PENDIENTES_QUERY_KEY } from '../../hooks/useMaintenanceOrders';
import { getAllPendingOrdersForExport, getPendingOrdersFacets, type PendingOrderListItem } from '../actions.server';
import {
  HIDDEN_COLUMNS_BY_DEFAULT,
  PENDING_STATUS_LABELS,
  SOURCE_ICONS,
  SOURCE_LABELS,
  getPendingOrderColumns,
} from '../columns';

// ── Íconos de estado para filtros ─────────────────────────────────────────────
const STATUS_ICONS = {
  pending_scheduling: HourglassIcon,
  scheduled: Clock,
};

const DEFAULT_VISIBLE_FILTERS = ['status', 'vehicle', 'source'];

interface Props {
  data: PendingOrderListItem[];
  totalRows: number;
  searchParams: DataTableSearchParams;
  tableId: string;
  initialColumnVisibility?: Record<string, boolean>;
  initialFilterVisibility?: Record<string, boolean>;
}

export function _PendingOrderDataTable({
  data,
  totalRows,
  searchParams,
  tableId,
  initialColumnVisibility: savedColumnVisibility,
  initialFilterVisibility,
}: Props) {
  // ── Estado de diálogos ────────────────────────────────────────────────────
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [dialogType, setDialogType] = useState<'view' | 'schedule' | null>(null);
  const [historyOrder, setHistoryOrder] = useState<PendingOrderListItem | null>(null);

  // ── Query para cargar detalles completos al abrir diálogo ─────────────────
  const { data: selectedOrderDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['maintenance-order-detail', selectedOrderId],
    queryFn: () => (selectedOrderId ? getMaintenanceOrderById(selectedOrderId) : null),
    enabled: !!selectedOrderId,
    staleTime: 0,
  });

  const isWaitingForDetail = !!selectedOrderId && !!dialogType && isLoadingDetail;

  // ── Facetas (opciones de filtros + counts del servidor) ───────────────────
  const facetParams = useMemo(() => {
    const {
      page: _page,
      pageSize: _pageSize,
      sort: _sort,
      sortBy: _sortBy,
      sortOrder: _sortOrder,
      ...rest
    } = searchParams as Record<string, unknown>;
    return rest as DataTableSearchParams;
  }, [searchParams]);

  const { data: facets, isFetching: isFetchingFacets } = useQuery({
    queryKey: [...PEDIDOS_PENDIENTES_QUERY_KEY, 'facets', facetParams],
    queryFn: () => getPendingOrdersFacets(facetParams),
    staleTime: 5 * 60 * 1000,
  });

  // ── Columnas ──────────────────────────────────────────────────────────────
  const callbacks = useMemo(
    () => ({
      onView: (order: PendingOrderListItem) => {
        setSelectedOrderId(order.id);
        setDialogType('view');
      },
      onSchedule: (order: PendingOrderListItem) => {
        setSelectedOrderId(order.id);
        setDialogType('schedule');
      },
      onViewHistory: (order: PendingOrderListItem) => {
        setHistoryOrder(order);
      },
    }),
    []
  );

  const columns = useMemo(() => getPendingOrderColumns(callbacks), [callbacks]);

  // ── Visibilidad inicial ───────────────────────────────────────────────────
  const defaultColumnVisibility = useMemo(
    () => Object.fromEntries(HIDDEN_COLUMNS_BY_DEFAULT.map((col) => [col, false])),
    []
  );
  const initialColumnVisibility =
    savedColumnVisibility && Object.keys(savedColumnVisibility).length > 0
      ? savedColumnVisibility
      : defaultColumnVisibility;

  // ── Filtros facetados ─────────────────────────────────────────────────────
  const facetedFilters: DataTableFacetedFilterConfig[] = useMemo(
    () => [
      {
        columnId: 'status',
        title: 'Estado',
        options: Object.entries(PENDING_STATUS_LABELS).map(([value, label]) => ({
          value,
          label,
          icon: STATUS_ICONS[value as keyof typeof STATUS_ICONS],
        })),
        externalCounts: facets?.status,
      },
      {
        columnId: 'vehicle',
        title: 'Equipo',
        options:
          facets?.vehicleOptions?.map((v) => ({
            value: v.id,
            label: [v.domain || v.serie || 'Sin identificar', v.intern_number ? `#${v.intern_number}` : '']
              .filter(Boolean)
              .join(' '),
          })) ?? [],
        externalCounts: facets?.vehicle,
      },
      {
        columnId: 'source',
        title: 'Origen',
        options: Object.entries(SOURCE_LABELS).map(([value, label]) => ({
          value,
          label,
          icon: SOURCE_ICONS[value as keyof typeof SOURCE_ICONS],
        })),
        externalCounts: facets?.source,
      },
      {
        columnId: 'order_number',
        title: 'Nro. Pedido',
        type: 'text' as const,
      },
      {
        columnId: 'description',
        title: 'Descripción',
        type: 'text' as const,
      },
      {
        columnId: 'created_at',
        title: 'Fecha Aprobación',
        type: 'dateRange' as const,
      },
      {
        columnId: 'scheduled_date',
        title: 'Fecha Planificada',
        type: 'dateRange' as const,
      },
    ],
    [facets]
  );

  // ── Visibilidad de filtros por defecto ────────────────────────────────────
  const mergedFilterVisibility = useMemo(() => {
    if (initialFilterVisibility && Object.keys(initialFilterVisibility).length > 0) {
      return initialFilterVisibility;
    }
    return Object.fromEntries(facetedFilters.map((f) => [f.columnId, DEFAULT_VISIBLE_FILTERS.includes(f.columnId)]));
  }, [initialFilterVisibility, facetedFilters]);

  // ── Exportación a Excel ───────────────────────────────────────────────────
  const exportConfig: DataTableExportConfig<PendingOrderListItem> = useMemo(
    () => ({
      fetchAllData: () => getAllPendingOrdersForExport(searchParams),
      options: {
        filename: 'pedidos-pendientes',
        title: 'Pedidos Pendientes de Mantenimiento',
        sheetName: 'Pendientes',
      },
      formatters: {
        status: (val) => PENDING_STATUS_LABELS[val as string] || String(val),
        source: (val) => SOURCE_LABELS[val as string] || String(val ?? ''),
        order_number: (val) => String(val ?? ''),
        description: (val) => String(val ?? ''),
        created_at: (val) => (val ? moment(val as string).format('DD/MM/YYYY HH:mm') : ''),
        scheduled_date: (val) => (val ? moment(val as string).format('DD/MM/YYYY') : ''),
        items: (val) => (val != null ? String(val) : ''),
      },
    }),
    [searchParams]
  );

  // ── Handlers de cierre ────────────────────────────────────────────────────
  const handleCloseDialog = () => {
    setSelectedOrderId(null);
    setDialogType(null);
  };

  return (
    <>
      <DataTable
        columns={columns}
        data={data}
        totalRows={totalRows}
        searchParams={searchParams}
        paramNamespace={tableId}
        tableId={tableId}
        searchPlaceholder="Buscar por equipo (dominio, serie) o nro. pedido..."
        facetedFilters={facetedFilters}
        isFetchingFacets={isFetchingFacets}
        exportConfig={exportConfig}
        showFilterToggle={true}
        emptyMessage="No hay pedidos pendientes"
        initialColumnVisibility={initialColumnVisibility}
        initialFilterVisibility={mergedFilterVisibility}
        data-testid="pedidos-pendientes-table"
      />

      {/* Loading mientras se cargan datos del pedido */}
      <Dialog open={isWaitingForDetail} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-xs max-h-[90vh] overflow-y-auto" showCloseButton={false}>
          <div className="flex flex-col items-center gap-3 py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {dialogType === 'schedule' ? 'Cargando datos de planificación...' : 'Cargando detalle del pedido...'}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de detalle */}
      {selectedOrderDetail && dialogType === 'view' && (
        <PedidoDetailDialog
          order={selectedOrderDetail as MaintenanceOrderData}
          open={true}
          onClose={handleCloseDialog}
        />
      )}

      {/* Diálogo de planificación */}
      {selectedOrderDetail && dialogType === 'schedule' && (
        <PlanificarPedidoDialog
          order={selectedOrderDetail as MaintenanceOrderData}
          open={true}
          onClose={handleCloseDialog}
        />
      )}

      {/* Modal de historial de actividad */}
      <ActivityHistoryModal
        open={!!historyOrder}
        onClose={() => setHistoryOrder(null)}
        maintenanceOrderId={historyOrder?.id}
        maintenanceRequestId={historyOrder?.maintenance_requests?.id}
        title="Historial del Pedido"
      />
    </>
  );
}
