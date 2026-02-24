'use client';

import { DataTable } from '@/shared/components/common/DataTable';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import type {
  DataTableExportConfig,
  DataTableFacetedFilterConfig,
  DataTableSearchParams,
} from '@/shared/components/common/DataTable/types';
import {
  affiliateStatusLabels,
  costTypeLabels,
  documentTypeLabels,
  employeeStatusLabels,
  genderLabels,
  getEnumLabel,
  levelOfEducationLabels,
  maritalStatusLabels,
  nationalityLabels,
  reasonForTerminationLabels,
} from '@/shared/utils/mappers';
import { useQuery } from '@tanstack/react-query';
import type { LucideIcon } from 'lucide-react';
import moment from 'moment';
import { useMemo } from 'react';
import {
  getAllEmployeesForExport,
  getEmployeesFacets,
  type EmployeeFacets,
  type EmployeeListItem,
} from '../actions.server';
import {
  HIDDEN_COLUMNS_BY_DEFAULT,
  affiliateStatusIcons,
  costTypeIcons,
  documentTypeIcons,
  employeeStatusIcons,
  genderIcons,
  getColumns,
  levelOfEducationIcons,
  maritalStatusIcons,
  nationalityIcons,
  reasonForTerminationIcons,
} from '../columns';

// ============================================================================
// TYPES
// ============================================================================

interface EmployeeDataTableProps {
  data: EmployeeListItem[];
  totalRows: number;
  searchParams: DataTableSearchParams;
  isActive: boolean;
  tableId: string;
  /** Flat permissions map from server: "module:tab:action" → boolean */
  permissionsMap: Record<string, boolean>;
  initialColumnVisibility?: Record<string, boolean>;
  initialFilterVisibility?: Record<string, boolean>;
}

// ============================================================================
// ENUM LABEL MAPS (for faceted filter options)
// ============================================================================

const ENUM_LABEL_MAPS: Record<string, Record<string, string>> = {
  status: employeeStatusLabels,
  gender: genderLabels,
  nationality: nationalityLabels,
  document_type: documentTypeLabels,
  marital_status: maritalStatusLabels,
  level_of_education: levelOfEducationLabels,
  cost_type: costTypeLabels,
  affiliate_status: affiliateStatusLabels,
  reason_for_termination: reasonForTerminationLabels,
};

// ============================================================================
// HELPER: Build faceted filter options
// ============================================================================

/**
 * Converts a plain Record<string, number> (from server action) into a Map<string, number>
 * (required by DataTableFacetedFilter which uses Map API for compatibility with TanStack Table).
 *
 * Server actions return Records instead of Maps to ensure proper serialization
 * via React Flight protocol.
 */
function recordToMap(record: Record<string, number>): Map<string, number> {
  return new Map(Object.entries(record));
}

function buildEnumFacetFilter(
  columnId: string,
  title: string,
  facets: EmployeeFacets | undefined,
  iconMap?: Record<string, LucideIcon>
): DataTableFacetedFilterConfig {
  const facet = facets?.[columnId as keyof EmployeeFacets] as { counts: Record<string, number> } | undefined;
  const labelMap = ENUM_LABEL_MAPS[columnId];
  const countsRecord = facet?.counts ?? {};

  const options = Object.keys(countsRecord)
    .filter((key) => key !== NULL_FILTER_VALUE)
    .map((key) => ({
      value: key,
      label: labelMap ? getEnumLabel(key, labelMap) : key,
      ...(iconMap?.[key] ? { icon: iconMap[key] } : {}),
    }));

  // Add "Sin asignar" option if there are null values
  const nullCount = countsRecord[NULL_FILTER_VALUE];
  if (nullCount && nullCount > 0) {
    options.push({ value: NULL_FILTER_VALUE, label: 'Sin asignar' });
  }

  return {
    columnId,
    title,
    type: 'faceted',
    disabled: !facets,
    options,
    externalCounts: recordToMap(countsRecord),
  };
}

function buildFkFacetFilter(
  columnId: string,
  title: string,
  facets: EmployeeFacets | undefined
): DataTableFacetedFilterConfig {
  const facet = facets?.[columnId as keyof EmployeeFacets] as
    | { counts: Record<string, number>; options: Array<{ value: string; label: string }> }
    | undefined;

  const countsRecord = facet?.counts ?? {};
  const options = [...(facet?.options ?? [])];

  // Add "Sin asignar" option if there are null values
  const nullCount = countsRecord[NULL_FILTER_VALUE];
  if (nullCount && nullCount > 0) {
    options.push({ value: NULL_FILTER_VALUE, label: 'Sin asignar' });
  }

  return {
    columnId,
    title,
    type: 'faceted',
    disabled: !facets,
    options,
    externalCounts: recordToMap(countsRecord),
  };
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function _EmployeeDataTable({
  data,
  totalRows,
  searchParams,
  isActive,
  tableId,
  permissionsMap,
  initialColumnVisibility,
  initialFilterVisibility,
}: EmployeeDataTableProps) {
  // Build hasPermission helper from serializable map (inside client component)
  const permissions = useMemo(
    () => ({
      hasPermission: (module: string, tab: string, action: string) =>
        permissionsMap[`${module}:${tab}:${action}`] === true,
    }),
    [permissionsMap]
  );

  // Load facets client-side (non-blocking)
  const { data: facets } = useQuery({
    queryKey: ['employees-facets', isActive],
    queryFn: () => getEmployeesFacets(isActive),
    staleTime: 5 * 60 * 1000,
  });

  // Columns
  const columns = useMemo(() => getColumns(permissions, isActive), [permissions, isActive]);

  // Initial column visibility: merge defaults with saved preferences
  const mergedColumnVisibility = useMemo(() => {
    const defaults: Record<string, boolean> = {};
    for (const col of HIDDEN_COLUMNS_BY_DEFAULT) {
      defaults[col] = false;
    }
    return { ...defaults, ...initialColumnVisibility };
  }, [initialColumnVisibility]);

  // Faceted filters configuration
  const facetedFilters = useMemo((): DataTableFacetedFilterConfig[] => {
    const filters: DataTableFacetedFilterConfig[] = [
      // Enums
      buildEnumFacetFilter('status', 'Estado', facets, employeeStatusIcons),
      buildEnumFacetFilter('gender', 'Genero', facets, genderIcons),
      buildEnumFacetFilter('nationality', 'Nacionalidad', facets, nationalityIcons),
      buildEnumFacetFilter('document_type', 'Tipo de Documento', facets, documentTypeIcons),
      buildEnumFacetFilter('marital_status', 'Estado Civil', facets, maritalStatusIcons),
      buildEnumFacetFilter('level_of_education', 'Nivel de Educacion', facets, levelOfEducationIcons),
      buildEnumFacetFilter('cost_type', 'Tipo de costo', facets, costTypeIcons),
      buildEnumFacetFilter('affiliate_status', 'Estado de afiliacion', facets, affiliateStatusIcons),

      // FK UUID
      buildFkFacetFilter('hierarchy', 'Sector', facets),
      buildFkFacetFilter('company_positions', 'Puesto', facets),
      buildFkFacetFilter('types_of_contract', 'Tipo de Contrato', facets),
      buildFkFacetFilter('work_diagram', 'Diagrama', facets),
      buildFkFacetFilter('workshop_sectors', 'Sector de taller', facets),
      buildFkFacetFilter('category', 'Categoria', facets),
      buildFkFacetFilter('covenant', 'Convenio', facets),
      buildFkFacetFilter('guild', 'Sindicato', facets),
      buildFkFacetFilter('cost_center', 'Centro de costo', facets),
      buildFkFacetFilter('countries', 'Pais de nacimiento', facets),

      // FK BigInt
      buildFkFacetFilter('province', 'Provincia', facets),
      buildFkFacetFilter('city', 'Ciudad', facets),

      // M:M
      buildFkFacetFilter('contractor_employee', 'Afectaciones', facets),
      buildFkFacetFilter('empleado_aptitudes', 'Aptitudes tecnicas', facets),

      // Text filters
      { columnId: 'fullName', title: 'Nombre', type: 'text', placeholder: 'Buscar por nombre...' },
      { columnId: 'email', title: 'Email', type: 'text', placeholder: 'Buscar por email...' },
      { columnId: 'cuil', title: 'CUIL', type: 'text', placeholder: 'Buscar por CUIL...' },
      { columnId: 'document_number', title: 'Documento', type: 'text', placeholder: 'Buscar por documento...' },
      { columnId: 'phone', title: 'Telefono', type: 'text', placeholder: 'Buscar por telefono...' },
      { columnId: 'street', title: 'Calle', type: 'text', placeholder: 'Buscar por calle...' },
      { columnId: 'street_number', title: 'Altura', type: 'text', placeholder: 'Buscar por altura...' },
      { columnId: 'postal_code', title: 'CP', type: 'text', placeholder: 'Buscar por CP...' },
      { columnId: 'file', title: 'Legajo', type: 'text', placeholder: 'Buscar por legajo...' },
      { columnId: 'born_date', title: 'Nacimiento', type: 'dateRange' },
      { columnId: 'normal_hours', title: 'Horas', type: 'text', placeholder: 'Buscar por horas...' },

      // Date range filters
      { columnId: 'date_of_admission', title: 'Fecha de ingreso', type: 'dateRange' },
      { columnId: 'created_at', title: 'Fecha de creacion', type: 'dateRange' },
    ];

    // Conditional filters for inactive employees
    if (!isActive) {
      filters.push(
        buildEnumFacetFilter('reason_for_termination', 'Motivo de baja', facets, reasonForTerminationIcons),
        { columnId: 'termination_date', title: 'Fecha de baja', type: 'dateRange' }
      );
    }

    return filters;
  }, [facets, isActive]);

  // Export configuration
  const exportConfig = useMemo(
    (): DataTableExportConfig<EmployeeListItem> => ({
      fetchAllData: () => getAllEmployeesForExport(searchParams, isActive),
      options: {
        filename: isActive ? 'empleados-activos' : 'empleados-inactivos',
        sheetName: isActive ? 'Empleados Activos' : 'Empleados Inactivos',
        title: isActive ? 'Listado de Empleados Activos' : 'Listado de Empleados Inactivos',
      },
      formatters: {
        status: (value) => getEnumLabel(value as string, employeeStatusLabels),
        gender: (value) => getEnumLabel(value as string, genderLabels),
        nationality: (value) => getEnumLabel(value as string, nationalityLabels),
        document_type: (value) => getEnumLabel(value as string, documentTypeLabels),
        marital_status: (value) => getEnumLabel(value as string, maritalStatusLabels),
        level_of_education: (value) => getEnumLabel(value as string, levelOfEducationLabels),
        cost_type: (value) => getEnumLabel(value as string, costTypeLabels),
        affiliate_status: (value) => getEnumLabel(value as string, affiliateStatusLabels),
        reason_for_termination: (value) => getEnumLabel(value as string, reasonForTerminationLabels),
        date_of_admission: (value) => (value ? moment(value as string | Date).format('DD/MM/YYYY') : '-'),
        created_at: (value) => (value ? moment(value as string | Date).format('DD/MM/YYYY') : '-'),
        termination_date: (value) => (value ? moment(value as string | Date).format('DD/MM/YYYY') : '-'),
        born_date: (value) => {
          if (!value) return '-';
          const parsed = moment(value as string, ['YYYY-MM-DD', 'DD/MM/YYYY'], true);
          return parsed.isValid() ? parsed.format('DD/MM/YYYY') : String(value);
        },
        province: (_value, row) => row.provinces?.name ?? '-',
        city: (_value, row) => row.cities?.name ?? '-',
        is_active: (value) => (value ? 'Activo' : 'Inactivo'),
        contractor_employee: (_value, row) => {
          const contractors = row.contractor_employee ?? [];
          const names = contractors.map((c) => c.customers?.name ?? '').filter(Boolean);
          return names.length > 0 ? names.join(', ') : 'Sin afectar';
        },
        empleado_aptitudes: (_value, row) => {
          const aptitudes = row.empleado_aptitudes ?? [];
          const names = aptitudes.map((a) => a.aptitudes_tecnicas?.nombre ?? '').filter(Boolean);
          return names.length > 0 ? names.join(', ') : '-';
        },
      },
    }),
    [searchParams, isActive]
  );

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <DataTable
        columns={columns}
        data={data}
        totalRows={totalRows}
        searchParams={searchParams}
        tableId={tableId}
        facetedFilters={facetedFilters}
        exportConfig={exportConfig}
        initialColumnVisibility={mergedColumnVisibility}
        initialFilterVisibility={initialFilterVisibility}
        showFilterToggle
        showSearch
        searchPlaceholder="Buscar por nombre, CUIL o legajo..."
        enableRowSelection
        showRowSelection
        emptyMessage="No se encontraron empleados"
      />
    </div>
  );
}
