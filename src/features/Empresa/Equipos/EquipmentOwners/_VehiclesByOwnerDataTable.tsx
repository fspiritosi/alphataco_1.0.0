'use client';

import type { DataTableFilterOption, DataTableSearchParams, FacetResult } from '@/shared/components/common/DataTable';
import { DataTable } from '@/shared/components/common/DataTable';
import { conditionLabels, otherEquipmentStatusLabels } from '@/shared/utils/mappers';
import { useQuery } from '@tanstack/react-query';
import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, CheckCircle2, CircleOff, Settings2, Wrench, XCircle } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import type { VehicleByOwnerListItem } from './actions.server';
import {
  getAllVehiclesByOwnerForExport,
  getVehicleByOwnerSingleFacet,
  getVehiclesByOwnerPaginated,
} from './actions.server';
import { VEHICLE_HIDDEN_COLUMNS_BY_DEFAULT, getVehicleByOwnerColumns } from './equipmentByOwnerColumns';

// ============================================================================
// ICON MAPS — LucideIcon type
// ============================================================================

const CONDITION_ICONS: Record<string, LucideIcon> = {
  operativo: CheckCircle2,
  no_operativo: XCircle,
  en_reparacion: Wrench,
  operativo_condicionado: AlertTriangle,
  en_preparacion: Settings2,
};

const STATUS_ICONS: Record<string, LucideIcon> = {
  Avalado: CheckCircle2,
  No_avalado: XCircle,
  Incompleto: XCircle,
  Completo: CheckCircle2,
  Completo_con_doc_vencida: AlertTriangle,
};

// ============================================================================
// PROPS
// ============================================================================

interface VehiclesByOwnerDataTableProps {
  ownerId: string;
  ownerName: string;
  data: VehicleByOwnerListItem[];
  totalRows: number;
  searchParams: DataTableSearchParams;
  tableId: string;
  initialColumnVisibility: Record<string, boolean>;
  initialFilterVisibility: Record<string, boolean>;
}

// ============================================================================
// DEFAULT VISIBLE FILTERS
// ============================================================================

const DEFAULT_VISIBLE_FILTERS = ['condition', 'status', 'type'];

// ============================================================================
// HELPER — enrich options with LucideIcon
// ============================================================================

function addIconsToOptions(
  options: DataTableFilterOption[],
  iconMap: Partial<Record<string, LucideIcon>>
): DataTableFilterOption[] {
  return options.map((opt) => {
    if (opt.value === '__null__') return { ...opt, icon: CircleOff };
    const icon = iconMap[opt.value];
    return icon != null ? { ...opt, icon } : opt;
  });
}

// ============================================================================
// CLIENT COMPONENT
// ============================================================================

export function _VehiclesByOwnerDataTable({
  ownerId,
  ownerName,
  data,
  totalRows,
  searchParams,
  tableId,
  initialColumnVisibility,
  initialFilterVisibility,
}: VehiclesByOwnerDataTableProps) {
  // ── Carga inicial via React Query (porque data={[]} viene del wrapper client) ─
  const { data: initialResult, isLoading: isInitialLoading } = useQuery({
    queryKey: ['vehicles-by-owner-initial', ownerId],
    queryFn: () => getVehiclesByOwnerPaginated(ownerId, searchParams),
    staleTime: 5 * 60 * 1000,
  });

  // Usar datos iniciales de React Query si los props vienen vacíos
  const effectiveData = data.length > 0 ? data : initialResult?.data ?? [];
  const effectiveTotal = totalRows > 0 ? totalRows : initialResult?.total ?? 0;

  // ── Columnas ──────────────────────────────────────────────────────────────
  const columns = useMemo(() => getVehicleByOwnerColumns(), []);

  // ── Client-side navigation ────────────────────────────────────────────────
  const [currentParams, setCurrentParams] = useState<DataTableSearchParams>(searchParams);
  const handleStateChange = useCallback((params: DataTableSearchParams) => {
    setCurrentParams(params);
  }, []);

  const tableQueryFn = useCallback(
    (params: DataTableSearchParams) => getVehiclesByOwnerPaginated(ownerId, params),
    [ownerId]
  );

  // ── Lazy-load facets — factory ────────────────────────────────────────────
  const makeFetchFacet = useCallback(
    (columnId: string) =>
      async (params: DataTableSearchParams): Promise<FacetResult> => {
        const result = await getVehicleByOwnerSingleFacet(ownerId, columnId, params);
        if (!result) return { options: [], counts: new Map<string, number>() };

        switch (columnId) {
          case 'condition':
            return { ...result, options: addIconsToOptions(result.options, CONDITION_ICONS) };
          case 'status':
            return { ...result, options: addIconsToOptions(result.options, STATUS_ICONS) };
          case 'subType': {
            const optionsWithNull = result.options.map((opt) =>
              opt.value === '__null__' ? { ...opt, icon: CircleOff } : opt
            );
            return { ...result, options: optionsWithNull };
          }
          default:
            return result;
        }
      },
    [ownerId]
  );

  // ── Faceted filters ──────────────────────────────────────────────────────
  const facetedFilters = useMemo(
    () => [
      {
        columnId: 'condition',
        title: 'Condición',
        fetchFacet: makeFetchFacet('condition'),
      },
      {
        columnId: 'status',
        title: 'Estado documental',
        fetchFacet: makeFetchFacet('status'),
      },
      {
        columnId: 'type',
        title: 'Tipo',
        fetchFacet: makeFetchFacet('type'),
      },
      {
        columnId: 'subType',
        title: 'Subtipo',
        fetchFacet: makeFetchFacet('subType'),
      },
      {
        columnId: 'is_active',
        title: 'Estado',
        fetchFacet: makeFetchFacet('is_active'),
      },
    ],
    [makeFetchFacet]
  );

  // ── Filtros de texto ──────────────────────────────────────────────────────
  const textFilters = useMemo(
    () => [
      { columnId: 'domain', title: 'Dominio', type: 'text' as const },
      { columnId: 'intern_number', title: 'Número interno', type: 'text' as const },
      { columnId: 'serie', title: 'Serie', type: 'text' as const },
      { columnId: 'engine', title: 'Motor', type: 'text' as const },
      { columnId: 'chassis', title: 'Chassis', type: 'text' as const },
    ],
    []
  );

  // ── Todos los filtros combinados ──────────────────────────────────────────
  const allFilters = useMemo(() => [...facetedFilters, ...textFilters], [facetedFilters, textFilters]);

  // ── Visibilidad de filtros por defecto ────────────────────────────────────
  const mergedFilterVisibility = useMemo(() => {
    if (initialFilterVisibility && Object.keys(initialFilterVisibility).length > 0) {
      return initialFilterVisibility;
    }
    return Object.fromEntries(allFilters.map((f) => [f.columnId, DEFAULT_VISIBLE_FILTERS.includes(f.columnId)]));
  }, [initialFilterVisibility, allFilters]);

  // ── Visibilidad de columnas ───────────────────────────────────────────────
  const mergedColumnVisibility = useMemo(
    () => ({
      ...Object.fromEntries(VEHICLE_HIDDEN_COLUMNS_BY_DEFAULT.map((col) => [col, false])),
      ...initialColumnVisibility,
    }),
    [initialColumnVisibility]
  );

  // Skeleton mientras carga la primera vez (DESPUÉS de todos los hooks — Rules of Hooks)
  if (isInitialLoading && data.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-9 w-[120px] bg-muted animate-pulse rounded-md" />
          ))}
          <div className="ml-auto flex gap-2">
            <div className="h-9 w-[100px] bg-muted animate-pulse rounded-md" />
            <div className="h-9 w-[80px] bg-muted animate-pulse rounded-md" />
          </div>
        </div>
        <div className="border rounded-md">
          <div className="h-10 bg-muted/50 animate-pulse border-b" />
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 border-b animate-pulse bg-muted/20" />
          ))}
        </div>
        <div className="flex justify-between items-center">
          <div className="h-4 w-24 bg-muted animate-pulse rounded" />
          <div className="flex gap-2">
            <div className="h-8 w-20 bg-muted animate-pulse rounded-md" />
            <div className="h-8 w-8 bg-muted animate-pulse rounded-md" />
            <div className="h-8 w-8 bg-muted animate-pulse rounded-md" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <DataTable
      columns={columns}
      data={effectiveData}
      totalRows={effectiveTotal}
      searchParams={searchParams}
      queryFn={tableQueryFn}
      queryKey={['vehicles-by-owner', ownerId]}
      onStateChange={handleStateChange}
      tableId={tableId}
      paramNamespace={tableId}
      facetedFilters={allFilters}
      searchPlaceholder="Buscar por dominio, número interno, serie..."
      emptyMessage={`No hay equipos registrados para ${ownerName}`}
      showFilterToggle={true}
      initialColumnVisibility={mergedColumnVisibility}
      initialFilterVisibility={mergedFilterVisibility}
      exportConfig={{
        fetchAllData: () => getAllVehiclesByOwnerForExport(ownerId, currentParams),
        options: {
          filename: `equipos-${ownerName.toLowerCase().replace(/\s+/g, '-')}`,
          sheetName: 'Equipos por Titular',
          title: `Equipos de: ${ownerName}`,
        },
        formatters: {
          type_vehicles_typeTotype: (val: unknown) => (val as { name: string } | null)?.name ?? '-',
          sub_type: (val: unknown) => (val as { name: string } | null)?.name ?? '-',
          brand_vehicles: (val: unknown) => (val as { name: string } | null)?.name ?? '-',
          model_vehicles: (val: unknown) => (val as { name: string } | null)?.name ?? '-',
          condition: (val: unknown) => (val ? conditionLabels[val as string] ?? String(val) : '-'),
          status: (val: unknown) => (val ? otherEquipmentStatusLabels[val as string] ?? String(val) : '-'),
          is_active: (val: unknown) => (val === true ? 'Activo' : val === false ? 'Inactivo' : 'Sin asignar'),
          contractor_equipment: (val: unknown) => {
            if (!Array.isArray(val)) return 'Sin afectar';
            const names = (val as Array<{ customers: { name: string } | null }>)
              .map((c) => c.customers?.name ?? '')
              .filter(Boolean);
            return names.length > 0 ? names.join(', ') : 'Sin afectar';
          },
        },
      }}
    />
  );
}
