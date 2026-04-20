'use client';

import {
  DataTable,
  type DataTableFacetedFilterConfig,
  type DataTableFilterOption,
  type DataTableSearchParams,
} from '@/shared/components/common/DataTable';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import { repairCriticityLabels, repairStateLabels, typeOfMaintenanceLabels } from '@/shared/utils/mappers';
import { CircleOff, type LucideIcon } from 'lucide-react';
import moment from 'moment';
import { useCallback, useMemo, useState } from 'react';
import {
  getAllRepairSolicitudesForExport,
  getRepairSolicitudesFacets,
  getRepairSolicitudesPaginated,
  type RepairSolicitudListItem,
} from '../actions.server';
import { HIDDEN_COLUMNS_BY_DEFAULT, criticityIcons, getColumns, repairStateIcons } from '../columns';

// ============================================================================
// TYPES
// ============================================================================

interface Props {
  data: RepairSolicitudListItem[];
  totalRows: number;
  searchParams: DataTableSearchParams;
  tableId: string;
  /** Cuando true o canEdit=true: columna de acciones "Reparar equipo" visible */
  mechanic?: boolean;
  /** Filtro fijo por equipo (vista de detalle del equipo) */
  equipment_id?: string;
  /** Permiso de edición desde módulo equipos (COD-400) */
  canEdit?: boolean;
  /** Mapa de permisos del servidor */
  permissionsMap?: Record<string, boolean>;
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
  mechanic,
  equipment_id,
  canEdit,
  permissionsMap,
  initialColumnVisibility,
  initialFilterVisibility,
}: Props) {
  // Estado para client-side navigation mode (export con filtros activos)
  const [currentParams, setCurrentParams] = useState<DataTableSearchParams>(searchParams);
  const handleStateChange = useCallback((params: DataTableSearchParams) => {
    setCurrentParams(params);
  }, []);

  // queryFn memoizado — activa client-side navigation mode
  // Pasa el filtro fijo equipment_id al server action
  const tableQueryFn = useCallback(
    (params: DataTableSearchParams) => getRepairSolicitudesPaginated(params, equipment_id),
    [equipment_id]
  );

  // queryKey estable para React Query (client-side navigation mode)
  // Declarar ANTES de columns para que pueda pasarse al dialog via getColumns
  const queryKey = useMemo(() => ['repair-solicitudes', tableId, equipment_id ?? ''] as const, [tableId, equipment_id]);

  // Determinar si se muestran acciones de edición
  const showEditActions = mechanic || canEdit;

  // Columnas: condicionales según permisos de edición
  // Se pasa el queryKey para que el dialog pueda invalidar la tabla al guardar
  const columns = useMemo(
    () => getColumns({ showEditActions: !!showEditActions, tableQueryKey: queryKey }),
    [showEditActions, queryKey]
  );

  // Extraer solo los params relevantes para facets (sin page/sort)
  const facetParams = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { page, pageSize, sort, sortBy, sortOrder, ...rest } = currentParams;
    return rest;
  }, [currentParams]);

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
      'type_of_maintenance',
      'last_modified_by',
      'closed_by',
      'user_description',
      'domain',
      'serie',
      'intern_number',
      'scheduled',
      'created_at',
      'updated_at',
    ];
    return Object.fromEntries(allFilterIds.map((id) => [id, DEFAULT_VISIBLE_FILTER_IDS.includes(id)]));
  }, [initialFilterVisibility]);

  // ─── Filtros facetados ────────────────────────────────────────────────────
  // Usar fetchFacet lazy-load para cada filtro.
  // Cada filtro carga sus opciones+counts al abrirse (on-demand).
  const facetedFilters: DataTableFacetedFilterConfig[] = useMemo(
    () => [
      // Estado (enum repair_state)
      {
        columnId: 'state',
        title: 'Estado',
        fetchFacet: async (params: DataTableSearchParams) => {
          const facets = await getRepairSolicitudesFacets(params);
          const options: DataTableFilterOption[] = Object.keys(repairStateLabels).map((value) => ({
            value,
            label: repairStateLabels[value] ?? value,
            icon: repairStateIcons[value] as LucideIcon | undefined,
          }));
          if (facets?.state?.has(NULL_FILTER_VALUE)) {
            options.push({ value: NULL_FILTER_VALUE, label: 'Sin estado', icon: CircleOff });
          }
          return { options, counts: facets?.state ?? new Map() };
        },
      },

      // Vehículo (FK UUID → vehicles)
      {
        columnId: 'vehicle',
        title: 'Dominio',
        fetchFacet: async (params: DataTableSearchParams) => {
          const facets = await getRepairSolicitudesFacets(params);
          const options: DataTableFilterOption[] = (facets?.vehicleOptions ?? []).map((v) => ({
            value: v.id,
            label: v.domain ?? v.serie ?? v.id,
          }));
          if (facets?.vehicle?.has(NULL_FILTER_VALUE)) {
            options.push({ value: NULL_FILTER_VALUE, label: 'Sin vehículo', icon: CircleOff });
          }
          return { options, counts: facets?.vehicle ?? new Map() };
        },
      },

      // Tipo de reparación (FK UUID → types_of_repairs)
      {
        columnId: 'reparation_type',
        title: 'Tipo de reparación',
        fetchFacet: async (params: DataTableSearchParams) => {
          const facets = await getRepairSolicitudesFacets(params);
          const options: DataTableFilterOption[] = (facets?.repairTypeOptions ?? []).map((t) => ({
            value: t.id,
            label: t.name ?? t.id,
          }));
          if (facets?.reparation_type?.has(NULL_FILTER_VALUE)) {
            options.push({ value: NULL_FILTER_VALUE, label: 'Sin tipo', icon: CircleOff });
          }
          return { options, counts: facets?.reparation_type ?? new Map() };
        },
      },

      // Criticidad (campo string en types_of_repairs)
      {
        columnId: 'criticity',
        title: 'Criticidad',
        fetchFacet: async (params: DataTableSearchParams) => {
          const facets = await getRepairSolicitudesFacets(params);
          const options: DataTableFilterOption[] = Object.keys(repairCriticityLabels).map((value) => ({
            value,
            label: repairCriticityLabels[value] ?? value,
            icon: criticityIcons[value] as LucideIcon | undefined,
          }));
          if (facets?.criticity?.has(NULL_FILTER_VALUE)) {
            options.push({ value: NULL_FILTER_VALUE, label: 'Sin criticidad', icon: CircleOff });
          }
          return { options, counts: facets?.criticity ?? new Map() };
        },
      },

      // Tipo de mantenimiento (enum en types_of_repairs)
      {
        columnId: 'type_of_maintenance',
        title: 'Tipo de mtto.',
        fetchFacet: async (params: DataTableSearchParams) => {
          const facets = await getRepairSolicitudesFacets(params);
          const options: DataTableFilterOption[] = Object.keys(typeOfMaintenanceLabels).map((value) => ({
            value,
            label: typeOfMaintenanceLabels[value] ?? value,
          }));
          if (facets?.type_of_maintenance?.has(NULL_FILTER_VALUE)) {
            options.push({ value: NULL_FILTER_VALUE, label: 'Sin tipo', icon: CircleOff });
          }
          return { options, counts: facets?.type_of_maintenance ?? new Map() };
        },
      },

      // Últ. modificación por (FK profile UUID)
      {
        columnId: 'last_modified_by',
        title: 'Últ. modif. por',
        fetchFacet: async (params: DataTableSearchParams) => {
          const facets = await getRepairSolicitudesFacets(params);
          const options: DataTableFilterOption[] = (facets?.lastModifiedByOptions ?? []).map((p) => ({
            value: p.id,
            label: p.fullname ?? p.id,
          }));
          if (facets?.last_modified_by?.has(NULL_FILTER_VALUE)) {
            options.push({ value: NULL_FILTER_VALUE, label: 'Sin modificación', icon: CircleOff });
          }
          return { options, counts: facets?.last_modified_by ?? new Map() };
        },
      },

      // Cerrada por (profile UUID del log con title 'Finalizado')
      {
        columnId: 'closed_by',
        title: 'Cerrada por',
        fetchFacet: async (params: DataTableSearchParams) => {
          const facets = await getRepairSolicitudesFacets(params);
          const options: DataTableFilterOption[] = (facets?.closedByOptions ?? []).map((p) => ({
            value: p.id,
            label: p.fullname ?? p.id,
          }));
          if (facets?.closed_by?.has(NULL_FILTER_VALUE)) {
            options.push({ value: NULL_FILTER_VALUE, label: 'Abierta / sin cerrar', icon: CircleOff });
          }
          return { options, counts: facets?.closed_by ?? new Map() };
        },
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

      // Fecha de solicitud (rango)
      {
        columnId: 'scheduled',
        title: 'Fecha solicitud',
        type: 'dateRange' as const,
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
    // fetchFacet es estable (función arrow que captura el closure de `equipment_id`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <DataTable
      columns={columns}
      data={data}
      totalRows={totalRows}
      searchParams={searchParams}
      queryFn={tableQueryFn}
      queryKey={queryKey}
      onStateChange={handleStateChange}
      searchPlaceholder="Buscar por dominio, descripción..."
      facetedFilters={facetedFilters}
      initialColumnVisibility={mergedColumnVisibility}
      initialFilterVisibility={mergedFilterVisibility}
      tableId={tableId}
      paramNamespace={tableId}
      showFilterToggle={true}
      emptyMessage="No hay solicitudes de reparación registradas"
      data-testid="repair-solicitudes-table"
      exportConfig={{
        fetchAllData: () => getAllRepairSolicitudesForExport(currentParams, equipment_id),
        options: {
          filename: 'solicitudes-reparacion',
          title: 'Listado de Solicitudes de Reparación',
          sheetName: 'Solicitudes',
        },
        formatters: {
          state: (val) => repairStateLabels[val as string] ?? String(val ?? ''),
          criticity: (val) => repairCriticityLabels[val as string] ?? String(val ?? ''),
          type_of_maintenance: (val) => typeOfMaintenanceLabels[val as string] ?? String(val ?? ''),
          scheduled: (val) => (val ? moment(val as string).format('DD/MM/YYYY') : ''),
          created_at: (val) => (val ? moment(val as string).format('DD/MM/YYYY') : ''),
          updated_at: (val) => (val ? moment(val as string).format('DD/MM/YYYY HH:mm') : ''),
        },
      }}
    />
  );
}
