'use client';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DataTable,
  type DataTableFacetedFilterConfig,
  type DataTableSearchParams,
  type FacetResult,
} from '@/shared/components/common/DataTable';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, CircleOff, X } from 'lucide-react';
import moment from 'moment';
import { useCallback, useMemo, useState } from 'react';
import EquipmentSubTypesForm from '../sub_types/equipmentSubTypesForm';
import { useSubTypeChecklists } from '../sub_types/hooks/useSubTypeChecklists';
import {
  getActiveEquipmentTypes,
  getAllEquipmentSubTypesForExport,
  getCompatibleItemsForSubTypePrisma,
  getEquipmentSubTypeSingleFacet,
  getEquipmentSubTypesPaginated,
  type EquipmentSubTypeListItem,
} from './actions.server';
import { HIDDEN_COLUMNS_BY_DEFAULT, getColumns } from './columns';

// ============================================================================
// TYPES
// ============================================================================

interface EquipmentSubTypeDataTableProps {
  data: EquipmentSubTypeListItem[];
  totalRows: number;
  searchParams: DataTableSearchParams;
  tableId: string;
  /** Flat permissions map from server: "module:tab:action" → boolean */
  permissionsMap: Record<string, boolean>;
  initialColumnVisibility?: Record<string, boolean>;
  initialFilterVisibility?: Record<string, boolean>;
}

// ============================================================================
// FORM WRAPPER — adapta el formulario existente al nuevo contexto
// ============================================================================

interface FormWrapperProps {
  editingItem: EquipmentSubTypeListItem | null;
  onReset: () => void;
}

/**
 * Wrapper que provee los datos necesarios al formulario existente.
 * Carga tipos de unidad via React Query + server action (sin Supabase).
 */
function EquipmentSubTypesFormWrapper({ editingItem, onReset }: FormWrapperProps) {
  const queryClient = useQueryClient();
  const subTypeId = editingItem?.id ?? null;

  // Cargar tipos de unidad via server action (reemplaza FetchTypeOfVehicles con Supabase)
  const { data: types = [] } = useQuery({
    queryKey: ['equipment-types-active'],
    queryFn: () => getActiveEquipmentTypes(),
    staleTime: 5 * 60 * 1000,
  });

  // Relaciones existentes del subtipo. El form las toma en `defaultValues`, que solo se evaluan
  // al montar: por eso se espera a que las queries resuelvan y se remonta con `key`.
  // Sin esto el form abre vacio y, como el guardado hace delete + insert, borra las relaciones.
  const { data: checklistIds = [], isLoading: isLoadingChecklists } = useSubTypeChecklists(subTypeId);

  const { data: compatibleRows = [], isLoading: isLoadingCompatibleItems } = useQuery({
    queryKey: ['subtype-compatible-items', subTypeId],
    queryFn: () => getCompatibleItemsForSubTypePrisma(subTypeId!),
    enabled: !!subTypeId,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const compatibleItems = useMemo(
    () =>
      compatibleRows.map((row) => ({
        id: row.compatible_item_id,
        type: row.item_type as 'sub_type' | 'type',
      })),
    [compatibleRows]
  );

  const handleSuccess = useCallback(() => {
    // Invalidar la tabla y las relaciones para refrescar los datos
    queryClient.invalidateQueries({ queryKey: ['equipment-sub-types'] });
    queryClient.invalidateQueries({ queryKey: ['subtype-compatible-items', subTypeId] });
  }, [queryClient, subTypeId]);

  // Memoizar para referencia estable — evita loop infinito en useEffect del form
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typesForForm = useMemo(() => types as any[], [types]);

  const formInitialData = useMemo(
    () =>
      editingItem
        ? {
            id: editingItem.id,
            name: editingItem.name,
            is_active: editingItem.is_active,
            type: editingItem.type,
          }
        : null,
    [editingItem]
  );

  if (isLoadingChecklists || isLoadingCompatibleItems) {
    return <FormRelationsSkeleton />;
  }

  return (
    <EquipmentSubTypesForm
      key={subTypeId ?? 'create'}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initialData={formInitialData as any}
      onReset={onReset}
      isEditing={!!editingItem}
      onSuccess={handleSuccess}
      types={typesForForm}
      initialChecklistIds={checklistIds}
      initialCompatibleItems={compatibleItems}
    />
  );
}

/** Placeholder mientras se cargan las relaciones del subtipo seleccionado. */
function FormRelationsSkeleton() {
  return (
    <div className="space-y-4 p-1">
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-2/3" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-9 w-1/2" />
    </div>
  );
}

// ============================================================================
// MAIN CLIENT COMPONENT
// ============================================================================

export default function _EquipmentSubTypeDataTable({
  data,
  totalRows,
  searchParams,
  tableId,
  permissionsMap,
  initialColumnVisibility,
  initialFilterVisibility,
}: EquipmentSubTypeDataTableProps) {
  // ── Permisos: construir helper desde el map serializable del servidor ────────
  const permissions = useMemo(
    () => ({
      hasPermission: (module: string, tab: string, action: string) =>
        permissionsMap[`${module}:${tab}:${action}`] === true,
    }),
    [permissionsMap]
  );

  const canCreateOrUpdate =
    permissions.hasPermission('empresa', 'subtipos', 'create') ||
    permissions.hasPermission('empresa', 'subtipos', 'update');

  // ── Estado de edición ─────────────────────────────────────────────────────
  const [editingItem, setEditingItem] = useState<EquipmentSubTypeListItem | null>(null);

  const handleEdit = useCallback((item: EquipmentSubTypeListItem) => {
    setEditingItem(item);
  }, []);

  const handleReset = useCallback(() => {
    setEditingItem(null);
  }, []);

  // ── Client-side navigation mode ──────────────────────────────────────────
  const [currentParams, setCurrentParams] = useState<DataTableSearchParams>(searchParams);

  const handleStateChange = useCallback((params: DataTableSearchParams) => {
    setCurrentParams(params);
  }, []);

  const tableQueryFn = useCallback((params: DataTableSearchParams) => getEquipmentSubTypesPaginated(params), []);

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
  const DEFAULT_VISIBLE_FILTERS = ['is_active', 'type', 'name'];
  const mergedFilterVisibility = useMemo(() => {
    if (initialFilterVisibility && Object.keys(initialFilterVisibility).length > 0) {
      return initialFilterVisibility;
    }
    const allFilterIds = ['name', 'type', 'is_active', 'created_at'];
    return Object.fromEntries(allFilterIds.map((id) => [id, DEFAULT_VISIBLE_FILTERS.includes(id)]));
  }, [initialFilterVisibility]);

  // ── Lazy-load facet: is_active ─────────────────────────────────────────────
  const fetchIsActiveFacet = useCallback(async (params: DataTableSearchParams): Promise<FacetResult> => {
    const result = await getEquipmentSubTypeSingleFacet('is_active', params);
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

  // ── Lazy-load facet: type (FK UUID — Tipo de Unidad) ───────────────────────
  const fetchTypeFacet = useCallback(async (params: DataTableSearchParams): Promise<FacetResult> => {
    const result = await getEquipmentSubTypeSingleFacet('type', params);
    if (!result) return { options: [], counts: new Map() };
    const options = [
      ...(result.options ?? []),
      ...(result.counts.has(NULL_FILTER_VALUE)
        ? [{ value: NULL_FILTER_VALUE, label: 'Sin tipo', icon: CircleOff }]
        : []),
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

      // ── type (FK UUID — Tipo de Unidad) ────────────────────────────────────
      {
        columnId: 'type',
        title: 'Tipo de Unidad',
        fetchFacet: fetchTypeFacet,
      },

      // ── is_active (booleano nullable) ──────────────────────────────────────
      {
        columnId: 'is_active',
        title: 'Estado',
        fetchFacet: fetchIsActiveFacet,
      },

      // ── created_at (rango de fechas) ───────────────────────────────────────
      {
        columnId: 'created_at',
        title: 'Fecha de creación',
        type: 'dateRange' as const,
      },
    ],
    [fetchIsActiveFacet, fetchTypeFacet]
  );

  // ── DataTable ─────────────────────────────────────────────────────────────
  const table = (
    <DataTable
      columns={columns}
      data={data}
      totalRows={totalRows}
      searchParams={searchParams}
      queryFn={tableQueryFn}
      queryKey={['equipment-sub-types']}
      onStateChange={handleStateChange}
      tableId={tableId}
      paramNamespace={tableId}
      facetedFilters={facetedFilters}
      initialColumnVisibility={mergedColumnVisibility}
      initialFilterVisibility={mergedFilterVisibility}
      showFilterToggle
      searchPlaceholder="Buscar subtipos..."
      emptyMessage="No se encontraron subtipos de equipos"
      exportConfig={{
        fetchAllData: () => getAllEquipmentSubTypesForExport(currentParams),
        options: {
          filename: 'subtipos-equipos',
          sheetName: 'Subtipos',
          title: 'Subtipos de Equipos',
        },
        formatters: {
          // La columna 'type' usa accessorFn que retorna el nombre — sin formatter necesario
          // para el nombre. Pero exportamos el nombre directamente via la FK resolved.
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
        <ResizablePanel defaultSize={35}>
          <div className="overflow-auto h-full pr-2">
            <EquipmentSubTypesFormWrapper editingItem={editingItem} onReset={handleReset} />
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={65}>
          <div className="overflow-auto h-full pl-2">{table}</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
