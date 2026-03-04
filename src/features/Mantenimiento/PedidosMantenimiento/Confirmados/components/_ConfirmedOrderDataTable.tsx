'use client';

import { ActivityHistoryModal } from '@/features/Mantenimiento/components/ActivityHistoryModal';
import {
  DataTable,
  type DataTableFacetedFilterConfig,
  type DataTableSearchParams,
} from '@/shared/components/common/DataTable';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import { conditionLabels } from '@/shared/utils/mappers';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  CircleOff,
  Settings2,
  Truck,
  Wrench,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import moment from 'moment';
import { useMemo, useState } from 'react';
import {
  getAllConfirmedOrdersForExport,
  getConfirmedOrdersFacets,
  type ConfirmedOrderListItem,
} from '../actions.server';
import { getConfirmedOrderColumns, HIDDEN_COLUMNS_BY_DEFAULT, SOURCE_ICONS, SOURCE_LABELS } from '../columns';
import { EntradaTallerDialog } from '../../components/EntradaTallerDialog';
import { PedidoDetailDialog } from '../../components/PedidoDetailDialog';

// ============================================================================
// TYPES
// ============================================================================

interface Props {
  data: ConfirmedOrderListItem[];
  totalRows: number;
  searchParams: DataTableSearchParams;
  tableId: string;
  canApproveWorkshopEntry: boolean;
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

export function _ConfirmedOrderDataTable({
  data,
  totalRows,
  searchParams,
  tableId,
  canApproveWorkshopEntry,
  initialColumnVisibility,
  initialFilterVisibility,
}: Props) {
  const [selectedOrder, setSelectedOrder] = useState<ConfirmedOrderListItem | null>(null);
  const [dialogType, setDialogType] = useState<'view' | 'workshop_entry' | null>(null);
  const [historyOrder, setHistoryOrder] = useState<ConfirmedOrderListItem | null>(null);

  // ─── Handlers de diálogos ────────────────────────────────────────────────
  const handleView = (order: ConfirmedOrderListItem) => {
    setSelectedOrder(order);
    setDialogType('view');
  };

  const handleApproveWorkshopEntry = (order: ConfirmedOrderListItem) => {
    setSelectedOrder(order);
    setDialogType('workshop_entry');
  };

  const handleCloseDialog = () => {
    setSelectedOrder(null);
    setDialogType(null);
  };

  const handleViewHistory = (order: ConfirmedOrderListItem) => {
    setHistoryOrder(order);
  };

  const handleCloseHistory = () => {
    setHistoryOrder(null);
  };

  // ─── Extraer params de facets (sin page/sort) ────────────────────────────
  const facetParams = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { page, pageSize, sort, sortBy, sortOrder, ...rest } = searchParams;
    return rest;
  }, [searchParams]);

  // ─── Facets con cross-filtering ──────────────────────────────────────────
  const { data: facets, isFetching: isFetchingFacets } = useQuery({
    queryKey: ['confirmed-orders-facets', facetParams],
    queryFn: () => getConfirmedOrdersFacets(facetParams),
    staleTime: 5 * 60 * 1000,
  });

  // ─── Columnas ────────────────────────────────────────────────────────────
  const columns = useMemo(
    () =>
      getConfirmedOrderColumns({
        onView: handleView,
        onApproveWorkshopEntry: handleApproveWorkshopEntry,
        onViewHistory: handleViewHistory,
        permissions: { canApproveWorkshopEntry },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canApproveWorkshopEntry]
  );

  // ─── Column visibility ───────────────────────────────────────────────────
  const mergedColumnVisibility = useMemo(() => {
    const defaults = Object.fromEntries(HIDDEN_COLUMNS_BY_DEFAULT.map((col) => [col, false]));
    return { ...defaults, ...initialColumnVisibility };
  }, [initialColumnVisibility]);

  // ─── Filter visibility ───────────────────────────────────────────────────
  const mergedFilterVisibility = useMemo(() => {
    if (initialFilterVisibility && Object.keys(initialFilterVisibility).length > 0) {
      return initialFilterVisibility;
    }
    const allFilterIds = [
      'vehicle',
      'condition',
      'source',
      'order_number',
      'scheduled_date',
      'created_at',
      'date_approved_at',
      'domain',
      'serie',
      'intern_number',
    ];
    return Object.fromEntries(allFilterIds.map((id) => [id, DEFAULT_VISIBLE_FILTER_IDS.includes(id)]));
  }, [initialFilterVisibility]);

  // ─── Filtros facetados ───────────────────────────────────────────────────
  const facetedFilters: DataTableFacetedFilterConfig[] = useMemo(
    () => [
      // Vehículo (FK UUID → vehicles)
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

      // Condición actual del equipo (enum condition_enum en vehicles)
      {
        columnId: 'condition',
        title: 'Condición',
        options: [
          ...Object.keys(conditionLabels).map((value) => {
            const iconMap: Record<string, LucideIcon> = {
              operativo: CheckCircle2,
              no_operativo: XCircle,
              en_reparacion: Wrench,
              operativo_condicionado: AlertCircle,
              en_preparacion: Settings2,
            };
            return {
              value,
              label: conditionLabels[value] ?? value,
              icon: iconMap[value] as LucideIcon | undefined,
            };
          }),
          ...(facets?.condition?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin condición', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.condition,
      },

      // Origen del pedido (facetado — campo source en maintenance_requests)
      {
        columnId: 'source',
        title: 'Origen',
        options: [
          ...Object.keys(SOURCE_LABELS).map((value) => ({
            value,
            label: SOURCE_LABELS[value] ?? value,
            icon: SOURCE_ICONS[value],
          })),
          ...(facets?.source?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin origen', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.source,
      },

      // Número de pedido (texto libre)
      {
        columnId: 'order_number',
        title: 'Nro. Pedido',
        type: 'text' as const,
        placeholder: 'Buscar por número de pedido...',
      },

      // Fecha planificada (dateRange)
      {
        columnId: 'scheduled_date',
        title: 'Fecha Planificada',
        type: 'dateRange' as const,
      },

      // Fecha creación (dateRange) — oculto por defecto
      {
        columnId: 'created_at',
        title: 'Fecha Creación',
        type: 'dateRange' as const,
      },

      // Fecha aprobación (dateRange) — oculto por defecto
      {
        columnId: 'date_approved_at',
        title: 'Fecha Aprobación',
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
    ],
    [facets]
  );

  // ─── Export config ────────────────────────────────────────────────────────
  const exportConfig = useMemo(
    () => ({
      options: { filename: 'pedidos-confirmados', sheetName: 'Pedidos Confirmados' },
      fetchAllData: () => getAllConfirmedOrdersForExport(searchParams),
      formatters: {
        vehicle: (_val: unknown, row: ConfirmedOrderListItem) => {
          const vehicle = row.vehicles;
          const label = vehicle?.domain ?? vehicle?.serie ?? 'Sin identificar';
          return vehicle?.intern_number ? `${label} (#${vehicle.intern_number})` : label;
        },
        order_number: (val: unknown) => String(val ?? ''),
        date_approved_at: (val: unknown) =>
          val ? moment(val as string).format('DD/MM/YYYY HH:mm') : '',
        scheduled_date: (val: unknown) =>
          val ? moment.utc(val as string).format('DD/MM/YYYY') : '',
        created_at: (val: unknown) =>
          val ? moment(val as string).format('DD/MM/YYYY HH:mm') : '',
        condition: (_val: unknown, row: ConfirmedOrderListItem) => {
          const condition = row.vehicles?.condition;
          return condition ? (conditionLabels[condition] ?? condition) : '';
        },
        items: (_val: unknown, row: ConfirmedOrderListItem) => {
          const count = row.maintenance_order_items?.length ?? 0;
          return String(count);
        },
        source: (_val: unknown, row: ConfirmedOrderListItem) => {
          const src = row.maintenance_requests?.source;
          return src ? (SOURCE_LABELS[src] ?? src) : '';
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
        searchPlaceholder="Buscar por dominio, serie..."
        emptyMessage="No hay pedidos confirmados"
        showFilterToggle={true}
      />

      {/* Diálogos de acción */}
      {selectedOrder && dialogType === 'view' && (
        <PedidoDetailDialog order={selectedOrder as never} open={true} onClose={handleCloseDialog} />
      )}

      {selectedOrder && dialogType === 'workshop_entry' && (
        <EntradaTallerDialog order={selectedOrder as never} open={true} onClose={handleCloseDialog} />
      )}

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
