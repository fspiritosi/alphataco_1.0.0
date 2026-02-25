'use client';

import { Button } from '@/components/ui/button';
import { PermissionGuard } from '@/features/Permissions/components/PermissionGuard';
import {
  condition_enum,
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
import { getAllOtherEquipmentForExport, getOtherEquipmentFacets, type OtherEquipmentListItem } from '../actions.server';
import { HIDDEN_COLUMNS_BY_DEFAULT, columns, conditionIcons } from '../columns';

// ============================================================================
// TYPES
// ============================================================================

interface Props {
  data: OtherEquipmentListItem[];
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

export function _OtherEquipmentDataTable({
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
  const { data: facets } = useQuery({
    queryKey: ['other-equipment-facets', facetParams],
    queryFn: () => getOtherEquipmentFacets(facetParams),
    staleTime: 5 * 60 * 1000,
  });

  // Columnas ocultas por defecto (unir preferencias guardadas con las del sistema)
  const mergedColumnVisibility = useMemo(() => {
    const defaults = Object.fromEntries(HIDDEN_COLUMNS_BY_DEFAULT.map((col) => [col, false]));
    return { ...defaults, ...initialColumnVisibility };
  }, [initialColumnVisibility]);

  // Filtros visibles por defecto: solo los 3 mas comunes.
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
      'sector',
      'owner',
      'cost_center',
      'linked_vehicle',
      'contractor_other_equipment',
      'cost_type',
      'currency',
      'reason_for_termination',
      'serial_number',
      'intern_number',
      'manufacturer_plate',
      'invoice_number',
      'purchase_date',
      'created_at',
      'termination_date',
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

      // linked_vehicle (FK UUID → vehicles — nullable, incluye "Sin asignar")
      {
        columnId: 'linked_vehicle',
        title: 'Vinculado a',
        options: [
          ...(facets?.linkedVehicleOptions?.map((v) => ({
            value: v.id,
            label: v.domain ?? v.id,
          })) ?? []),
          ...(facets?.linked_vehicle?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.linked_vehicle,
      },

      // contractor_other_equipment (M:M → customers — incluye "Sin afectar")
      {
        columnId: 'contractor_other_equipment',
        title: 'Afectaciones',
        options: [
          ...(facets?.contractorOptions?.map((c) => ({ value: c.id, label: c.name ?? '' })) ?? []),
          ...(facets?.contractor_other_equipment?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin afectar', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.contractor_other_equipment,
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

      // currency (enum nullable) — solo aparece si el usuario activa la columna
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
        columnId: 'serial_number',
        title: 'N° Serie',
        type: 'text' as const,
        placeholder: 'Buscar por N° Serie...',
      },
      {
        columnId: 'intern_number',
        title: 'N° Interno',
        type: 'text' as const,
        placeholder: 'Buscar por N° Interno...',
      },
      {
        columnId: 'manufacturer_plate',
        title: 'Placa fabricante',
        type: 'text' as const,
        placeholder: 'Buscar por placa...',
      },
      {
        columnId: 'invoice_number',
        title: 'N° Factura',
        type: 'text' as const,
        placeholder: 'Buscar por N° de factura...',
      },

      // Filtros de rango de fechas
      {
        columnId: 'purchase_date',
        title: 'Fecha de compra',
        type: 'dateRange' as const,
      },
      {
        columnId: 'created_at',
        title: 'Creado',
        type: 'dateRange' as const,
      },
      {
        columnId: 'termination_date',
        title: 'Fecha de baja',
        type: 'dateRange' as const,
      },
    ],
    [facets]
  );

  // ─── Botón "Nuevo equipo" protegido por permisos ──────────────────────────
  const toolbarActions = (
    <PermissionGuard module="equipos" tab="others" action="create">
      <Button asChild variant="gh_orange" size="sm">
        <Link href="/dashboard/equipment/action?action=new&type=other">
          <Plus className="mr-2 size-4" />
          Nuevo equipo
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
      searchPlaceholder="Buscar por N° Serie, N° Interno, placa..."
      facetedFilters={facetedFilters}
      initialColumnVisibility={mergedColumnVisibility}
      initialFilterVisibility={mergedFilterVisibility}
      tableId={tableId}
      paramNamespace={tableId}
      showFilterToggle={true}
      toolbarActions={toolbarActions}
      emptyMessage="No hay equipos registrados"
      data-testid="other-equipment-table"
      exportConfig={{
        fetchAllData: () => getAllOtherEquipmentForExport(searchParams),
        options: {
          filename: 'otros-equipos',
          title: 'Listado de Otros Equipos',
          sheetName: 'Otros Equipos',
        },
        formatters: {
          condition: (val) => conditionLabels[val as string] ?? String(val ?? ''),
          status: (val) => otherEquipmentStatusLabels[val as string] ?? String(val ?? ''),
          cost_type: (val) => costTypeLabels[val as string] ?? String(val ?? ''),
          currency: (val) => currencyLabels[val as string] ?? String(val ?? ''),
          reason_for_termination: (val) => terminationReasonEquipmentLabels[val as string] ?? String(val ?? ''),
          purchase_date: (val) => (val ? moment(val as string).format('DD/MM/YYYY') : ''),
          termination_date: (val) => (val ? moment(val as string).format('DD/MM/YYYY') : ''),
          created_at: (val) => (val ? moment(val as string).format('DD/MM/YYYY') : ''),
          initial_value: (val) => (val != null ? String(val) : ''),
          horometer: (val) => (val != null ? `${String(val)} h` : ''),
        },
      }}
    />
  );
}
