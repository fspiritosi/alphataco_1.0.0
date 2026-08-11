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
import { useQuery } from '@tanstack/react-query';
import { Check, CircleOff, Truck, X } from 'lucide-react';
import moment from 'moment';
import { useCallback, useMemo, useState } from 'react';
import EquipmentTypesForm from '../types/equipmentTypesForm';
import {
  getAllEquipmentTypesForExport,
  getChecklistIdsForType,
  getEquipmentTypeSingleFacet,
  getEquipmentTypesPaginated,
  getHitchTypeIdsForType,
  type EquipmentTypeListItem,
} from './actions.server';
import { APPLIES_TO_LABELS, HIDDEN_COLUMNS_BY_DEFAULT, getColumns } from './columns';
import { useEquipmentTypeStore } from './store/equipmentType.store';

// ============================================================================
// TYPES
// ============================================================================

interface EquipmentTypeDataTableProps {
  data: EquipmentTypeListItem[];
  totalRows: number;
  searchParams: DataTableSearchParams;
  tableId: string;
  /** Flat permissions map from server: "module:tab:action" → boolean */
  permissionsMap: Record<string, boolean>;
  initialColumnVisibility?: Record<string, boolean>;
  initialFilterVisibility?: Record<string, boolean>;
  /** Todos los tipos activos para el multi-select de enganche en el form */
  allActiveTypes: { id: string; name: string; is_tractor_unit: boolean | null }[];
}

// Tipo compatible con el prop allTypes del EquipmentTypesForm (Database['public']['Tables']['type']['Row'])
type FormVehicleType = {
  applies_to: string | null;
  company_id: string | null;
  created_at: string;
  generates_qr: boolean | null;
  has_hitch: boolean | null;
  id: string;
  is_active: boolean | null;
  is_operative: boolean | null;
  is_tractor_unit: boolean | null;
  name: string;
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function _EquipmentTypeDataTable({
  data,
  totalRows,
  searchParams,
  tableId,
  permissionsMap,
  initialColumnVisibility,
  initialFilterVisibility,
  allActiveTypes,
}: EquipmentTypeDataTableProps) {
  // ── Permisos ──────────────────────────────────────────────────────────────
  const permissions = useMemo(
    () => ({
      hasPermission: (module: string, tab: string, action: string) =>
        permissionsMap[`${module}:${tab}:${action}`] === true,
    }),
    [permissionsMap]
  );

  const canCreateOrUpdate =
    permissions.hasPermission('empresa', 'tipos', 'create') || permissions.hasPermission('empresa', 'tipos', 'update');

  // ── Store de edición ──────────────────────────────────────────────────────
  const setEquipmentType = useEquipmentTypeStore((state) => state.setEquipmentType);

  const handleEdit = useCallback(
    (item: EquipmentTypeListItem) => {
      setEquipmentType(item);
    },
    [setEquipmentType]
  );

  const handleReset = useCallback(() => {
    setEquipmentType(null);
  }, [setEquipmentType]);

  // ── Client-side navigation mode ───────────────────────────────────────────
  const [currentParams, setCurrentParams] = useState<DataTableSearchParams>(searchParams);

  const handleStateChange = useCallback((params: DataTableSearchParams) => {
    setCurrentParams(params);
  }, []);

  const tableQueryFn = useCallback((params: DataTableSearchParams) => getEquipmentTypesPaginated(params), []);

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

  // ── Filter visibility — 3 visibles por defecto ─────────────────────────────
  const DEFAULT_VISIBLE_FILTERS = ['is_active', 'applies_to', 'name'];
  const mergedFilterVisibility = useMemo(() => {
    if (initialFilterVisibility && Object.keys(initialFilterVisibility).length > 0) {
      return initialFilterVisibility;
    }
    const allFilterIds = ['name', 'is_active', 'applies_to', 'is_tractor_unit', 'created_at'];
    return Object.fromEntries(allFilterIds.map((id) => [id, DEFAULT_VISIBLE_FILTERS.includes(id)]));
  }, [initialFilterVisibility]);

  // ── Lazy-load facets ───────────────────────────────────────────────────────

  const fetchIsActiveFacet = useCallback(async (params: DataTableSearchParams): Promise<FacetResult> => {
    const result = await getEquipmentTypeSingleFacet('is_active', params);
    if (!result) return { options: [], counts: new Map() };
    return {
      options: [
        { value: 'true', label: 'Activo', icon: Check },
        { value: 'false', label: 'Inactivo', icon: X },
        ...(result.counts.has(NULL_FILTER_VALUE)
          ? [{ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff }]
          : []),
      ],
      counts: result.counts,
    };
  }, []);

  const fetchAppliesToFacet = useCallback(async (params: DataTableSearchParams): Promise<FacetResult> => {
    const result = await getEquipmentTypeSingleFacet('applies_to', params);
    if (!result) return { options: [], counts: new Map() };
    return {
      options: [
        { value: 'vehicle', label: APPLIES_TO_LABELS['vehicle'], icon: Truck },
        { value: 'other_equipment', label: APPLIES_TO_LABELS['other_equipment'] },
        ...(result.counts.has(NULL_FILTER_VALUE)
          ? [{ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff }]
          : []),
      ],
      counts: result.counts,
    };
  }, []);

  const fetchIsTractorUnitFacet = useCallback(async (params: DataTableSearchParams): Promise<FacetResult> => {
    const result = await getEquipmentTypeSingleFacet('is_tractor_unit', params);
    if (!result) return { options: [], counts: new Map() };
    return {
      options: [
        { value: 'true', label: 'Sí', icon: Check },
        { value: 'false', label: 'No', icon: X },
        ...(result.counts.has(NULL_FILTER_VALUE)
          ? [{ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff }]
          : []),
      ],
      counts: result.counts,
    };
  }, []);

  // ── Faceted filters ───────────────────────────────────────────────────────
  const facetedFilters: DataTableFacetedFilterConfig[] = useMemo(
    () => [
      {
        columnId: 'name',
        title: 'Nombre',
        type: 'text' as const,
        placeholder: 'Buscar por nombre...',
      },
      {
        columnId: 'is_active',
        title: 'Estado',
        fetchFacet: fetchIsActiveFacet,
      },
      {
        columnId: 'applies_to',
        title: 'Aplica a',
        fetchFacet: fetchAppliesToFacet,
      },
      {
        columnId: 'is_tractor_unit',
        title: 'Unidad Tractora',
        fetchFacet: fetchIsTractorUnitFacet,
      },
      {
        columnId: 'created_at',
        title: 'Fecha de creación',
        type: 'dateRange' as const,
      },
    ],
    [fetchIsActiveFacet, fetchAppliesToFacet, fetchIsTractorUnitFacet]
  );

  // ── DataTable ─────────────────────────────────────────────────────────────
  const table = (
    <DataTable
      columns={columns}
      data={data}
      totalRows={totalRows}
      searchParams={searchParams}
      queryFn={tableQueryFn}
      queryKey={['equipment-types']}
      onStateChange={handleStateChange}
      tableId={tableId}
      paramNamespace={tableId}
      facetedFilters={facetedFilters}
      initialColumnVisibility={mergedColumnVisibility}
      initialFilterVisibility={mergedFilterVisibility}
      showFilterToggle
      searchPlaceholder="Buscar por nombre..."
      emptyMessage="No se encontraron tipos de equipo"
      exportConfig={{
        fetchAllData: () => getAllEquipmentTypesForExport(currentParams),
        options: {
          filename: 'tipos-de-equipo',
          sheetName: 'Tipos de Equipo',
          title: 'Tipos de Equipo',
        },
        formatters: {
          is_active: (value) => {
            if (value === null || value === undefined) return 'Sin asignar';
            return value ? 'Activo' : 'Inactivo';
          },
          applies_to: (value) => {
            if (!value) return '—';
            return APPLIES_TO_LABELS[value as string] ?? String(value);
          },
          is_tractor_unit: (value) => {
            if (value === null || value === undefined) return '—';
            return value ? 'Sí' : 'No';
          },
          has_hitch: (value) => {
            if (value === null || value === undefined) return '—';
            return value ? 'Sí' : 'No';
          },
          is_operative: (value) => {
            if (value === null || value === undefined) return '—';
            return value ? 'Sí' : 'No';
          },
          generates_qr: (value) => {
            if (value === null || value === undefined) return '—';
            return value ? 'Sí' : 'No';
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
      <ResizablePanelGroup className="min-h-[500px]" direction="horizontal">
        <ResizablePanel defaultSize={35}>
          <div className="overflow-auto h-full pr-2">
            <EquipmentTypesFormWrapper allActiveTypes={allActiveTypes} onReset={handleReset} />
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

// ============================================================================
// FORM WRAPPER — conecta el store Zustand al form existente
// ============================================================================

function EquipmentTypesFormWrapper({
  allActiveTypes,
  onReset,
}: {
  allActiveTypes: { id: string; name: string; is_tractor_unit: boolean | null }[];
  onReset: () => void;
}) {
  const equipmentType = useEquipmentTypeStore((state) => state.equipmentType);
  const typeId = equipmentType?.id ?? null;

  // Relaciones existentes del tipo. El form las toma en `defaultValues`, que solo se evaluan
  // al montar: por eso se espera a que las queries resuelvan y se remonta con `key`.
  // Sin esto el form abre vacio y, como el guardado hace delete + insert, borra las relaciones.
  const { data: checklistIds = [], isLoading: isLoadingChecklists } = useQuery({
    queryKey: ['type-checklists', typeId],
    queryFn: () => getChecklistIdsForType(typeId!),
    enabled: !!typeId,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: hitchTypeIds = [], isLoading: isLoadingHitchTypes } = useQuery({
    queryKey: ['type-hitch-types', typeId],
    queryFn: () => getHitchTypeIdsForType(typeId!),
    enabled: !!typeId,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Memoizar para evitar re-renders infinitos (estos objetos se pasan como props)
  const formInitialData = useMemo(
    () =>
      equipmentType
        ? ({
            id: equipmentType.id,
            name: equipmentType.name,
            is_active: equipmentType.is_active ?? true,
            applies_to: equipmentType.applies_to ?? 'vehicle',
            is_tractor_unit: equipmentType.is_tractor_unit ?? false,
            has_hitch: equipmentType.has_hitch ?? false,
            is_operative: equipmentType.is_operative ?? false,
            generates_qr: equipmentType.generates_qr ?? true,
            company_id: null,
            created_at:
              equipmentType.created_at instanceof Date
                ? equipmentType.created_at.toISOString()
                : String(equipmentType.created_at),
          } as FormVehicleType)
        : null,
    [equipmentType]
  );

  // Memoizar allTypes para referencia estable
  const formAllTypes = useMemo<FormVehicleType[]>(
    () =>
      allActiveTypes.map((t) => ({
        id: t.id,
        name: t.name,
        is_active: true,
        is_tractor_unit: t.is_tractor_unit ?? false,
        applies_to: null,
        has_hitch: null,
        is_operative: null,
        generates_qr: null,
        company_id: null,
        created_at: '',
      })),
    [allActiveTypes]
  );

  if (isLoadingChecklists || isLoadingHitchTypes) {
    return <FormRelationsSkeleton />;
  }

  return (
    <EquipmentTypesForm
      key={typeId ?? 'create'}
      initialData={formInitialData}
      isEditing={!!equipmentType}
      onReset={onReset}
      allTypes={formAllTypes}
      initialChecklistIds={checklistIds}
      initialHitchTypeIds={hitchTypeIds}
    />
  );
}

/** Placeholder mientras se cargan las relaciones del tipo seleccionado. */
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
