'use client';

import {
  DataTable,
  type DataTableFacetedFilterConfig,
  type DataTableSearchParams,
} from '@/shared/components/common/DataTable';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import { useQuery } from '@tanstack/react-query';
import { Building2, CheckCircle2, CircleOff, Clock, Truck, User, XCircle } from 'lucide-react';
import moment from 'moment';
import { useMemo } from 'react';
import {
  getAllChecklistAnswersForExport,
  getChecklistAnswersFacets,
  type ChecklistAnswerListItem,
} from '../actions.server';
import { normalizeResult } from '../utils';
import {
  checklistResultLabels,
  getColumns,
  HIDDEN_COLUMNS_BY_DEFAULT,
} from '../columns';

// ============================================================================
// PROPS
// ============================================================================

interface Props {
  data: ChecklistAnswerListItem[];
  totalRows: number;
  searchParams: DataTableSearchParams;
  tableId: string;
  templateId: string;
  initialColumnVisibility: Record<string, boolean>;
  initialFilterVisibility: Record<string, boolean>;
}

// ============================================================================
// CLIENT COMPONENT
// ============================================================================

export function _ChecklistAnswersDataTable({
  data,
  totalRows,
  searchParams,
  tableId,
  templateId,
  initialColumnVisibility,
  initialFilterVisibility,
}: Props) {
  // Extraer solo los params relevantes para facets (sin page/sort/pageSize)
  const facetParams = useMemo(() => {
    const { page, pageSize, sort, sortBy, sortOrder, ...rest } = searchParams;
    return rest as DataTableSearchParams;
  }, [searchParams]);

  // Facets con cross-filtering
  const { data: facets } = useQuery({
    queryKey: ['checklist-answers-facets', templateId, facetParams],
    queryFn: () => getChecklistAnswersFacets(facetParams, templateId),
    staleTime: 5 * 60 * 1000,
  });

  // Columnas ocultas por defecto
  const mergedColumnVisibility = useMemo(() => {
    const defaults = Object.fromEntries(HIDDEN_COLUMNS_BY_DEFAULT.map((col) => [col, false]));
    return { ...defaults, ...initialColumnVisibility };
  }, [initialColumnVisibility]);

  // Filtros visibles por defecto — máximo 3
  const DEFAULT_VISIBLE_FILTERS = ['created_at', 'result', 'equipment_id'];
  const mergedFilterVisibility = useMemo(() => {
    if (initialFilterVisibility && Object.keys(initialFilterVisibility).length > 0) {
      return initialFilterVisibility;
    }
    const allFilterIds = [
      'created_at',
      'result',
      'equipment_id',
      'user_id',
      'chofer',
      'customer_id',
      'observations',
    ];
    return Object.fromEntries(
      allFilterIds.map((id) => [id, DEFAULT_VISIBLE_FILTERS.includes(id)])
    );
  }, [initialFilterVisibility]);

  // ─── Opciones de equipos desde facets ──────────────────────────────────────
  const equipmentOptions = useMemo(() => {
    if (!facets?.equipment_id || !facets?.vehicleNames) return [];
    const options: { value: string; label: string; icon: typeof Truck }[] = [];
    for (const [id, count] of facets.equipment_id.entries()) {
      if (id === NULL_FILTER_VALUE || count === 0) continue;
      const label = facets.vehicleNames.get(id) ?? id;
      options.push({ value: id, label, icon: Truck });
    }
    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [facets]);

  // ─── Opciones de usuarios desde facets ─────────────────────────────────────
  const userOptions = useMemo(() => {
    if (!facets?.user_id || !facets?.userNames) return [];
    const options: { value: string; label: string; icon: typeof User }[] = [];
    for (const [id] of facets.user_id.entries()) {
      if (id === NULL_FILTER_VALUE) continue;
      const label = facets.userNames.get(id) ?? id;
      options.push({ value: id, label, icon: User });
    }
    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [facets]);

  // ─── Opciones de choferes desde facets (empleados con legajo) ──────────────
  const choferOptions = useMemo(() => {
    if (!facets?.chofer_employee_id || !facets?.choferNames) return [];
    const options: { value: string; label: string; icon: typeof User }[] = [];
    for (const [id, count] of facets.chofer_employee_id.entries()) {
      if (id === NULL_FILTER_VALUE || count === 0) continue;
      const label = facets.choferNames.get(id) ?? id;
      options.push({ value: id, label, icon: User });
    }
    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [facets]);

  // ─── Opciones de clientes desde facets ─────────────────────────────────────
  const customerOptions = useMemo(() => {
    if (!facets?.customer_id || !facets?.customerNames) return [];
    const options: { value: string; label: string; icon: typeof Building2 }[] = [];
    for (const [id, count] of facets.customer_id.entries()) {
      if (id === NULL_FILTER_VALUE || count === 0) continue;
      const label = facets.customerNames.get(id) ?? id;
      options.push({ value: id, label, icon: Building2 });
    }
    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [facets]);

  // ─── Filtros facetados ──────────────────────────────────────────────────────
  const facetedFilters: DataTableFacetedFilterConfig[] = useMemo(
    () => [
      // Fecha de respuesta (dateRange)
      {
        columnId: 'created_at',
        title: 'Fecha',
        type: 'dateRange' as const,
      },

      // Resultado (enum normalizado, con iconos)
      {
        columnId: 'result',
        title: 'Resultado',
        options: [
          { value: 'passed', label: checklistResultLabels['passed'], icon: CheckCircle2 },
          { value: 'failed', label: checklistResultLabels['failed'], icon: XCircle },
          // 'pending' usa NULL_FILTER_VALUE para representar ausencia de resultado
          { value: NULL_FILTER_VALUE, label: checklistResultLabels['pending'], icon: Clock },
        ],
        externalCounts: facets?.result
          ? (() => {
              // Remapear el Map: el key 'pending' se expone como NULL_FILTER_VALUE en el filtro
              const remapped = new Map<string, number>();
              for (const [key, count] of facets.result.entries()) {
                if (key === 'pending') {
                  remapped.set(NULL_FILTER_VALUE, (remapped.get(NULL_FILTER_VALUE) ?? 0) + count);
                } else {
                  remapped.set(key, count);
                }
              }
              return remapped;
            })()
          : undefined,
      },

      // Equipo (FK UUID, con nombres de vehículos)
      {
        columnId: 'equipment_id',
        title: 'Equipo',
        options: [
          ...equipmentOptions,
          ...(facets?.equipment_id?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin equipo', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.equipment_id,
      },

      // Usuario (FK UUID → profile)
      {
        columnId: 'user_id',
        title: 'Usuario',
        options: [
          ...userOptions,
          ...(facets?.user_id?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin usuario', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.user_id,
      },

      // Chofer (FK UUID → employees, con legajo)
      {
        columnId: 'chofer',
        title: 'Chofer',
        options: [
          ...choferOptions,
          ...(facets?.chofer_employee_id?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin chofer', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.chofer_employee_id,
      },

      // Cliente (columna GENERATED desde JSONB → customers)
      {
        columnId: 'customer_id',
        title: 'Cliente',
        options: [
          ...customerOptions,
          ...(facets?.customer_id?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin cliente', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.customer_id,
      },

      // Observaciones (filtro de texto)
      {
        columnId: 'observations',
        title: 'Observaciones',
        type: 'text' as const,
      },
    ],
    [facets, equipmentOptions, userOptions, choferOptions, customerOptions]
  );

  // ─── Columnas ────────────────────────────────────────────────────────────────
  const columns = useMemo(() => getColumns(templateId), [templateId]);

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <DataTable
      columns={columns}
      data={data}
      totalRows={totalRows}
      searchParams={searchParams}
      searchPlaceholder="Buscar respuestas..."
      facetedFilters={facetedFilters}
      initialColumnVisibility={mergedColumnVisibility}
      initialFilterVisibility={mergedFilterVisibility}
      tableId={tableId}
      paramNamespace={tableId}
      showFilterToggle={true}
      emptyMessage="No hay respuestas registradas para este checklist"
      data-testid="checklist-answers-table"
      exportConfig={{
        fetchAllData: () => getAllChecklistAnswersForExport(searchParams, templateId),
        options: {
          filename: 'respuestas-checklist',
          title: 'Respuestas de Checklist',
          sheetName: 'Respuestas',
        },
        formatters: {
          created_at: (val) => (val ? moment(val as string).format('DD/MM/YYYY') : ''),
          result: (val) => {
            const normalized = normalizeResult(val as string | null);
            return checklistResultLabels[normalized] ?? String(val ?? '');
          },
          observations: (val) => String(val ?? ''),
          kilometraje: (val) => (val != null ? String(val) : ''),
          horometro: (val) => (val != null ? String(val) : ''),
          customer_id: (val) => String(val ?? ''),
        },
      }}
    />
  );
}
