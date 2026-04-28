'use client';

import { DataTable } from '@/shared/components/common/DataTable';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import type {
  DataTableFacetedFilterConfig,
  DataTableFilterOption,
  DataTableSearchParams,
  FacetResult,
} from '@/shared/components/common/DataTable/types';
import { AlertTriangle, Check, CheckCircle2, CircleDashed, CircleOff, X, XCircle } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import {
  getAllWorkshopSectorTasksForExport,
  getWorkshopSectorTasksPaginated,
  getWorkshopSectorTasksSingleFacet,
  type WorkshopSectorTaskListItem,
} from './actions.server';
import {
  HIDDEN_COLUMNS_BY_DEFAULT,
  IS_CRITICAL_LABELS,
  IS_REJECTED_LABELS,
  MO_STATUS_CONFIG,
  WO_STATUS_CONFIG,
  getWorkshopSectorTasksColumns,
  getWorkshopSectorTasksExportFormatters,
} from './columns';

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_VISIBLE_FILTERS = ['wo_status', 'mo_status', 'repair_type'];

// ============================================================================
// PROPS
// ============================================================================

interface Props {
  sectorId: string;
  data: WorkshopSectorTaskListItem[];
  totalRows: number;
  searchParams: DataTableSearchParams;
  tableId: string;
  initialColumnVisibility?: Record<string, boolean>;
  initialFilterVisibility?: Record<string, boolean>;
}

// ============================================================================
// HELPERS — builders para FacetResult
// ============================================================================

/** Construye FacetResult para enums: opciones estáticas + counts del servidor */
function buildEnumFacetResult(options: DataTableFilterOption[], counts: Map<string, number>): FacetResult {
  return { options, counts };
}

/** Construye FacetResult para FK/relaciones: opciones resueltas del servidor + counts */
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
// COMPONENT
// ============================================================================

export function _WorkshopSectorTasksDataTable({
  sectorId,
  data,
  totalRows,
  searchParams,
  tableId,
  initialColumnVisibility,
  initialFilterVisibility,
}: Props) {
  // ── State para client-side navigation (export con filtros activos) ─────────
  const [currentParams, setCurrentParams] = useState<DataTableSearchParams>(searchParams);

  const handleStateChange = useCallback((params: DataTableSearchParams) => {
    setCurrentParams(params);
  }, []);

  // ── Query fn estable para client-side navigation mode ─────────────────────
  const tableQueryFn = useCallback(
    (params: DataTableSearchParams) => getWorkshopSectorTasksPaginated(sectorId, params),
    [sectorId]
  );

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns = useMemo(() => getWorkshopSectorTasksColumns(), []);

  // ── fetchFacet factories: lazy-load por columna ────────────────────────────

  /**
   * Factory para filtros enum: construye un fetchFacet que llama a
   * getWorkshopSectorTasksSingleFacet y construye las opciones a partir de
   * un array estático de opciones con sus iconos.
   */
  const makeEnumFetchFacet = useCallback(
    (columnId: string, staticOptions: DataTableFilterOption[]) => {
      return async (params: DataTableSearchParams): Promise<FacetResult> => {
        const result = await getWorkshopSectorTasksSingleFacet(columnId, sectorId, params);
        if (!result) return { options: staticOptions, counts: new Map() };
        return buildEnumFacetResult(staticOptions, result.counts);
      };
    },
    [sectorId]
  );

  /**
   * Factory para filtros FK: construye un fetchFacet que llama a
   * getWorkshopSectorTasksSingleFacet y usa las opciones resueltas del servidor.
   */
  const makeFkFetchFacet = useCallback(
    (columnId: string, nullLabel = 'Sin asignar') => {
      return async (params: DataTableSearchParams): Promise<FacetResult> => {
        const result = await getWorkshopSectorTasksSingleFacet(columnId, sectorId, params);
        if (!result) return { options: [], counts: new Map() };
        return buildFkFacetResult(result.resolvedOptions, result.counts, nullLabel);
      };
    },
    [sectorId]
  );

  // Opciones estáticas para los filtros enum (con iconos semánticos)
  const woStatusStaticOptions = useMemo<DataTableFilterOption[]>(
    () => [
      ...Object.entries(WO_STATUS_CONFIG).map(([value, cfg]) => ({
        value,
        label: cfg.label,
        icon: cfg.icon,
      })),
      { value: NULL_FILTER_VALUE, label: 'Sin OT', icon: CircleDashed },
    ],
    []
  );

  const moStatusStaticOptions = useMemo<DataTableFilterOption[]>(
    () => [
      ...Object.entries(MO_STATUS_CONFIG).map(([value, cfg]) => ({
        value,
        label: cfg.label,
        icon: cfg.icon,
      })),
      { value: NULL_FILTER_VALUE, label: 'Sin estado', icon: CircleOff },
    ],
    []
  );

  const isCriticalStaticOptions = useMemo<DataTableFilterOption[]>(
    () => [
      { value: 'true', label: IS_CRITICAL_LABELS['true'], icon: AlertTriangle },
      { value: 'false', label: IS_CRITICAL_LABELS['false'], icon: Check },
    ],
    []
  );

  const isRejectedStaticOptions = useMemo<DataTableFilterOption[]>(
    () => [
      { value: 'true', label: IS_REJECTED_LABELS['true'], icon: XCircle },
      { value: 'false', label: IS_REJECTED_LABELS['false'], icon: CheckCircle2 },
    ],
    []
  );

  const isDiagnosticoStaticOptions = useMemo<DataTableFilterOption[]>(
    () => [
      { value: 'true', label: 'Sí', icon: Check },
      { value: 'false', label: 'No', icon: X },
    ],
    []
  );

  // ── Faceted Filters con lazy-load ──────────────────────────────────────────
  const facetedFilters: DataTableFacetedFilterConfig[] = useMemo(
    () => [
      {
        columnId: 'wo_status',
        title: 'Estado OT',
        fetchFacet: makeEnumFetchFacet('wo_status', woStatusStaticOptions),
      },
      {
        columnId: 'mo_status',
        title: 'Estado OM',
        fetchFacet: makeEnumFetchFacet('mo_status', moStatusStaticOptions),
      },
      {
        columnId: 'repair_type',
        title: 'Tipo de Reparación',
        fetchFacet: makeFkFetchFacet('repair_type', 'Sin tipo'),
      },
      {
        columnId: 'vehicle',
        title: 'Equipo',
        fetchFacet: makeFkFetchFacet('vehicle', 'Sin equipo'),
      },
      {
        columnId: 'is_critical',
        title: 'Crítica',
        fetchFacet: makeEnumFetchFacet('is_critical', isCriticalStaticOptions),
      },
      {
        columnId: 'is_rejected',
        title: 'Rechazada',
        fetchFacet: makeEnumFetchFacet('is_rejected', isRejectedStaticOptions),
      },
      {
        columnId: 'is_diagnostico',
        title: 'Diagnóstico',
        fetchFacet: makeEnumFetchFacet('is_diagnostico', isDiagnosticoStaticOptions),
      },
      {
        columnId: 'planned_start_date',
        title: 'Inicio Plan.',
        type: 'dateRange' as const,
      },
      {
        columnId: 'planned_end_date',
        title: 'Fin Plan.',
        type: 'dateRange' as const,
      },
      {
        columnId: 'assigned_at',
        title: 'Asignada el',
        type: 'dateRange' as const,
      },
      {
        columnId: 'created_at',
        title: 'Creada el',
        type: 'dateRange' as const,
      },
      {
        columnId: 'description',
        title: 'Descripción',
        type: 'text' as const,
        placeholder: 'Buscar por descripción...',
      },
      {
        columnId: 'work_order',
        title: 'N° OT',
        type: 'text' as const,
        placeholder: 'Buscar por N° OT...',
      },
      {
        columnId: 'maintenance_order',
        title: 'N° OM',
        type: 'text' as const,
        placeholder: 'Buscar por N° OM...',
      },
    ],
    [
      makeEnumFetchFacet,
      makeFkFetchFacet,
      woStatusStaticOptions,
      moStatusStaticOptions,
      isCriticalStaticOptions,
      isRejectedStaticOptions,
      isDiagnosticoStaticOptions,
    ]
  );

  // ── Filter visibility ─────────────────────────────────────────────────────
  const mergedFilterVisibility = useMemo(() => {
    if (initialFilterVisibility && Object.keys(initialFilterVisibility).length > 0) {
      return initialFilterVisibility;
    }
    return Object.fromEntries(facetedFilters.map((f) => [f.columnId, DEFAULT_VISIBLE_FILTERS.includes(f.columnId)]));
  }, [initialFilterVisibility, facetedFilters]);

  // ── Column visibility ─────────────────────────────────────────────────────
  const mergedColumnVisibility = useMemo(
    () => ({
      ...Object.fromEntries(HIDDEN_COLUMNS_BY_DEFAULT.map((c) => [c, false])),
      // Columnas virtuales de filtro: siempre ocultas
      mo_status: false,
      wo_status: false,
      // Las preferencias guardadas tienen prioridad sobre los defaults
      ...(initialColumnVisibility ?? {}),
    }),
    [initialColumnVisibility]
  );

  // ── Export config ─────────────────────────────────────────────────────────
  const exportFormatters = useMemo(() => getWorkshopSectorTasksExportFormatters(), []);

  const exportConfig = useMemo(
    () => ({
      options: {
        filename: `tareas-sector-${sectorId.slice(0, 8)}`,
        sheetName: 'Tareas',
      },
      fetchAllData: () => getAllWorkshopSectorTasksForExport(sectorId, currentParams),
      formatters: exportFormatters,
    }),
    [sectorId, currentParams, exportFormatters]
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <DataTable
      columns={columns}
      data={data}
      totalRows={totalRows}
      searchParams={searchParams}
      queryFn={tableQueryFn}
      queryKey={['workshop-sector-tasks', sectorId]}
      onStateChange={handleStateChange}
      tableId={tableId}
      paramNamespace={tableId}
      searchPlaceholder="Buscar por descripción, N° OT o N° OM..."
      emptyMessage="No hay tareas asignadas a este sector"
      showFilterToggle={true}
      facetedFilters={facetedFilters}
      exportConfig={exportConfig}
      initialColumnVisibility={mergedColumnVisibility}
      initialFilterVisibility={mergedFilterVisibility}
      data-testid={`workshop-sector-tasks-table-${sectorId}`}
    />
  );
}
