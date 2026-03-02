'use client';

import {
  DataTable,
  type DataTableFacetedFilterConfig,
  type DataTableSearchParams,
} from '@/shared/components/common/DataTable';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import { useQuery } from '@tanstack/react-query';
import { CircleOff, Truck } from 'lucide-react';
import moment from 'moment';
import { useMemo, useState } from 'react';
import { getAllOrderManagementForExport, getOrderManagementFacets, type OrderManagementListItem } from './actions.server';
import { getOrderManagementColumns, HIDDEN_COLUMNS_BY_DEFAULT } from './columns';
import { ManageOrderWizard } from './components/ManageOrderWizard';
import type { ExternalWorkshop, WorkshopSector } from './actions/actionsServer';

// ============================================================================
// TYPES
// ============================================================================

interface Props {
  data: OrderManagementListItem[];
  totalRows: number;
  searchParams: DataTableSearchParams;
  tableId: string;
  sectors: WorkshopSector[];
  repairTypes: Array<{ id: string; name: string }>;
  externalWorkshops: ExternalWorkshop[];
  initialColumnVisibility: Record<string, boolean>;
  initialFilterVisibility: Record<string, boolean>;
}

// ============================================================================
// DEFAULT VISIBLE FILTERS
// ============================================================================

const DEFAULT_VISIBLE_FILTER_IDS = ['vehicle', 'vehicleType', 'workshop_entry_date'];

// ============================================================================
// CLIENT COMPONENT
// ============================================================================

export function _OrderManagementDataTable({
  data,
  totalRows,
  searchParams,
  tableId,
  sectors,
  repairTypes,
  externalWorkshops,
  initialColumnVisibility,
  initialFilterVisibility,
}: Props) {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // ─── Derivar selectedOrder desde data para que siempre tenga datos frescos ─
  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) return null;
    return data.find((o) => o.id === selectedOrderId) ?? null;
  }, [selectedOrderId, data]);

  const handleManage = (order: OrderManagementListItem) => {
    setSelectedOrderId(order.id);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedOrderId(null);
  };

  // ─── Extraer params de facets (sin page/sort) ────────────────────────────
  const facetParams = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { page, pageSize, sort, sortBy, sortOrder, ...rest } = searchParams;
    return rest;
  }, [searchParams]);

  // ─── Facets con cross-filtering ──────────────────────────────────────────
  const { data: facets, isFetching: isFetchingFacets } = useQuery({
    queryKey: ['order-management-facets', facetParams],
    queryFn: () => getOrderManagementFacets(facetParams),
    staleTime: 5 * 60 * 1000,
  });

  // ─── Columnas ────────────────────────────────────────────────────────────
  const columns = useMemo(
    () => getOrderManagementColumns({ onManage: handleManage }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
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
      'vehicleType',
      'workshop_entry_date',
      'created_at',
      'order_number',
      'domain',
      'serie',
      'intern_number',
    ];
    return Object.fromEntries(allFilterIds.map((id) => [id, DEFAULT_VISIBLE_FILTER_IDS.includes(id)]));
  }, [initialFilterVisibility]);

  // ─── Filtros facetados ───────────────────────────────────────────────────
  const facetedFilters: DataTableFacetedFilterConfig[] = useMemo(
    () => [
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

      // Tipo de Equipo (FK BigInt anidado: vehicles.types_of_vehicles)
      {
        columnId: 'vehicleType',
        title: 'Tipo de Equipo',
        options: [
          ...(facets?.vehicleTypeOptions?.map((t) => ({
            value: t.id,
            label: t.name,
          })) ?? []),
          ...(facets?.vehicleType?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin tipo', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.vehicleType,
      },

      // Fecha Ingreso al Taller (dateRange)
      {
        columnId: 'workshop_entry_date',
        title: 'Ingreso al Taller',
        type: 'dateRange' as const,
      },

      // Fecha Creación (dateRange — oculto por defecto)
      {
        columnId: 'created_at',
        title: 'Fecha Creación',
        type: 'dateRange' as const,
      },

      // N° Orden (texto libre)
      {
        columnId: 'order_number',
        title: 'N° Orden',
        type: 'text' as const,
        placeholder: 'Buscar por número de orden...',
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

      // N° Interno (texto libre en vehicles)
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
      options: { filename: 'gestion-ordenes', sheetName: 'Gestión de Órdenes' },
      fetchAllData: () => getAllOrderManagementForExport(searchParams),
      formatters: {
        vehicle: (_val: unknown, row: OrderManagementListItem) => {
          const v = row.vehicles;
          const label = v?.domain ?? v?.serie ?? 'Sin identificar';
          return v?.intern_number ? `${label} (#${v.intern_number})` : label;
        },
        vehicleType: (_val: unknown, row: OrderManagementListItem) =>
          row.vehicles?.types_of_vehicles?.name ?? '',
        workshop_entry_date: (val: unknown) =>
          val ? moment(val as string).format('DD/MM/YYYY') : '',
        created_at: (val: unknown) =>
          val ? moment(val as string).format('DD/MM/YYYY HH:mm') : '',
        items: (_val: unknown, row: OrderManagementListItem) => {
          const items = row.maintenance_order_items.filter((i) => !i.is_diagnostico);
          const total = items.length;
          const assigned = items.filter((i) => i.assigned_sector_id).length;
          return `${assigned}/${total}`;
        },
        sectors: (_val: unknown, row: OrderManagementListItem) => {
          const sectorNames = new Set<string>();
          row.maintenance_order_items.forEach((item) => {
            if (item.workshop_sectors?.name) sectorNames.add(item.workshop_sectors.name);
          });
          return sectorNames.size > 0 ? Array.from(sectorNames).join(', ') : 'Sin asignar';
        },
        domain: (_val: unknown, row: OrderManagementListItem) => row.vehicles?.domain ?? '',
        serie: (_val: unknown, row: OrderManagementListItem) => row.vehicles?.serie ?? '',
        intern_number: (_val: unknown, row: OrderManagementListItem) =>
          row.vehicles?.intern_number ?? '',
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
        searchPlaceholder="Buscar por N° orden, dominio, serie..."
        emptyMessage="No hay órdenes en gestión"
        showFilterToggle={true}
      />

      <ManageOrderWizard
        order={selectedOrder as never}
        open={dialogOpen}
        onClose={handleCloseDialog}
        sectors={sectors}
        repairTypes={repairTypes}
        externalWorkshops={externalWorkshops}
      />
    </>
  );
}
