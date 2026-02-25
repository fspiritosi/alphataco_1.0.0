'use client';

import {
  DataTable,
  type DataTableFacetedFilterConfig,
  type DataTableSearchParams,
} from '@/shared/components/common/DataTable';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import { formSourceLabels } from '@/shared/utils/mappers';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2,
  CircleOff,
  ClipboardCheck,
  FileText,
  XCircle,
} from 'lucide-react';
import moment from 'moment';
import { useMemo } from 'react';
import {
  getAllFormsForExport,
  getFormsFacets,
  type FormsListItem,
} from '../actions.server';
import { HIDDEN_COLUMNS_BY_DEFAULT, getColumns } from '../columns';

// ============================================================================
// PROPS
// ============================================================================

interface Props {
  data: FormsListItem[];
  totalRows: number;
  searchParams: DataTableSearchParams;
  tableId: string;
  permissionsMap: Record<string, boolean>;
  initialColumnVisibility: Record<string, boolean>;
  initialFilterVisibility: Record<string, boolean>;
}

// ============================================================================
// CLIENT COMPONENT
// ============================================================================

export function _FormsDataTable({
  data,
  totalRows,
  searchParams,
  tableId,
  permissionsMap,
  initialColumnVisibility,
  initialFilterVisibility,
}: Props) {
  // Helper de permisos desde el map serializable del servidor
  const permissions = useMemo(
    () => ({
      hasPermission: (module: string, tab: string, action: string) =>
        permissionsMap[`${module}:${tab}:${action}`] === true,
    }),
    [permissionsMap]
  );

  // Extraer solo los params relevantes para facets (sin page/sort/pageSize)
  const facetParams = useMemo(() => {
    const { page, pageSize, sort, sortBy, sortOrder, ...rest } = searchParams;
    return rest as DataTableSearchParams;
  }, [searchParams]);

  // Facets
  const { data: facets } = useQuery({
    queryKey: ['forms-list-facets', facetParams],
    queryFn: () => getFormsFacets(facetParams),
    staleTime: 5 * 60 * 1000,
  });

  // Columnas ocultas por defecto
  const mergedColumnVisibility = useMemo(() => {
    const defaults = Object.fromEntries(HIDDEN_COLUMNS_BY_DEFAULT.map((col) => [col, false]));
    return { ...defaults, ...initialColumnVisibility };
  }, [initialColumnVisibility]);

  // Filtros visibles por defecto — máximo 3
  const DEFAULT_VISIBLE_FILTERS = ['is_active', 'source', 'created_at'];
  const mergedFilterVisibility = useMemo(() => {
    if (initialFilterVisibility && Object.keys(initialFilterVisibility).length > 0) {
      return initialFilterVisibility;
    }
    const allFilterIds = ['is_active', 'source', 'name', 'description', 'code', 'created_at'];
    return Object.fromEntries(
      allFilterIds.map((id) => [id, DEFAULT_VISIBLE_FILTERS.includes(id)])
    );
  }, [initialFilterVisibility]);

  // ─── Filtros facetados ──────────────────────────────────────────────────────
  const facetedFilters: DataTableFacetedFilterConfig[] = useMemo(
    () => [
      // Estado activo/inactivo (faceted, con iconos)
      {
        columnId: 'is_active',
        title: 'Estado',
        options: [
          { value: 'true', label: 'Activo', icon: CheckCircle2 },
          { value: 'false', label: 'Inactivo', icon: XCircle },
          ...(facets?.is_active?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.is_active,
      },

      // Tipo / Fuente (faceted, con iconos de tipo)
      {
        columnId: 'source',
        title: 'Tipo',
        options: [
          { value: 'checklist_template', label: formSourceLabels['checklist_template'], icon: ClipboardCheck },
          { value: 'custom_form', label: formSourceLabels['custom_form'], icon: FileText },
        ],
        externalCounts: facets?.source,
      },

      // Nombre (filtro de texto)
      {
        columnId: 'name',
        title: 'Nombre',
        type: 'text' as const,
        placeholder: 'Filtrar por nombre...',
      },

      // Descripción (filtro de texto)
      {
        columnId: 'description',
        title: 'Descripción',
        type: 'text' as const,
        placeholder: 'Filtrar por descripción...',
      },

      // Código (filtro de texto)
      {
        columnId: 'code',
        title: 'Código',
        type: 'text' as const,
        placeholder: 'Filtrar por código...',
      },

      // Fecha de creación (dateRange)
      {
        columnId: 'created_at',
        title: 'Fecha de creación',
        type: 'dateRange' as const,
      },
    ],
    [facets]
  );

  // ─── Columnas ────────────────────────────────────────────────────────────────
  const columns = useMemo(() => getColumns(permissions), [permissions]);

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <DataTable
      columns={columns}
      data={data}
      totalRows={totalRows}
      searchParams={searchParams}
      searchPlaceholder="Buscar formularios por nombre o descripción..."
      facetedFilters={facetedFilters}
      initialColumnVisibility={mergedColumnVisibility}
      initialFilterVisibility={mergedFilterVisibility}
      tableId={tableId}
      paramNamespace={tableId}
      showFilterToggle={true}
      emptyMessage="No hay formularios registrados"
      data-testid="forms-table"
      exportConfig={{
        fetchAllData: () => getAllFormsForExport(searchParams),
        options: {
          filename: 'formularios',
          title: 'Listado de Formularios',
          sheetName: 'Formularios',
        },
        formatters: {
          is_active: (val) => (val ? 'Activo' : 'Inactivo'),
          source: (val) => formSourceLabels[val as string] ?? String(val ?? ''),
          created_at: (val) => (val ? moment(val as string).format('DD/MM/YYYY') : ''),
          total_responses: (val) => String(val ?? 0),
          code: (val) => String(val ?? ''),
          description: (val) => String(val ?? ''),
          frequency: (val) => String(val ?? ''),
        },
      }}
    />
  );
}
