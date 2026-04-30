'use client';

import { condition_enum, status_type } from '@/generated/prisma/enums';
import {
  DataTable,
  type DataTableFacetedFilterConfig,
  type DataTableSearchParams,
  type FacetResult,
} from '@/shared/components/common/DataTable';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import { conditionLabels, employeeStatusLabels } from '@/shared/utils/mappers';
import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, CheckCircle2, CircleOff, Settings2, Wrench, XCircle } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import {
  getActiveEquipmentPaginated,
  getEquipmentSelectorSingleFacet,
  type EquipmentSelectorItem,
} from './actions.server';
import { HIDDEN_COLUMNS_BY_DEFAULT, getColumns } from './columns';

// ============================================================================
// HELPERS — FacetResult builders
// ============================================================================

function buildEnumFacetResult(
  enumValues: string[],
  labels: Record<string, string>,
  icons: Record<string, LucideIcon | undefined>,
  counts: Map<string, number>
): FacetResult {
  return {
    options: [
      ...enumValues.map((value) => ({
        value,
        label: labels[value] ?? value,
        icon: icons[value],
      })),
      ...(counts.has(NULL_FILTER_VALUE) ? [{ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff }] : []),
    ],
    counts,
  };
}

function buildFkFacetResult(
  resolvedOptions: Array<{ id: string; name: string | null }> | undefined,
  counts: Map<string, number>,
  nullLabel = 'Sin asignar'
): FacetResult {
  return {
    options: [
      ...(resolvedOptions?.map((o) => ({ value: o.id, label: o.name ?? '' })) ?? []),
      ...(counts.has(NULL_FILTER_VALUE) ? [{ value: NULL_FILTER_VALUE, label: nullLabel, icon: CircleOff }] : []),
    ],
    counts,
  };
}

// ============================================================================
// CONDITION ICONS MAP (for the filter options)
// ============================================================================

const conditionFilterIcons: Record<string, LucideIcon | undefined> = {
  operativo: CheckCircle2,
  no_operativo: XCircle,
  en_reparacion: Wrench,
  operativo_condicionado: AlertTriangle,
  en_preparacion: Settings2,
};

// ============================================================================
// TYPES
// ============================================================================

interface EquipmentSelectorDataTableProps {
  data: EquipmentSelectorItem[];
  totalRows: number;
  searchParams: DataTableSearchParams;
  alreadySelectedIds: string[];
  selectedCustomerId: string | null;
  tableId: string;
  initialColumnVisibility?: Record<string, boolean>;
  initialFilterVisibility?: Record<string, boolean>;
  onRowSelectionChange?: (rows: EquipmentSelectorItem[]) => void;
}

// ============================================================================
// DEFAULT VISIBLE FILTERS
// ============================================================================

const DEFAULT_VISIBLE_FILTERS = ['type', 'status', 'condition'];

// ============================================================================
// COMPONENT
// ============================================================================

export default function _EquipmentSelectorDataTable({
  data,
  totalRows,
  searchParams,
  alreadySelectedIds,
  selectedCustomerId,
  tableId,
  initialColumnVisibility,
  initialFilterVisibility,
  onRowSelectionChange,
}: EquipmentSelectorDataTableProps) {
  // ─── Client-side navigation ────────────────────────────────────────────────
  const [currentParams, setCurrentParams] = useState<DataTableSearchParams>(searchParams);

  const handleStateChange = useCallback((params: DataTableSearchParams) => {
    setCurrentParams(params);
  }, []);

  const tableQueryFn = useCallback((params: DataTableSearchParams) => getActiveEquipmentPaginated(params), []);

  // ─── Columns ──────────────────────────────────────────────────────────────
  const columns = useMemo(
    () => getColumns({ alreadySelectedIds, selectedCustomerId }),
    [alreadySelectedIds, selectedCustomerId]
  );

  // ─── Column visibility ────────────────────────────────────────────────────
  const mergedColumnVisibility = useMemo(() => {
    const defaults: Record<string, boolean> = {};
    for (const col of HIDDEN_COLUMNS_BY_DEFAULT) {
      defaults[col] = false;
    }
    return { ...defaults, ...initialColumnVisibility };
  }, [initialColumnVisibility]);

  // ─── Filter visibility ────────────────────────────────────────────────────
  const mergedFilterVisibility = useMemo(() => {
    if (initialFilterVisibility && Object.keys(initialFilterVisibility).length > 0) {
      return initialFilterVisibility;
    }
    const allFilterIds = [
      'type',
      'status',
      'condition',
      'brand',
      'model',
      'type_of_vehicle',
      'sub_type',
      'contractor_equipment',
      'domain',
      'intern_number',
      'year',
      'chassis',
      'engine',
      'serie',
      'kilometer',
    ];
    return Object.fromEntries(allFilterIds.map((id) => [id, DEFAULT_VISIBLE_FILTERS.includes(id)]));
  }, [initialFilterVisibility]);

  // ─── fetchFacet factories ─────────────────────────────────────────────────

  const makeEnumFetchFacet = useCallback(
    (
      columnId: string,
      enumValues: string[],
      labels: Record<string, string>,
      icons: Record<string, LucideIcon | undefined>
    ) =>
      async (params: DataTableSearchParams): Promise<FacetResult> => {
        const result = await getEquipmentSelectorSingleFacet(columnId, params);
        if (!result) return { options: [], counts: new Map() };
        return buildEnumFacetResult(enumValues, labels, icons, result.counts);
      },
    []
  );

  const makeFkFetchFacet = useCallback(
    (columnId: string, nullLabel = 'Sin asignar') =>
      async (params: DataTableSearchParams): Promise<FacetResult> => {
        const result = await getEquipmentSelectorSingleFacet(columnId, params);
        if (!result) return { options: [], counts: new Map() };
        return buildFkFacetResult(result.resolvedOptions, result.counts, nullLabel);
      },
    []
  );

  // ─── Faceted filters ──────────────────────────────────────────────────────
  const facetedFilters: DataTableFacetedFilterConfig[] = useMemo(
    () => [
      // ── FK UUID ──────────────────────────────────────────────────────────
      {
        columnId: 'type',
        title: 'Tipo',
        fetchFacet: makeFkFetchFacet('type'),
      },
      {
        columnId: 'sub_type',
        title: 'Sub Tipo',
        fetchFacet: makeFkFetchFacet('sub_type'),
      },

      // ── Enum ─────────────────────────────────────────────────────────────
      {
        columnId: 'status',
        title: 'Estado doc.',
        fetchFacet: makeEnumFetchFacet('status', Object.values(status_type), employeeStatusLabels, {}),
      },
      {
        columnId: 'condition',
        title: 'Condición',
        fetchFacet: makeEnumFetchFacet(
          'condition',
          Object.values(condition_enum),
          conditionLabels,
          conditionFilterIcons
        ),
      },

      // ── FK Int ────────────────────────────────────────────────────────────
      {
        columnId: 'brand',
        title: 'Marca',
        fetchFacet: makeFkFetchFacet('brand'),
      },
      {
        columnId: 'model',
        title: 'Modelo',
        fetchFacet: makeFkFetchFacet('model'),
      },

      // ── FK BigInt ─────────────────────────────────────────────────────────
      {
        columnId: 'type_of_vehicle',
        title: 'Tipo de Vehículo',
        fetchFacet: makeFkFetchFacet('type_of_vehicle'),
      },

      // ── M:M ───────────────────────────────────────────────────────────────
      {
        columnId: 'contractor_equipment',
        title: 'Afectado a',
        fetchFacet: makeFkFetchFacet('contractor_equipment', 'Sin afectar'),
      },

      // ── Texto libre ───────────────────────────────────────────────────────
      {
        columnId: 'domain',
        title: 'Dominio',
        type: 'text' as const,
        placeholder: 'Buscar por dominio...',
      },
      {
        columnId: 'intern_number',
        title: 'Nro Interno',
        type: 'text' as const,
        placeholder: 'Buscar por número interno...',
      },
      {
        columnId: 'year',
        title: 'Año',
        type: 'text' as const,
        placeholder: 'Buscar por año...',
      },
      {
        columnId: 'chassis',
        title: 'Chassis',
        type: 'text' as const,
        placeholder: 'Buscar por chassis...',
      },
      {
        columnId: 'engine',
        title: 'Motor',
        type: 'text' as const,
        placeholder: 'Buscar por motor...',
      },
      {
        columnId: 'serie',
        title: 'Serie',
        type: 'text' as const,
        placeholder: 'Buscar por serie...',
      },
      {
        columnId: 'kilometer',
        title: 'Kilómetros',
        type: 'text' as const,
        placeholder: 'Buscar por kilómetros...',
      },
    ],
    [makeEnumFetchFacet, makeFkFetchFacet]
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <DataTable
      columns={columns}
      data={data}
      totalRows={totalRows}
      searchParams={searchParams}
      tableId={tableId}
      paramNamespace="eq-sel"
      facetedFilters={facetedFilters}
      initialColumnVisibility={mergedColumnVisibility}
      initialFilterVisibility={mergedFilterVisibility}
      showFilterToggle
      searchPlaceholder="Buscar por dominio o número interno..."
      emptyMessage="No se encontraron equipos"
      enableRowSelection
      showRowSelection
      onRowSelectionChange={onRowSelectionChange}
      // Client-side navigation
      queryFn={tableQueryFn}
      queryKey={['equipment-selector']}
      onStateChange={handleStateChange}
      exportConfig={{
        fetchAllData: async () => {
          const { data: allData } = await getActiveEquipmentPaginated(currentParams);
          return allData;
        },
        options: {
          filename: 'equipos-selector',
          sheetName: 'Equipos',
          title: 'Seleccion de Equipos',
        },
        formatters: {
          status: (value) => (value ? employeeStatusLabels[value as string] ?? String(value) : '—'),
          condition: (value) => (value ? conditionLabels[value as string] ?? String(value) : '—'),
          contractor_equipment: (_value, row) => {
            const contractors = (row as EquipmentSelectorItem).contractor_equipment ?? [];
            const names = contractors.map((c) => c.customers?.name ?? '').filter(Boolean);
            return names.length > 0 ? names.join(', ') : 'Sin afectar';
          },
          type: (_value, row) => (row as EquipmentSelectorItem).type_vehicles_typeTotype?.name ?? '—',
          sub_type: (_value, row) => (row as EquipmentSelectorItem).sub_type?.name ?? '—',
          brand: (_value, row) => (row as EquipmentSelectorItem).brand_vehicles?.name ?? '—',
          model: (_value, row) => (row as EquipmentSelectorItem).model_vehicles?.name ?? '—',
          type_of_vehicle: (_value, row) => (row as EquipmentSelectorItem).types_of_vehicles?.name ?? '—',
        },
      }}
      data-testid="equipment-selector-table"
    />
  );
}
