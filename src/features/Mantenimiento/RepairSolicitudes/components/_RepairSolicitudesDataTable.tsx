'use client';

import {
  DataTable,
  type DataTableFacetedFilterConfig,
  type DataTableSearchParams,
} from '@/shared/components/common/DataTable';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import { repairCriticityLabels, repairStateLabels } from '@/shared/utils/mappers';
import { useQuery } from '@tanstack/react-query';
import { CircleOff } from 'lucide-react';
import moment from 'moment';
import { useMemo } from 'react';
import {
  getAllRepairSolicitudesForExport,
  getRepairSolicitudesFacets,
  type RepairSolicitudListItem,
} from '../actions.server';
import { HIDDEN_COLUMNS_BY_DEFAULT, columns, criticityIcons, repairStateIcons } from '../columns';

// ============================================================================
// TYPES
// ============================================================================

interface Props {
  data: RepairSolicitudListItem[];
  totalRows: number;
  searchParams: DataTableSearchParams;
  tableId: string;
  initialColumnVisibility: Record<string, boolean>;
  initialFilterVisibility: Record<string, boolean>;
}

// ============================================================================
// DEFAULT VISIBLE FILTERS
// ============================================================================

const DEFAULT_VISIBLE_FILTER_IDS = ['state', 'vehicle', 'reparation_type'];

// ============================================================================
// CLIENT COMPONENT
// ============================================================================

export function _RepairSolicitudesDataTable({
  data,
  totalRows,
  searchParams,
  tableId,
  initialColumnVisibility,
  initialFilterVisibility,
}: Props) {
  // Extraer solo los params relevantes para facets (sin page/sort)
  const facetParams = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { page, pageSize, sort, sortBy, sortOrder, ...rest } = searchParams;
    return rest;
  }, [searchParams]);

  // Facets con cross-filtering
  const { data: facets, isFetching: isFetchingFacets } = useQuery({
    queryKey: ['repair-solicitudes-facets', facetParams],
    queryFn: () => getRepairSolicitudesFacets(facetParams),
    staleTime: 5 * 60 * 1000,
  });

  // Merge column visibility: defaults + saved preferences
  const mergedColumnVisibility = useMemo(() => {
    const defaults = Object.fromEntries(HIDDEN_COLUMNS_BY_DEFAULT.map((col) => [col, false]));
    return { ...defaults, ...initialColumnVisibility };
  }, [initialColumnVisibility]);

  // Merge filter visibility
  const mergedFilterVisibility = useMemo(() => {
    if (initialFilterVisibility && Object.keys(initialFilterVisibility).length > 0) {
      return initialFilterVisibility;
    }
    const allFilterIds = [
      'state',
      'vehicle',
      'reparation_type',
      'criticity',
      'last_modified_by',
      'closed_by',
      'user_description',
      'domain',
      'serie',
      'intern_number',
      'created_at',
      'updated_at',
    ];
    return Object.fromEntries(allFilterIds.map((id) => [id, DEFAULT_VISIBLE_FILTER_IDS.includes(id)]));
  }, [initialFilterVisibility]);

  // ─── Filtros facetados ────────────────────────────────────────────────────
  const facetedFilters: DataTableFacetedFilterConfig[] = useMemo(
    () => [
      // Estado (enum repair_state)
      {
        columnId: 'state',
        title: 'Estado',
        options: [
          ...Object.keys(repairStateLabels).map((value) => {
            const Icon = repairStateIcons[value];
            return {
              value,
              label: repairStateLabels[value] ?? value,
              icon: Icon,
            };
          }),
          ...(facets?.state?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin estado', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.state,
      },

      // Vehículo (FK UUID → vehicles)
      {
        columnId: 'vehicle',
        title: 'Dominio',
        options: [
          ...(facets?.vehicleOptions?.map((v) => ({
            value: v.id,
            label: v.domain ?? v.id,
          })) ?? []),
          ...(facets?.vehicle?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin vehículo', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.vehicle,
      },

      // Tipo de reparación (FK UUID → types_of_repairs)
      {
        columnId: 'reparation_type',
        title: 'Tipo de reparación',
        options: [
          ...(facets?.repairTypeOptions?.map((t) => ({
            value: t.id,
            label: t.name ?? t.id,
          })) ?? []),
          ...(facets?.reparation_type?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin tipo', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.reparation_type,
      },

      // Criticidad (campo string en types_of_repairs)
      {
        columnId: 'criticity',
        title: 'Criticidad',
        options: [
          ...Object.keys(repairCriticityLabels).map((value) => {
            const Icon = criticityIcons[value];
            return {
              value,
              label: repairCriticityLabels[value] ?? value,
              icon: Icon,
            };
          }),
          ...(facets?.criticity?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin criticidad', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.criticity,
      },

      // Últ. modificación por (FK profile UUID)
      {
        columnId: 'last_modified_by',
        title: 'Últ. modif. por',
        options: [
          ...(facets?.lastModifiedByOptions?.map((p) => ({
            value: p.id,
            label: p.fullname ?? p.id,
          })) ?? []),
          ...(facets?.last_modified_by?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin modificación', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.last_modified_by,
      },

      // Cerrada por (profile UUID del log con title 'Finalizado')
      {
        columnId: 'closed_by',
        title: 'Cerrada por',
        options: [
          ...(facets?.closedByOptions?.map((p) => ({
            value: p.id,
            label: p.fullname ?? p.id,
          })) ?? []),
          ...(facets?.closed_by?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Abierta / sin cerrar', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.closed_by,
      },

      // Descripción (texto libre)
      {
        columnId: 'user_description',
        title: 'Descripción',
        type: 'text' as const,
        placeholder: 'Buscar en descripción...',
      },

      // Dominio (texto libre en vehicles)
      {
        columnId: 'domain',
        title: 'Dominio (texto)',
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
        placeholder: 'Buscar por N° interno...',
      },

      // Fecha de creación (rango)
      {
        columnId: 'created_at',
        title: 'Fecha de creación',
        type: 'dateRange' as const,
      },

      // Fecha de modificación (rango)
      {
        columnId: 'updated_at',
        title: 'Últ. modificación',
        type: 'dateRange' as const,
      },
    ],
    [facets]
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <DataTable
      columns={columns}
      data={data}
      totalRows={totalRows}
      searchParams={searchParams}
      searchPlaceholder="Buscar por dominio, descripción..."
      facetedFilters={facetedFilters}
      initialColumnVisibility={mergedColumnVisibility}
      initialFilterVisibility={mergedFilterVisibility}
      tableId={tableId}
      paramNamespace={tableId}
      showFilterToggle={true}
      isFetchingFacets={isFetchingFacets}
      emptyMessage="No hay solicitudes de reparación registradas"
      data-testid="repair-solicitudes-table"
      exportConfig={{
        fetchAllData: () => getAllRepairSolicitudesForExport(searchParams),
        options: {
          filename: 'solicitudes-reparacion',
          title: 'Listado de Solicitudes de Reparación',
          sheetName: 'Solicitudes',
        },
        formatters: {
          state: (val) => repairStateLabels[val as string] ?? String(val ?? ''),
          criticity: (val) => repairCriticityLabels[val as string] ?? String(val ?? ''),
          created_at: (val) => (val ? moment(val as string).format('DD/MM/YYYY') : ''),
          updated_at: (val) => (val ? moment(val as string).format('DD/MM/YYYY HH:mm') : ''),
        },
      }}
    />
  );
}
