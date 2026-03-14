'use client';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import {
  DataTable,
  type DataTableFacetedFilterConfig,
  type DataTableSearchParams,
  type FacetResult,
} from '@/shared/components/common/DataTable';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import { Check, CircleOff, X } from 'lucide-react';
import moment from 'moment';
import { useCallback, useMemo, useState } from 'react';
import {
  getAllDiagramTypesForExport,
  getDiagramTypeSingleFacet,
  getDiagramTypesPaginated,
  type DiagramTypeListItem,
} from './actions.server';
import { HIDDEN_COLUMNS_BY_DEFAULT, getColumns } from './columns';
import DiagramTypeForm from './components/DiagramTypeForm';
import { useDiagramTypeStore } from './store/diagramType.store';

// ============================================================================
// TYPES
// ============================================================================

interface DiagramTypeDataTableProps {
  data: DiagramTypeListItem[];
  totalRows: number;
  searchParams: DataTableSearchParams;
  tableId: string;
  /** Flat permissions map from server: "module:tab:action" → boolean */
  permissionsMap: Record<string, boolean>;
  initialColumnVisibility?: Record<string, boolean>;
  initialFilterVisibility?: Record<string, boolean>;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function _DiagramTypeDataTable({
  data,
  totalRows,
  searchParams,
  tableId,
  permissionsMap,
  initialColumnVisibility,
  initialFilterVisibility,
}: DiagramTypeDataTableProps) {
  // ── Permisos: construir helper desde el map serializable del servidor ────────
  const permissions = useMemo(
    () => ({
      hasPermission: (module: string, tab: string, action: string) =>
        permissionsMap[`${module}:${tab}:${action}`] === true,
    }),
    [permissionsMap]
  );

  const canCreateOrUpdate =
    permissions.hasPermission('empresa', 'diagrams', 'create') ||
    permissions.hasPermission('empresa', 'diagrams', 'update');

  // ── Store de edición ─────────────────────────────────────────────────────
  const setDiagramType = useDiagramTypeStore((state) => state.setDiagramType);
  const handleEdit = useCallback(
    (item: DiagramTypeListItem) => {
      setDiagramType(item);
    },
    [setDiagramType]
  );

  // ── Client-side navigation mode ──────────────────────────────────────────
  const [currentParams, setCurrentParams] = useState<DataTableSearchParams>(searchParams);

  const handleStateChange = useCallback((params: DataTableSearchParams) => {
    setCurrentParams(params);
  }, []);

  const tableQueryFn = useCallback((params: DataTableSearchParams) => getDiagramTypesPaginated(params), []);

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns = useMemo(() => getColumns(permissions, handleEdit), [permissions, handleEdit]);

  // ── Column visibility ─────────────────────────────────────────────────────
  const mergedColumnVisibility = useMemo(() => {
    const defaults: Record<string, boolean> = {};
    for (const col of HIDDEN_COLUMNS_BY_DEFAULT) {
      defaults[col] = false;
    }
    return { ...defaults, ...(initialColumnVisibility ?? {}) };
  }, [initialColumnVisibility]);

  // ── Filter visibility — 3 visibles por defecto ────────────────────────────
  const DEFAULT_VISIBLE_FILTERS = ['is_active', 'work_active', 'name'];
  const mergedFilterVisibility = useMemo(() => {
    if (initialFilterVisibility && Object.keys(initialFilterVisibility).length > 0) {
      return initialFilterVisibility;
    }
    const allFilterIds = [
      'name',
      'short_description',
      'work_active',
      'is_active',
      'computes_absenteeism',
      'created_at',
    ];
    return Object.fromEntries(allFilterIds.map((id) => [id, DEFAULT_VISIBLE_FILTERS.includes(id)]));
  }, [initialFilterVisibility]);

  // ── Lazy-load facets ──────────────────────────────────────────────────────

  const fetchWorkActiveFacet = useCallback(async (params: DataTableSearchParams): Promise<FacetResult> => {
    const result = await getDiagramTypeSingleFacet('work_active', params);
    if (!result) return { options: [], counts: new Map() };
    const options = [
      { value: 'true', label: 'Laboralmente activo', icon: Check },
      { value: 'false', label: 'No laboralmente activo', icon: X },
      ...(result.counts.has(NULL_FILTER_VALUE)
        ? [{ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff }]
        : []),
    ];
    return { options, counts: result.counts };
  }, []);

  const fetchIsActiveFacet = useCallback(async (params: DataTableSearchParams): Promise<FacetResult> => {
    const result = await getDiagramTypeSingleFacet('is_active', params);
    if (!result) return { options: [], counts: new Map() };
    const options = [
      { value: 'true', label: 'Activo', icon: Check },
      { value: 'false', label: 'Inactivo', icon: X },
    ];
    return { options, counts: result.counts };
  }, []);

  const fetchComputesFacet = useCallback(async (params: DataTableSearchParams): Promise<FacetResult> => {
    const result = await getDiagramTypeSingleFacet('computes_absenteeism', params);
    if (!result) return { options: [], counts: new Map() };
    const options = [
      { value: 'true', label: 'Computa ausentismo', icon: Check },
      { value: 'false', label: 'No computa ausentismo', icon: X },
    ];
    return { options, counts: result.counts };
  }, []);

  // ── Faceted filters ───────────────────────────────────────────────────────
  const facetedFilters: DataTableFacetedFilterConfig[] = useMemo(
    () => [
      // ── name (texto libre) ─────────────────────────────────────────────────
      {
        columnId: 'name',
        title: 'Nombre',
        type: 'text' as const,
        placeholder: 'Buscar por nombre...',
      },

      // ── short_description (texto libre) ────────────────────────────────────
      {
        columnId: 'short_description',
        title: 'Descripción corta',
        type: 'text' as const,
        placeholder: 'Buscar por descripción corta...',
      },

      // ── work_active (booleano nullable) ────────────────────────────────────
      {
        columnId: 'work_active',
        title: 'Lab. Activa',
        fetchFacet: fetchWorkActiveFacet,
      },

      // ── is_active (booleano NOT NULL) ──────────────────────────────────────
      {
        columnId: 'is_active',
        title: 'Estado',
        fetchFacet: fetchIsActiveFacet,
      },

      // ── computes_absenteeism (booleano NOT NULL — oculto por defecto) ───────
      {
        columnId: 'computes_absenteeism',
        title: 'Computa ausentismo',
        fetchFacet: fetchComputesFacet,
      },

      // ── created_at (rango de fechas) ───────────────────────────────────────
      {
        columnId: 'created_at',
        title: 'Fecha de creación',
        type: 'dateRange' as const,
      },
    ],
    [fetchWorkActiveFacet, fetchIsActiveFacet, fetchComputesFacet]
  );

  // ── DataTable ─────────────────────────────────────────────────────────────
  const table = (
    <DataTable
      columns={columns}
      data={data}
      totalRows={totalRows}
      searchParams={searchParams}
      queryFn={tableQueryFn}
      queryKey={['diagram-types']}
      onStateChange={handleStateChange}
      tableId={tableId}
      paramNamespace={tableId}
      facetedFilters={facetedFilters}
      initialColumnVisibility={mergedColumnVisibility}
      initialFilterVisibility={mergedFilterVisibility}
      showFilterToggle
      searchPlaceholder="Buscar tipos de novedades..."
      emptyMessage="No se encontraron tipos de novedades"
      exportConfig={{
        fetchAllData: () => getAllDiagramTypesForExport(currentParams),
        options: {
          filename: 'tipos-de-novedades',
          sheetName: 'Tipos de Novedades',
          title: 'Tipos de Novedades',
        },
        formatters: {
          work_active: (value) => {
            if (value === null || value === undefined) return 'Sin asignar';
            return value ? 'Laboralmente activo' : 'No laboralmente activo';
          },
          is_active: (value) => (value ? 'Activo' : 'Inactivo'),
          computes_absenteeism: (value) => (value ? 'Sí' : 'No'),
          created_at: (value) => (value ? moment(value as string | Date).format('DD/MM/YYYY') : '-'),
        },
      }}
    />
  );

  // Si no tiene permisos de crear/editar, mostrar solo la tabla
  if (!canCreateOrUpdate) {
    return table;
  }

  // Con permisos: layout resizable con formulario a la izquierda y tabla a la derecha
  return (
    <div className="w-full">
      <ResizablePanelGroup className="min-h-[400px]" direction="horizontal">
        <ResizablePanel defaultSize={30}>
          <div className="overflow-auto h-full pr-2">
            <DiagramTypeForm />
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={70}>
          <div className="overflow-auto h-full pl-2">{table}</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
