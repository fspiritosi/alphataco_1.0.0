'use client';

import {
  affiliate_status_enum,
  document_type_enum,
  gender_enum,
  nationality_enum,
  status_type,
} from '@/generated/prisma/enums';
import {
  DataTable,
  type DataTableFacetedFilterConfig,
  type DataTableSearchParams,
  type FacetResult,
} from '@/shared/components/common/DataTable';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import {
  affiliateStatusLabels,
  documentTypeLabels,
  employeeStatusLabels,
  genderLabels,
  nationalityLabels,
} from '@/shared/utils/mappers';
import type { LucideIcon } from 'lucide-react';
import { CircleOff } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import {
  getActiveEmployeesPaginated,
  getEmployeeSelectorSingleFacet,
  type EmployeeSelectorItem,
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
// TYPES
// ============================================================================

interface EmployeeSelectorDataTableProps {
  data: EmployeeSelectorItem[];
  totalRows: number;
  searchParams: DataTableSearchParams;
  reportDate: string;
  alreadySelectedIds: string[];
  selectedCustomerId: string | null;
  tableId: string;
  initialColumnVisibility?: Record<string, boolean>;
  initialFilterVisibility?: Record<string, boolean>;
  onRowSelectionChange?: (rows: EmployeeSelectorItem[]) => void;
}

// ============================================================================
// DEFAULT VISIBLE FILTERS
// ============================================================================

const DEFAULT_VISIBLE_FILTERS = ['hierarchy', 'company_positions', 'status'];

// ============================================================================
// COMPONENT
// ============================================================================

export default function _EmployeeSelectorDataTable({
  data,
  totalRows,
  searchParams,
  reportDate,
  alreadySelectedIds,
  selectedCustomerId,
  tableId,
  initialColumnVisibility,
  initialFilterVisibility,
  onRowSelectionChange,
}: EmployeeSelectorDataTableProps) {
  // ─── Client-side navigation ────────────────────────────────────────────────
  const [currentParams, setCurrentParams] = useState<DataTableSearchParams>(searchParams);

  const handleStateChange = useCallback((params: DataTableSearchParams) => {
    setCurrentParams(params);
  }, []);

  const tableQueryFn = useCallback(
    (params: DataTableSearchParams) => getActiveEmployeesPaginated(params, reportDate),
    [reportDate]
  );

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
      'hierarchy',
      'company_positions',
      'work_diagram',
      'contractor_employee',
      'empleado_aptitudes',
      'status',
      'gender',
      'nationality',
      'document_type',
      'affiliate_status',
      'province',
      'file',
      'cuil',
      'document_number',
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
        const result = await getEmployeeSelectorSingleFacet(columnId, params, reportDate);
        if (!result) return { options: [], counts: new Map() };
        return buildEnumFacetResult(enumValues, labels, icons, result.counts);
      },
    [reportDate]
  );

  const makeFkFetchFacet = useCallback(
    (columnId: string, nullLabel = 'Sin asignar') =>
      async (params: DataTableSearchParams): Promise<FacetResult> => {
        const result = await getEmployeeSelectorSingleFacet(columnId, params, reportDate);
        if (!result) return { options: [], counts: new Map() };
        return buildFkFacetResult(result.resolvedOptions, result.counts, nullLabel);
      },
    [reportDate]
  );

  // ─── Faceted filters ──────────────────────────────────────────────────────
  const facetedFilters: DataTableFacetedFilterConfig[] = useMemo(
    () => [
      // ── FK UUID ──────────────────────────────────────────────────────────
      { columnId: 'hierarchy', title: 'Sector', fetchFacet: makeFkFetchFacet('hierarchy') },
      {
        columnId: 'company_positions',
        title: 'Puesto',
        fetchFacet: makeFkFetchFacet('company_positions'),
      },
      {
        columnId: 'work_diagram',
        title: 'Diagrama',
        fetchFacet: makeFkFetchFacet('work_diagram'),
      },

      // ── M:M ──────────────────────────────────────────────────────────────
      {
        columnId: 'contractor_employee',
        title: 'Afectaciones',
        fetchFacet: makeFkFetchFacet('contractor_employee', 'Sin afectar'),
      },
      {
        columnId: 'empleado_aptitudes',
        title: 'Aptitudes',
        fetchFacet: makeFkFetchFacet('empleado_aptitudes', 'Sin aptitudes'),
      },

      // ── Enums ────────────────────────────────────────────────────────────
      {
        columnId: 'status',
        title: 'Estado doc.',
        fetchFacet: makeEnumFetchFacet('status', Object.values(status_type), employeeStatusLabels, {}),
      },
      {
        columnId: 'gender',
        title: 'Genero',
        fetchFacet: makeEnumFetchFacet('gender', Object.values(gender_enum), genderLabels, {}),
      },
      {
        columnId: 'nationality',
        title: 'Nacionalidad',
        fetchFacet: makeEnumFetchFacet('nationality', Object.values(nationality_enum), nationalityLabels, {}),
      },
      {
        columnId: 'document_type',
        title: 'Tipo de Documento',
        fetchFacet: makeEnumFetchFacet('document_type', Object.values(document_type_enum), documentTypeLabels, {}),
      },
      {
        columnId: 'affiliate_status',
        title: 'Estado de afiliacion',
        fetchFacet: makeEnumFetchFacet(
          'affiliate_status',
          Object.values(affiliate_status_enum),
          affiliateStatusLabels,
          {}
        ),
      },

      // ── FK BigInt ────────────────────────────────────────────────────────
      { columnId: 'province', title: 'Provincia', fetchFacet: makeFkFetchFacet('province') },

      // ── Texto libre ──────────────────────────────────────────────────────
      { columnId: 'file', title: 'Legajo', type: 'text' as const, placeholder: 'Buscar por legajo...' },
      { columnId: 'cuil', title: 'CUIL', type: 'text' as const, placeholder: 'Buscar por CUIL...' },
      {
        columnId: 'document_number',
        title: 'Documento',
        type: 'text' as const,
        placeholder: 'Buscar por numero de documento...',
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
      paramNamespace="emp-sel"
      facetedFilters={facetedFilters}
      initialColumnVisibility={mergedColumnVisibility}
      initialFilterVisibility={mergedFilterVisibility}
      showFilterToggle
      searchPlaceholder="Buscar por legajo o nombre..."
      emptyMessage="No se encontraron empleados"
      enableRowSelection
      showRowSelection
      onRowSelectionChange={onRowSelectionChange}
      // Client-side navigation
      queryFn={tableQueryFn}
      queryKey={['employee-selector', reportDate]}
      onStateChange={handleStateChange}
      exportConfig={{
        fetchAllData: async () => {
          const { data: allData } = await getActiveEmployeesPaginated(currentParams, reportDate);
          return allData;
        },
        options: {
          filename: 'empleados-selector',
          sheetName: 'Empleados',
          title: 'Seleccion de Empleados',
        },
        formatters: {
          status: (value) => (value ? employeeStatusLabels[value as string] ?? String(value) : '—'),
          gender: (value) => (value ? genderLabels[value as string] ?? String(value) : '—'),
          nationality: (value) => (value ? nationalityLabels[value as string] ?? String(value) : '—'),
          document_type: (value) => (value ? documentTypeLabels[value as string] ?? String(value) : '—'),
          affiliate_status: (value) => (value ? affiliateStatusLabels[value as string] ?? String(value) : '—'),
          contractor_employee: (_value, row) => {
            const contractors = (row as EmployeeSelectorItem).contractor_employee ?? [];
            const names = contractors.map((c) => c.customers?.name ?? '').filter(Boolean);
            return names.length > 0 ? names.join(', ') : 'Sin afectar';
          },
          empleado_aptitudes: (_value, row) => {
            const aptitudes = (row as EmployeeSelectorItem).empleado_aptitudes ?? [];
            const names = aptitudes.map((a) => a.aptitudes_tecnicas?.nombre ?? '').filter(Boolean);
            return names.length > 0 ? names.join(', ') : '—';
          },
          province: (_value, row) => (row as EmployeeSelectorItem).provinces?.name ?? '—',
        },
      }}
      data-testid="employee-selector-table"
    />
  );
}
