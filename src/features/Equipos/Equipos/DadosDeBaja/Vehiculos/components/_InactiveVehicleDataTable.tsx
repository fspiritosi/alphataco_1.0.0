'use client';

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
import { CircleOff } from 'lucide-react';
import moment from 'moment';
import { useMemo } from 'react';
import {
  getAllInactiveVehiclesForExport,
  getInactiveVehicleFacets,
  type InactiveVehicleListItem,
} from '../actions/actions.server';
import { HIDDEN_COLUMNS_BY_DEFAULT, columns, conditionIcons } from './columns';

// ============================================================================
// TYPES
// ============================================================================

interface Props {
  data: InactiveVehicleListItem[];
  totalRows: number;
  searchParams: DataTableSearchParams;
  tableId: string;
  initialColumnVisibility: Record<string, boolean>;
  initialFilterVisibility: Record<string, boolean>;
}

// ============================================================================
// CLIENT COMPONENT
// ============================================================================

export function _InactiveVehicleDataTable({
  data,
  totalRows,
  searchParams,
  tableId,
  initialColumnVisibility,
  initialFilterVisibility,
}: Props) {
  // Extraer solo los params relevantes para facets (sin page/sort)
  const facetParams = useMemo(() => {
    const { page, pageSize, sort, sortBy, sortOrder, ...rest } = searchParams;
    return rest;
  }, [searchParams]);

  // Facets con cross-filtering: se recalculan cuando cambian los filtros
  const { data: facets } = useQuery({
    queryKey: ['inactive-vehicles-facets', facetParams],
    queryFn: () => getInactiveVehicleFacets(facetParams),
    staleTime: 5 * 60 * 1000,
  });

  // Columnas ocultas por defecto (unir preferencias guardadas con las del sistema)
  const mergedColumnVisibility = useMemo(() => {
    const defaults = Object.fromEntries(HIDDEN_COLUMNS_BY_DEFAULT.map((col) => [col, false]));
    return { ...defaults, ...initialColumnVisibility };
  }, [initialColumnVisibility]);

  // Filtros visibles por defecto: solo los 3 más comunes.
  // El resto se crean pero ocultos — el usuario los activa con el toggle de filtros.
  const DEFAULT_VISIBLE_FILTERS = ['condition', 'reason_for_termination', 'type'];
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
      'cost_type',
      'currency',
      'type_of_contract',
      'reason_for_termination',
      'sector',
      'owner',
      'cost_center',
      'contractor_equipment',
      'domain',
      'intern_number',
      'chassis',
      'engine',
      'serie',
      'termination_date',
      'contract_start_date',
      'contract_expiration_date',
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

      // type (FK UUID — nullable, incluye "Sin asignar")
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

      // sub_type (FK UUID — nullable, incluye "Sin asignar")
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

      // brand (FK BigInt — nullable, incluye "Sin asignar")
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

      // model (FK BigInt — nullable, incluye "Sin asignar")
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

      // type_of_contract (enum nullable)
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

      // sector (FK UUID → hierarchy — nullable, incluye "Sin asignar")
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

      // owner (FK UUID → equipment_owners — nullable, incluye "Sin asignar")
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

      // cost_center (FK UUID — nullable, incluye "Sin asignar")
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

      // Filtros de texto libre por columna
      {
        columnId: 'domain',
        title: 'Dominio',
        type: 'text' as const,
        placeholder: 'Buscar por dominio...',
      },
      {
        columnId: 'intern_number',
        title: 'N° Interno',
        type: 'text' as const,
        placeholder: 'Buscar por N° Interno...',
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

      // Filtros de rango de fechas
      {
        columnId: 'termination_date',
        title: 'Fecha de baja',
        type: 'dateRange' as const,
      },
      {
        columnId: 'contract_start_date',
        title: 'Inicio de contrato',
        type: 'dateRange' as const,
      },
      {
        columnId: 'contract_expiration_date',
        title: 'Vencimiento de contrato',
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

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <DataTable
      columns={columns}
      data={data}
      totalRows={totalRows}
      searchParams={searchParams}
      searchPlaceholder="Buscar por dominio, N° interno, chassis..."
      facetedFilters={facetedFilters}
      initialColumnVisibility={mergedColumnVisibility}
      initialFilterVisibility={mergedFilterVisibility}
      tableId={tableId}
      paramNamespace={tableId}
      showFilterToggle={true}
      emptyMessage="No hay vehículos dados de baja"
      data-testid="inactive-vehicles-table"
      exportConfig={{
        fetchAllData: () => getAllInactiveVehiclesForExport(searchParams),
        options: {
          filename: 'vehiculos-dados-de-baja',
          title: 'Vehículos Dados de Baja',
          sheetName: 'Vehículos Dados de Baja',
        },
        formatters: {
          condition: (val) => conditionLabels[val as string] ?? String(val ?? ''),
          status: (val) => otherEquipmentStatusLabels[val as string] ?? String(val ?? ''),
          cost_type: (val) => costTypeLabels[val as string] ?? String(val ?? ''),
          currency: (val) => currencyLabels[val as string] ?? String(val ?? ''),
          type_of_contract: (val) => contractTypeVehiclesLabels[val as string] ?? String(val ?? ''),
          reason_for_termination: (val) => terminationReasonEquipmentLabels[val as string] ?? String(val ?? ''),
          termination_date: (val) => (val ? moment(val as string).format('DD/MM/YYYY') : ''),
          contract_start_date: (val) => (val ? moment(val as string).format('DD/MM/YYYY') : ''),
          contract_expiration_date: (val) => (val ? moment(val as string).format('DD/MM/YYYY') : ''),
          created_at: (val) => (val ? moment(val as string).format('DD/MM/YYYY') : ''),
          price: (val) => (val != null ? String(val) : ''),
        },
      }}
    />
  );
}
