'use client';

import {
  getOrderForManagement,
  type ExternalWorkshop,
  type OrderManagementItem,
  type WorkshopSector,
} from '@/features/Mantenimiento/OrderManagement/actions/actionsServer';
import { ManageOrderWizard } from '@/features/Mantenimiento/OrderManagement/components/ManageOrderWizard';
import {
  DataTable,
  type DataTableFacetedFilterConfig,
  type DataTableSearchParams,
} from '@/shared/components/common/DataTable';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import { useQuery } from '@tanstack/react-query';
import { Activity, CheckCircle2, CircleOff, Clock, Settings, Truck, XCircle, type LucideIcon } from 'lucide-react';
import moment from 'moment';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { OrderDetailDialog } from '../../components/OrderDetailDialog';
import { RequestedItemsDialog } from '../../components/RequestedItemsDialog';
import {
  getAllMaintenanceOrdersForExport,
  getMaintenanceOrdersFacets,
  type MaintenanceOrderListItem,
} from '../actions.server';
import { HIDDEN_COLUMNS_BY_DEFAULT, getMaintenanceOrdersColumns, statusLabels } from '../columns';

// ============================================================================
// TYPES
// ============================================================================

interface Props {
  data: MaintenanceOrderListItem[];
  totalRows: number;
  searchParams: DataTableSearchParams;
  tableId: string;
  initialColumnVisibility: Record<string, boolean>;
  initialFilterVisibility: Record<string, boolean>;
  // Data for ManageOrderWizard (passed as serializable props from server)
  sectors: WorkshopSector[];
  repairTypes: Array<{ id: string; name: string }>;
  externalWorkshops: ExternalWorkshop[];
}

// ============================================================================
// DEFAULT VISIBLE FILTERS
// ============================================================================

const DEFAULT_VISIBLE_FILTER_IDS = ['status', 'vehicle', 'workshop_entry_date'];

// ============================================================================
// STATUS ICONS
// ============================================================================

const statusIcons: Record<string, LucideIcon> = {
  scheduled: Clock,
  in_workshop: Settings,
  pending_workshop_validation: Activity,
  pending_operations_validation: Activity,
  operations_rejected: XCircle,
  workshop_rejected: XCircle,
  completed: CheckCircle2,
};

// ============================================================================
// CLIENT COMPONENT
// ============================================================================

export function _MaintenanceOrderDataTable({
  data,
  totalRows,
  searchParams,
  tableId,
  initialColumnVisibility,
  initialFilterVisibility,
  sectors,
  repairTypes,
  externalWorkshops,
}: Props) {
  const [selectedOrder, setSelectedOrder] = useState<MaintenanceOrderListItem | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // ─── Manage Order Wizard state ──────────────────────────────────────────
  const [manageOrder, setManageOrder] = useState<OrderManagementItem | null>(null);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [loadingManageOrder, setLoadingManageOrder] = useState(false);

  // ─── Requested Items dialog state ───────────────────────────────────────
  const [itemsOrder, setItemsOrder] = useState<MaintenanceOrderListItem | null>(null);
  const [itemsDialogOpen, setItemsDialogOpen] = useState(false);

  const handleViewItems = (order: MaintenanceOrderListItem) => {
    setItemsOrder(order);
    setItemsDialogOpen(true);
  };

  const handleCloseItems = () => {
    setItemsDialogOpen(false);
    setItemsOrder(null);
  };

  const handleManageOrder = async (order: MaintenanceOrderListItem) => {
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
  };

  const handleCloseManage = () => {
    setManageDialogOpen(false);
    setManageOrder(null);
  };

  // ─── Detail Dialog Handlers ─────────────────────────────────────────────
  const handleViewDetail = (order: MaintenanceOrderListItem) => {
    setLoadingDetail(true);
    setSelectedOrder(order);
    setDetailDialogOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailDialogOpen(false);
    setSelectedOrder(null);
  };

  // ─── Extraer params de facets (sin page/sort) ─────────────────────────────
  const facetParams = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { page, pageSize, sort, sortBy, sortOrder, ...rest } = searchParams;
    return rest;
  }, [searchParams]);

  // ─── Facets con cross-filtering ───────────────────────────────────────────
  const { data: facets, isFetching: isFetchingFacets } = useQuery({
    queryKey: ['maintenance-orders-facets', facetParams],
    queryFn: () => getMaintenanceOrdersFacets(facetParams),
    staleTime: 5 * 60 * 1000,
  });

  // ─── Columnas ─────────────────────────────────────────────────────────────
  const columns = useMemo(
    () =>
      getMaintenanceOrdersColumns({
        onViewDetail: handleViewDetail,
        onManageOrder: handleManageOrder,
        onViewItems: handleViewItems,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ─── Column visibility ────────────────────────────────────────────────────
  const mergedColumnVisibility = useMemo(() => {
    const defaults = Object.fromEntries(HIDDEN_COLUMNS_BY_DEFAULT.map((col) => [col, false]));
    return { ...defaults, ...initialColumnVisibility };
  }, [initialColumnVisibility]);

  // ─── Filter visibility ────────────────────────────────────────────────────
  const mergedFilterVisibility = useMemo(() => {
    if (initialFilterVisibility && Object.keys(initialFilterVisibility).length > 0) {
      return initialFilterVisibility;
    }
    const allFilterIds = [
      'status',
      'vehicle',
      'workshop_entry_date',
      'created_at',
      'domain',
      'serie',
      'intern_number',
      'order_number',
    ];
    return Object.fromEntries(allFilterIds.map((id) => [id, DEFAULT_VISIBLE_FILTER_IDS.includes(id)]));
  }, [initialFilterVisibility]);

  // ─── Filtros facetados ────────────────────────────────────────────────────
  const facetedFilters: DataTableFacetedFilterConfig[] = useMemo(
    () => [
      // Estado (enum status)
      {
        columnId: 'status',
        title: 'Estado',
        options: [
          ...Object.entries(statusLabels).map(([value, label]) => ({
            value,
            label,
            icon: statusIcons[value],
          })),
          ...(facets?.status?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin estado', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.status,
      },

      // Equipo (FK UUID → vehicles)
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

      // Fecha ingreso a taller (dateRange)
      {
        columnId: 'workshop_entry_date',
        title: 'Ingreso a Taller',
        type: 'dateRange' as const,
      },

      // Fecha creación (dateRange) — oculto por defecto
      {
        columnId: 'created_at',
        title: 'Fecha Creación',
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

      // Número interno (texto libre en vehicles)
      {
        columnId: 'intern_number',
        title: 'N° Interno',
        type: 'text' as const,
        placeholder: 'Buscar por número interno...',
      },

      // N° Orden (texto libre)
      {
        columnId: 'order_number',
        title: 'N° Orden',
        type: 'text' as const,
        placeholder: 'Buscar por N° orden...',
      },
    ],
    [facets]
  );

  // ─── Export config ─────────────────────────────────────────────────────────
  const exportConfig = useMemo(
    () => ({
      options: { filename: 'ordenes-mantenimiento', sheetName: 'Órdenes de Mantenimiento' },
      fetchAllData: () => getAllMaintenanceOrdersForExport(searchParams),
      formatters: {
        vehicle: (_val: unknown, row: MaintenanceOrderListItem) => {
          const vehicle = row.vehicles;
          const label = vehicle?.domain ?? vehicle?.serie ?? 'Sin identificar';
          return vehicle?.intern_number ? `${label} (#${vehicle.intern_number})` : label;
        },
        workshop_entry_date: (val: unknown) => (val ? moment(val as string).format('DD/MM/YYYY') : ''),
        created_at: (val: unknown) => (val ? moment(val as string).format('DD/MM/YYYY HH:mm') : ''),
        status: (val: unknown) => {
          const status = val as string;
          return statusLabels[status] ?? status ?? '';
        },
        progress: (_val: unknown, row: MaintenanceOrderListItem) => {
          let total = 0;
          let completed = 0;
          for (const item of row.maintenance_order_items ?? []) {
            if (item.is_diagnostico) continue;
            const wo = item.work_orders;
            if (wo) {
              for (const woItem of wo.work_order_items ?? []) {
                for (const repair of woItem.work_order_item_repairs ?? []) {
                  total++;
                  if (repair.status === 'completed') completed++;
                }
              }
            }
          }
          const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
          return `${percent}%`;
        },
        currentSector: (_val: unknown, row: MaintenanceOrderListItem) => {
          const items = row.maintenance_order_items ?? [];
          const sectorMap = new Map<string, { name: string; order: number }>();
          for (const item of items) {
            const sectorId = item.assigned_sector_id;
            if (!sectorId) continue;
            const sectorName = item.workshop_sectors?.name ?? 'Sin nombre';
            if (!sectorMap.has(sectorId)) {
              sectorMap.set(sectorId, { name: sectorName, order: item.sector_sequence_order ?? 999 });
            }
          }
          if (sectorMap.size === 0) return 'Sin asignar';
          const sorted = Array.from(sectorMap.values()).sort((a, b) => a.order - b.order);
          return sorted[0].name;
        },
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
        searchPlaceholder="Buscar por N° orden, dominio..."
        emptyMessage="No hay órdenes de mantenimiento"
        showFilterToggle={true}
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

      {/* Dialog de detalle */}
      <OrderDetailDialog
        orderId={selectedOrder?.id}
        open={detailDialogOpen}
        onClose={handleCloseDetail}
        onLoaded={() => setLoadingDetail(false)}
        context="workshop"
      />

      {/* Dialog con la lista de items solicitados */}
      <RequestedItemsDialog order={itemsOrder} open={itemsDialogOpen} onClose={handleCloseItems} />

      {/* Loading overlay para carga de datos de gestión */}
      {loadingManageOrder && (
        <div className="fixed inset-0 bg-background/50 flex items-center justify-center z-50">
          <div className="bg-card p-4 rounded-lg shadow-lg flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm">Cargando datos de gestión...</span>
          </div>
        </div>
      )}

      {/* Wizard de gestión de órdenes */}
      <ManageOrderWizard
        order={manageOrder}
        open={manageDialogOpen}
        onClose={handleCloseManage}
        sectors={sectors}
        repairTypes={repairTypes}
        externalWorkshops={externalWorkshops}
      />
    </>
  );
}
