'use client';

import { Button } from '@/components/ui/button';
import { PermissionGuard } from '@/features/Permissions/components/PermissionGuard';
import {
  condition_enum,
  contract_type_vehicles_enum,
  cost_type_enum,
  currency_enum,
  status_type,
  termination_reason_enum,
} from '@/generated/prisma/enums';
import {
  DataTable,
  type DataTableFacetedFilterConfig,
  type DataTableSearchParams,
} from '@/shared/components/common/DataTable';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import {
  conditionLabels,
  contractTypeVehiclesLabels,
  costTypeLabels,
  currencyLabels,
  otherEquipmentStatusLabels,
  terminationReasonEquipmentLabels,
} from '@/shared/utils/mappers';
import { useQuery } from '@tanstack/react-query';
import { CircleOff, Plus } from 'lucide-react';
import moment from 'moment';
import Link from 'next/link';
import { useMemo } from 'react';
import { getAllVehiclesForExport, getVehicleFacets, type VehicleListItem } from '../actions/actions.server';
import { HIDDEN_COLUMNS_BY_DEFAULT, columns, conditionIcons } from '../columns';

// ============================================================================
// TYPES
// ============================================================================

interface Props {
  data: VehicleListItem[];
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

export function _VehicleDataTable({
  data,
  totalRows,
  searchParams,
  tableId,
  permissionsMap,
  initialColumnVisibility,
  initialFilterVisibility,
}: Props) {
  // Extraer solo los params relevantes para facets (sin page/sort)
  const facetParams = useMemo(() => {
    const { page, pageSize, sort, sortBy, sortOrder, ...rest } = searchParams;
    return rest;
  }, [searchParams]);

  // Facets con cross-filtering: se recalculan cuando cambian los filtros
  const { data: facets, isFetching: isFetchingFacets } = useQuery({
    queryKey: ['vehicles-facets', facetParams],
    queryFn: () => getVehicleFacets(facetParams),
    staleTime: 5 * 60 * 1000,
  });

  // Columnas ocultas por defecto (unir preferencias guardadas con las del sistema)
  const mergedColumnVisibility = useMemo(() => {
    const defaults = Object.fromEntries(HIDDEN_COLUMNS_BY_DEFAULT.map((col) => [col, false]));
    return { ...defaults, ...initialColumnVisibility };
  }, [initialColumnVisibility]);

  // Filtros visibles por defecto: solo los 3 más comunes.
  // El resto se crean pero ocultos — el usuario los activa con el toggle de filtros.
  const DEFAULT_VISIBLE_FILTERS = ['condition', 'status', 'type'];
  const mergedFilterVisibility = useMemo(() => {
    // Si el usuario ya tiene preferencias guardadas, usarlas
    if (initialFilterVisibility && Object.keys(initialFilterVisibility).length > 0) {
      return initialFilterVisibility;
    }
    // Caso contrario, solo mostrar los 3 filtros por defecto
    const allFilterIds = [
      'condition',
      'status',
      'type',
      'sub_type',
      'brand',
      'model',
      'owner',
      'sector',
      'cost_center',
      'contractor_equipment',
      'type_of_contract',
      'cost_type',
      'currency',
      'reason_for_termination',
      'domain',
      'chassis',
      'engine',
      'serie',
      'intern_number',
      'contract_number',
      'contract_expiration_date',
      'contract_start_date',
      'termination_date',
      'created_at',
    ];
    return Object.fromEntries(allFilterIds.map((id) => [id, DEFAULT_VISIBLE_FILTERS.includes(id)]));
  }, [initialFilterVisibility]);

  // ─── Filtros facetados ────────────────────────────────────────────────────
  const facetedFilters: DataTableFacetedFilterConfig[] = useMemo(
    () => [
      // condition (enum nullable) — con iconos que coinciden con las celdas
      {
        columnId: 'condition',
        title: 'Condición',
        options: [
          ...Object.values(condition_enum).map((value) => ({
            value,
            label: conditionLabels[value] ?? value,
            icon: conditionIcons[value],
          })),
          ...(facets?.condition?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.condition,
      },

      // status (enum nullable)
      {
        columnId: 'status',
        title: 'Estado',
        options: [
          ...Object.values(status_type).map((value) => ({
            value,
            label: otherEquipmentStatusLabels[value] ?? value,
          })),
          ...(facets?.status?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.status,
      },

      // type (FK UUID — con "Sin asignar")
      {
        columnId: 'type',
        title: 'Tipo',
        options: [
          ...(facets?.typeOptions?.map((t) => ({ value: t.id, label: t.name ?? '' })) ?? []),
          ...(facets?.type?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.type,
      },

      // sub_type (FK UUID nullable — con "Sin asignar")
      {
        columnId: 'sub_type',
        title: 'Subtipo',
        options: [
          ...(facets?.subTypeOptions?.map((t) => ({ value: t.id, label: t.name ?? '' })) ?? []),
          ...(facets?.sub_type?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.sub_type,
      },

      // brand (FK BigInt nullable — con "Sin asignar")
      {
        columnId: 'brand',
        title: 'Marca',
        options: [
          ...(facets?.brandOptions?.map((b) => ({ value: String(b.id), label: b.name ?? '' })) ?? []),
          ...(facets?.brand?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.brand,
      },

      // model (FK BigInt nullable — con "Sin asignar")
      {
        columnId: 'model',
        title: 'Modelo',
        options: [
          ...(facets?.modelOptions?.map((m) => ({ value: String(m.id), label: m.name ?? '' })) ?? []),
          ...(facets?.model?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.model,
      },

      // owner (FK UUID nullable — con "Sin asignar")
      {
        columnId: 'owner',
        title: 'Propietario',
        options: [
          ...(facets?.ownerOptions?.map((o) => ({ value: o.id, label: o.name ?? '' })) ?? []),
          ...(facets?.owner?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.owner,
      },

      // sector (FK UUID nullable → hierarchy — con "Sin asignar")
      {
        columnId: 'sector',
        title: 'Sector',
        options: [
          ...(facets?.sectorOptions?.map((s) => ({ value: s.id, label: s.name ?? '' })) ?? []),
          ...(facets?.sector?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.sector,
      },

      // cost_center (FK UUID nullable — con "Sin asignar")
      {
        columnId: 'cost_center',
        title: 'Centro de costo',
        options: [
          ...(facets?.costCenterOptions?.map((c) => ({ value: c.id, label: c.name ?? '' })) ?? []),
          ...(facets?.cost_center?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.cost_center,
      },

      // contractor_equipment (M:M → customers — incluye "Sin afectar")
      {
        columnId: 'contractor_equipment',
        title: 'Afectaciones',
        options: [
          ...(facets?.contractorOptions?.map((c) => ({ value: c.id, label: c.name ?? '' })) ?? []),
          ...(facets?.contractor_equipment?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin afectar', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.contractor_equipment,
      },

      // type_of_contract (enum nullable — con "Sin asignar")
      {
        columnId: 'type_of_contract',
        title: 'Tipo de contrato',
        options: [
          ...Object.values(contract_type_vehicles_enum).map((value) => ({
            value,
            label: contractTypeVehiclesLabels[value] ?? value,
          })),
          ...(facets?.type_of_contract?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.type_of_contract,
      },

      // cost_type (enum nullable)
      {
        columnId: 'cost_type',
        title: 'Tipo de costo',
        options: [
          ...Object.values(cost_type_enum).map((value) => ({
            value,
            label: costTypeLabels[value] ?? value,
          })),
          ...(facets?.cost_type?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.cost_type,
      },

      // currency (enum nullable)
      {
        columnId: 'currency',
        title: 'Moneda',
        options: [
          ...Object.values(currency_enum).map((value) => ({
            value,
            label: currencyLabels[value] ?? value,
          })),
          ...(facets?.currency?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.currency,
      },

      // reason_for_termination (enum nullable)
      {
        columnId: 'reason_for_termination',
        title: 'Motivo de baja',
        options: [
          ...Object.values(termination_reason_enum).map((value) => ({
            value,
            label: terminationReasonEquipmentLabels[value] ?? value,
          })),
          ...(facets?.reason_for_termination?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.reason_for_termination,
      },

      // Filtros de texto libre por columna
      {
        columnId: 'domain',
        title: 'Dominio',
        type: 'text' as const,
        placeholder: 'Buscar por dominio...',
      },
      {
        columnId: 'chassis',
        title: 'Chassis',
        type: 'text' as const,
        placeholder: 'Buscar por chassis...',
      },
      {
        columnId: 'engine',
        title: 'Motor',
        type: 'text' as const,
        placeholder: 'Buscar por motor...',
      },
      {
        columnId: 'serie',
        title: 'Serie',
        type: 'text' as const,
        placeholder: 'Buscar por serie...',
      },
      {
        columnId: 'intern_number',
        title: 'N° Interno',
        type: 'text' as const,
        placeholder: 'Buscar por N° Interno...',
      },
      {
        columnId: 'contract_number',
        title: 'N° Contrato',
        type: 'text' as const,
        placeholder: 'Buscar por N° de contrato...',
      },

      // Filtros de rango de fechas
      {
        columnId: 'contract_expiration_date',
        title: 'Vencimiento contrato',
        type: 'dateRange' as const,
      },
      {
        columnId: 'contract_start_date',
        title: 'Inicio contrato',
        type: 'dateRange' as const,
      },
      {
        columnId: 'termination_date',
        title: 'Fecha de baja',
        type: 'dateRange' as const,
      },
      {
        columnId: 'created_at',
        title: 'Creado',
        type: 'dateRange' as const,
      },
    ],
    [facets]
  );

  // ─── Botón "Nuevo vehículo" protegido por permisos ────────────────────────
  const toolbarActions = (
    <PermissionGuard module="equipos" tab="vehicles" action="create">
      <Button asChild variant="gh_orange" size="sm">
        <Link href="/dashboard/equipment/action?action=new">
          <Plus className="mr-2 size-4" />
          Agregar vehículo
        </Link>
      </Button>
    </PermissionGuard>
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <DataTable
      columns={columns}
      data={data}
      totalRows={totalRows}
      searchParams={searchParams}
      searchPlaceholder="Buscar por dominio, chassis, N° Interno..."
      facetedFilters={facetedFilters}
      initialColumnVisibility={mergedColumnVisibility}
      initialFilterVisibility={mergedFilterVisibility}
      tableId={tableId}
      paramNamespace={tableId}
      showFilterToggle={true}
      isFetchingFacets={isFetchingFacets}
      toolbarActions={toolbarActions}
      emptyMessage="No hay vehículos registrados"
      data-testid="vehicles-table"
      exportConfig={{
        fetchAllData: () => getAllVehiclesForExport(searchParams),
        options: {
          filename: 'vehiculos',
          title: 'Listado de Vehículos',
          sheetName: 'Vehículos',
        },
        formatters: {
          condition: (val) => conditionLabels[val as string] ?? String(val ?? ''),
          status: (val) => otherEquipmentStatusLabels[val as string] ?? String(val ?? ''),
          type_of_contract: (val) => contractTypeVehiclesLabels[val as string] ?? String(val ?? ''),
          cost_type: (val) => costTypeLabels[val as string] ?? String(val ?? ''),
          currency: (val) => currencyLabels[val as string] ?? String(val ?? ''),
          reason_for_termination: (val) => terminationReasonEquipmentLabels[val as string] ?? String(val ?? ''),
          contract_expiration_date: (val) => (val ? moment(val as string).format('DD/MM/YYYY') : ''),
          contract_start_date: (val) => (val ? moment(val as string).format('DD/MM/YYYY') : ''),
          termination_date: (val) => (val ? moment(val as string).format('DD/MM/YYYY') : ''),
          created_at: (val) => (val ? moment(val as string).format('DD/MM/YYYY') : ''),
          price: (val) => (val != null ? String(val) : ''),
        },
      }}
    />
  );
}
