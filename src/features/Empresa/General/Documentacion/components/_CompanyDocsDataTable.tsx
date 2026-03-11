'use client';

import {
  DataTable,
  type DataTableFacetedFilterConfig,
  type DataTableSearchParams,
} from '@/shared/components/common/DataTable';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import { documentStateLabels, getEnumLabel } from '@/shared/utils/mappers';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, CircleOff, XCircle } from 'lucide-react';
import moment from 'moment';
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { getAllCompanyDocsForExport, getCompanyDocsFacets, type CompanyDocListItem } from '../actions.server';
import { HIDDEN_COLUMNS_BY_DEFAULT, documentStateIcons, getColumns } from './columns';

// ============================================================================
// STATE ENUM VALUES (enum `state`)
// ============================================================================

const STATE_VALUES = ['presentado', 'rechazado', 'aprobado', 'vencido', 'pendiente'] as const;

// ============================================================================
// TYPES
// ============================================================================

interface CompanyDocsDataTableProps {
  data: CompanyDocListItem[];
  totalRows: number;
  searchParams: DataTableSearchParams;
  tableId: string;
  initialColumnVisibility?: Record<string, boolean>;
  initialFilterVisibility?: Record<string, boolean>;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function _CompanyDocsDataTable({
  data,
  totalRows,
  searchParams,
  tableId,
  initialColumnVisibility,
  initialFilterVisibility,
}: CompanyDocsDataTableProps) {
  // Read current URL params for facets cross-filtering
  const urlSearchParams = useSearchParams();

  // Facet params: read from URL (namespaced) and strip prefix
  const facetParams = useMemo(() => {
    const prefix = `${tableId}__`;
    const params: DataTableSearchParams = {};
    urlSearchParams.forEach((value, key) => {
      if (key.startsWith(prefix)) {
        params[key.slice(prefix.length)] = value;
      }
    });
    // Remove pagination/sort keys — only filter params are relevant for facets
    const { page, pageSize, sort, sortBy, sortOrder, ...filterOnly } = params;
    return filterOnly;
  }, [urlSearchParams, tableId]);

  // ── Facets query (cross-filtering) ────────────────────────────────────────
  const { data: facets, isFetching: isFetchingFacets } = useQuery({
    queryKey: ['company-docs-facets', facetParams],
    queryFn: () => getCompanyDocsFacets(facetParams),
    staleTime: 5 * 60 * 1000,
  });

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns = useMemo(() => getColumns(), []);

  // ── Column visibility ─────────────────────────────────────────────────────
  const mergedColumnVisibility = useMemo(() => {
    const defaults: Record<string, boolean> = {};
    for (const col of HIDDEN_COLUMNS_BY_DEFAULT) {
      defaults[col] = false;
    }
    return { ...defaults, ...(initialColumnVisibility ?? {}) };
  }, [initialColumnVisibility]);

  // ── Filter visibility: 3 visible by default ───────────────────────────────
  const DEFAULT_VISIBLE_FILTERS = ['state', 'documentType', 'uploadedBy'];
  const mergedFilterVisibility = useMemo(() => {
    if (initialFilterVisibility && Object.keys(initialFilterVisibility).length > 0) {
      return initialFilterVisibility;
    }
    const allFilterIds = ['state', 'documentType', 'docType', 'mandatory', 'uploadedBy', 'created_at', 'period'];
    return Object.fromEntries(allFilterIds.map((id) => [id, DEFAULT_VISIBLE_FILTERS.includes(id)]));
  }, [initialFilterVisibility]);

  // ── Export: read current URL params for active filters ────────────────────
  const currentExportParams = useMemo(() => {
    const prefix = `${tableId}__`;
    const params: DataTableSearchParams = {};
    urlSearchParams.forEach((value, key) => {
      if (key.startsWith(prefix)) {
        params[key.slice(prefix.length)] = value;
      }
    });
    return params;
  }, [urlSearchParams, tableId]);

  // ── Faceted filters config ─────────────────────────────────────────────────
  const facetedFilters: DataTableFacetedFilterConfig[] = useMemo(
    () => [
      // ── state (enum) ─────────────────────────────────────────────────────
      {
        columnId: 'state',
        title: 'Estado',
        options: [
          ...STATE_VALUES.map((value) => ({
            value,
            label: documentStateLabels[value] ?? value,
            icon: documentStateIcons[value],
          })),
          ...(facets?.state?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.state,
      },

      // ── documentType (FK document_types) ─────────────────────────────────
      {
        columnId: 'documentType',
        title: 'Documento',
        options: [
          ...(facets?.docTypeOptions?.map((d) => ({ value: d.id, label: d.name ?? '' })) ?? []),
          ...(facets?.documentType?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.documentType,
      },

      // ── docType (Mensual / Permanente — filter by FK, display by is_it_montlhy) ─
      {
        columnId: 'docType',
        title: 'Tipo',
        options: facets?.docTypeOptions
          ? [
              ...facets.docTypeOptions
                .filter((d) => d.is_it_montlhy)
                .map((d) => ({ value: d.id, label: `Mensual: ${d.name}` })),
              ...facets.docTypeOptions
                .filter((d) => !d.is_it_montlhy)
                .map((d) => ({ value: d.id, label: `Permanente: ${d.name}` })),
            ]
          : [],
        externalCounts: facets?.documentType,
      },

      // ── mandatory (boolean from document_types.mandatory) ─────────────────
      {
        columnId: 'mandatory',
        title: 'Mandatorio',
        options: [
          { value: 'true', label: 'Sí', icon: CheckCircle2 },
          { value: 'false', label: 'No', icon: XCircle },
        ],
      },

      // ── uploadedBy (FK profile) ───────────────────────────────────────────
      {
        columnId: 'uploadedBy',
        title: 'Subido por',
        options: [
          ...(facets?.profileOptions?.map((p) => ({
            value: p.id,
            label: p.fullname ?? 'Sin nombre',
          })) ?? []),
          ...(facets?.uploadedBy?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Pendiente', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.uploadedBy,
      },

      // ── Date range ────────────────────────────────────────────────────────
      { columnId: 'created_at', title: 'Fecha de carga', type: 'dateRange' as const },

      // ── Text filter ───────────────────────────────────────────────────────
      {
        columnId: 'period',
        title: 'Período',
        type: 'text' as const,
        placeholder: 'Buscar por período...',
      },
    ],
    [facets]
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <DataTable
      columns={columns}
      data={data}
      totalRows={totalRows}
      searchParams={searchParams}
      tableId={tableId}
      paramNamespace={tableId}
      facetedFilters={facetedFilters}
      isFetchingFacets={isFetchingFacets}
      initialColumnVisibility={mergedColumnVisibility}
      initialFilterVisibility={mergedFilterVisibility}
      showFilterToggle
      searchPlaceholder="Buscar documentos..."
      emptyMessage="No se encontraron documentos"
      enableRowSelection
      showRowSelection
      exportConfig={{
        fetchAllData: () => getAllCompanyDocsForExport(currentExportParams),
        options: {
          filename: 'documentos-empresa',
          sheetName: 'Documentos',
          title: 'Documentos de Empresa',
        },
        formatters: {
          state: (value) => getEnumLabel(value as string, documentStateLabels),
          created_at: (value) => (value ? moment(value as string | Date).format('DD/MM/YYYY') : '-'),
          documentType: (_value, row) => (row as CompanyDocListItem).document_types?.name ?? '-',
          docType: (_value, row) =>
            (row as CompanyDocListItem).document_types?.is_it_montlhy ? 'Mensual' : 'Permanente',
          mandatory: (_value, row) => ((row as CompanyDocListItem).document_types?.mandatory ? 'Sí' : 'No'),
          uploadedBy: (_value, row) => (row as CompanyDocListItem).profile?.fullname ?? 'Pendiente',
          validity: (value, row) => {
            if (value) return String(value);
            if (!(row as CompanyDocListItem).document_types?.explired) return 'No vence';
            return 'Pendiente';
          },
          period: (value) => String(value ?? '-'),
        },
      }}
    />
  );
}
