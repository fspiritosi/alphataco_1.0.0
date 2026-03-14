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
import EquipmentBrandForm from './EquipmentBrandForm';
import {
  getAllEquipmentBrandsForExport,
  getEquipmentBrandSingleFacet,
  getEquipmentBrandsPaginated,
  type EquipmentBrandListItem,
} from './actions.server';
import { HIDDEN_COLUMNS_BY_DEFAULT, getColumns } from './columns';
import { useEquipmentBrandStore } from './store/equipmentBrand.store';

// ============================================================================
// TYPES
// ============================================================================

interface EquipmentBrandDataTableProps {
  data: EquipmentBrandListItem[];
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

export default function _EquipmentBrandDataTable({
  data,
  totalRows,
  searchParams,
  tableId,
  permissionsMap,
  initialColumnVisibility,
  initialFilterVisibility,
}: EquipmentBrandDataTableProps) {
  // ── Permisos: construir helper desde el map serializable del servidor ────────
  const permissions = useMemo(
    () => ({
      hasPermission: (module: string, tab: string, action: string) =>
        permissionsMap[`${module}:${tab}:${action}`] === true,
    }),
    [permissionsMap]
  );

  const canCreateOrUpdate =
    permissions.hasPermission('empresa', 'marcas', 'create') ||
    permissions.hasPermission('empresa', 'marcas', 'update');

  // ── Store de edición ─────────────────────────────────────────────────────
  const setEquipmentBrand = useEquipmentBrandStore((state) => state.setEquipmentBrand);
  const handleEdit = useCallback(
    (item: EquipmentBrandListItem) => {
      setEquipmentBrand(item);
    },
    [setEquipmentBrand]
  );

  // ── Client-side navigation mode ──────────────────────────────────────────
  const [currentParams, setCurrentParams] = useState<DataTableSearchParams>(searchParams);

  const handleStateChange = useCallback((params: DataTableSearchParams) => {
    setCurrentParams(params);
  }, []);

  const tableQueryFn = useCallback((params: DataTableSearchParams) => getEquipmentBrandsPaginated(params), []);

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
  const DEFAULT_VISIBLE_FILTERS = ['is_active', 'name', 'created_at'];
  const mergedFilterVisibility = useMemo(() => {
    if (initialFilterVisibility && Object.keys(initialFilterVisibility).length > 0) {
      return initialFilterVisibility;
    }
    const allFilterIds = ['name', 'is_active', 'created_at'];
    return Object.fromEntries(allFilterIds.map((id) => [id, DEFAULT_VISIBLE_FILTERS.includes(id)]));
  }, [initialFilterVisibility]);

  // ── Lazy-load facet: is_active ─────────────────────────────────────────────
  const fetchIsActiveFacet = useCallback(async (params: DataTableSearchParams): Promise<FacetResult> => {
    const result = await getEquipmentBrandSingleFacet('is_active', params);
    if (!result) return { options: [], counts: new Map() };
    const options = [
      { value: 'true', label: 'Activo', icon: Check },
      { value: 'false', label: 'Inactivo', icon: X },
      ...(result.counts.has(NULL_FILTER_VALUE)
        ? [{ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff }]
        : []),
    ];
    return { options, counts: result.counts };
  }, []);

  // ── Faceted filters ───────────────────────────────────────────────────────
  const facetedFilters: DataTableFacetedFilterConfig[] = useMemo(
    () => [
      // ── is_active (booleano nullable) ──────────────────────────────────────
      {
        columnId: 'is_active',
        title: 'Estado',
        fetchFacet: fetchIsActiveFacet,
      },

      // ── name (texto libre) ─────────────────────────────────────────────────
      {
        columnId: 'name',
        title: 'Nombre',
        type: 'text' as const,
        placeholder: 'Buscar por nombre...',
      },

      // ── created_at (rango de fechas) ───────────────────────────────────────
      {
        columnId: 'created_at',
        title: 'Fecha de creación',
        type: 'dateRange' as const,
      },
    ],
    [fetchIsActiveFacet]
  );

  // ── DataTable ─────────────────────────────────────────────────────────────
  const table = (
    <DataTable
      columns={columns}
      data={data}
      totalRows={totalRows}
      searchParams={searchParams}
      queryFn={tableQueryFn}
      queryKey={['equipment-brands']}
      onStateChange={handleStateChange}
      tableId={tableId}
      paramNamespace={tableId}
      facetedFilters={facetedFilters}
      initialColumnVisibility={mergedColumnVisibility}
      initialFilterVisibility={mergedFilterVisibility}
      showFilterToggle
      searchPlaceholder="Buscar marcas de equipos..."
      emptyMessage="No se encontraron marcas de equipos"
      exportConfig={{
        fetchAllData: () => getAllEquipmentBrandsForExport(currentParams),
        options: {
          filename: 'marcas-de-equipos',
          sheetName: 'Marcas de Equipos',
          title: 'Marcas de Equipos',
        },
        formatters: {
          is_active: (value) => {
            if (value === null || value === undefined) return 'Sin asignar';
            return value ? 'Activo' : 'Inactivo';
          },
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
            <EquipmentBrandForm />
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
