'use client';

import { DataTable } from '@/shared/components/common/DataTable';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import type {
  DataTableFacetedFilterConfig,
  DataTableFilterOption,
  DataTableSearchParams,
} from '@/shared/components/common/DataTable/types';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Check, CheckCircle2, CircleDashed, CircleOff, X, XCircle } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import type { WorkshopSectorTaskListItem } from './actions.server';
import {
  getAllWorkshopSectorTasksForExport,
  getWorkshopSectorTasksFacets,
  getWorkshopSectorTasksPaginated,
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

  // ── Facets (cross-filtering) ──────────────────────────────────────────────
  const facetParams = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { page, pageSize, sort, sortBy, sortOrder, ...rest } = searchParams as Record<string, unknown>;
    return rest as DataTableSearchParams;
  }, [searchParams]);

  const { data: facets, isFetching: isFetchingFacets } = useQuery({
    queryKey: ['workshop-sector-tasks-facets', sectorId, facetParams],
    queryFn: () => getWorkshopSectorTasksFacets(sectorId, facetParams),
    staleTime: 5 * 60 * 1000,
  });

  // ── Faceted Filters ────────────────────────────────────────────────────────
  const facetedFilters: DataTableFacetedFilterConfig[] = useMemo(() => {
    // Repair type options
    const repairTypeOptions: DataTableFilterOption[] = (facets?.repairTypeOptions ?? []).map((rt) => ({
      value: rt.id,
      label: rt.name,
    }));
    if (facets?.repair_type?.has(NULL_FILTER_VALUE)) {
      repairTypeOptions.push({ value: NULL_FILTER_VALUE, label: 'Sin tipo', icon: CircleOff });
    }

    // Maintenance order options
    const moOptions: DataTableFilterOption[] = (facets?.moOptions ?? []).map((mo) => ({
      value: mo.id,
      label: mo.label,
    }));
    if (facets?.maintenance_order?.has(NULL_FILTER_VALUE)) {
      moOptions.push({ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff });
    }

    // Vehicle options
    const vehicleOptions: DataTableFilterOption[] = (facets?.vehicleOptions ?? []).map((v) => ({
      value: v.id,
      label: [v.domain, v.serie, v.intern_number ? `(${v.intern_number})` : ''].filter(Boolean).join(' '),
    }));
    if (facets?.vehicle?.has(NULL_FILTER_VALUE)) {
      vehicleOptions.push({ value: NULL_FILTER_VALUE, label: 'Sin equipo', icon: CircleOff });
    }

    // is_critical options
    const isCriticalOptions: DataTableFilterOption[] = [
      { value: 'true', label: IS_CRITICAL_LABELS['true'], icon: AlertTriangle },
      { value: 'false', label: IS_CRITICAL_LABELS['false'], icon: Check },
    ];

    // is_rejected options
    const isRejectedOptions: DataTableFilterOption[] = [
      { value: 'true', label: IS_REJECTED_LABELS['true'], icon: XCircle },
      { value: 'false', label: IS_REJECTED_LABELS['false'], icon: CheckCircle2 },
    ];

    // is_diagnostico options (no tiene filtro faceted declarado en DEFAULT_VISIBLE_FILTERS
    // pero sí lo incluimos por completitud del checklist columna→filtro)
    const isDiagnosticoOptions: DataTableFilterOption[] = [
      { value: 'true', label: 'Sí', icon: Check },
      { value: 'false', label: 'No', icon: X },
    ];

    // mo_status options (enum string)
    const moStatusOptions: DataTableFilterOption[] = Object.entries(MO_STATUS_CONFIG).map(([value, cfg]) => ({
      value,
      label: cfg.label,
      icon: cfg.icon,
    }));
    if (facets?.mo_status?.has(NULL_FILTER_VALUE)) {
      moStatusOptions.push({ value: NULL_FILTER_VALUE, label: 'Sin estado', icon: CircleOff });
    }

    // wo_status options (enum + null = sin OT)
    const woStatusOptions: DataTableFilterOption[] = Object.entries(WO_STATUS_CONFIG).map(([value, cfg]) => ({
      value,
      label: cfg.label,
      icon: cfg.icon,
    }));
    woStatusOptions.push({ value: NULL_FILTER_VALUE, label: 'Sin OT', icon: CircleDashed });

    return [
      {
        columnId: 'wo_status',
        title: 'Estado OT',
        type: 'faceted' as const,
        options: woStatusOptions,
        externalCounts: facets?.wo_status,
      },
      {
        columnId: 'mo_status',
        title: 'Estado OM',
        type: 'faceted' as const,
        options: moStatusOptions,
        externalCounts: facets?.mo_status,
      },
      {
        columnId: 'repair_type',
        title: 'Tipo de Reparación',
        type: 'faceted' as const,
        options: repairTypeOptions,
        externalCounts: facets?.repair_type,
      },
      {
        columnId: 'maintenance_order',
        title: 'N° Orden',
        type: 'faceted' as const,
        options: moOptions,
        externalCounts: facets?.maintenance_order,
      },
      {
        columnId: 'vehicle',
        title: 'Equipo',
        type: 'faceted' as const,
        options: vehicleOptions,
        externalCounts: facets?.vehicle,
      },
      {
        columnId: 'is_critical',
        title: 'Crítica',
        type: 'faceted' as const,
        options: isCriticalOptions,
        externalCounts: facets?.is_critical,
      },
      {
        columnId: 'is_rejected',
        title: 'Rechazada',
        type: 'faceted' as const,
        options: isRejectedOptions,
        externalCounts: facets?.is_rejected,
      },
      {
        columnId: 'is_diagnostico',
        title: 'Diagnóstico',
        type: 'faceted' as const,
        options: isDiagnosticoOptions,
        externalCounts: facets?.is_diagnostico,
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
    ];
  }, [facets]);

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
      // Las columnas de flags booleanos se muestran pero las ocultas-por-defecto no
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
      searchPlaceholder="Buscar por descripción..."
      emptyMessage="No hay tareas asignadas a este sector"
      showFilterToggle={true}
      facetedFilters={facetedFilters}
      isFetchingFacets={isFetchingFacets}
      exportConfig={exportConfig}
      initialColumnVisibility={mergedColumnVisibility}
      initialFilterVisibility={mergedFilterVisibility}
      data-testid={`workshop-sector-tasks-table-${sectorId}`}
    />
  );
}
