'use client';

import { Button } from '@/components/ui/button';
import { PermissionGuard } from '@/features/Permissions/components/PermissionGuard';
import {
  affiliate_status_enum,
  cost_type_enum,
  document_type_enum,
  gender_enum,
  level_of_education_enum,
  marital_status_enum,
  nationality_enum,
  reason_for_termination_enum,
  status_type,
} from '@/generated/prisma/enums';
import {
  DataTable,
  type DataTableFacetedFilterConfig,
  type DataTableSearchParams,
} from '@/shared/components/common/DataTable';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
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
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { CircleOff, Plus } from 'lucide-react';
import moment from 'moment';
import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import {
  getAllEmployeesForExport,
  getEmployeesFacets,
  getEmployeesPaginated,
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
  /** Pre-fetched facets from SSR — eliminates client waterfall on initial load */
  initialFacets: EmployeeFacets;
  initialColumnVisibility?: Record<string, boolean>;
  initialFilterVisibility?: Record<string, boolean>;
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
  initialFacets,
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

  // ─── Client-side navigation: estado reactivo para queries dependientes ──────
  // Cuando DataTable cambia filtros/paginación (via onStateChange), actualizamos
  // currentParams → React Query se re-ejecuta → facets y export usan params frescos
  const [currentParams, setCurrentParams] = useState<DataTableSearchParams>(searchParams);

  const handleStateChange = useCallback((params: DataTableSearchParams) => {
    setCurrentParams(params);
  }, []);

  // queryFn para fetch client-side de datos de tabla
  const tableQueryFn = useCallback(
    (params: DataTableSearchParams) => getEmployeesPaginated(params, isActive),
    [isActive]
  );

  // Extraer solo los params relevantes para facets (sin page/sort)
  const facetParams = useMemo(() => {
    const { page, pageSize, sort, sortBy, sortOrder, ...rest } = currentParams;
    return rest;
  }, [currentParams]);

  // Facets con cross-filtering: initialData del SSR + keepPreviousData evita flash al cambiar filtros
  const { data: facets, isFetching: isFetchingFacets } = useQuery({
    queryKey: ['employees-facets', isActive, facetParams],
    queryFn: () => getEmployeesFacets(isActive, facetParams),
    initialData: initialFacets ?? undefined,
    placeholderData: keepPreviousData,
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

  // Filtros visibles por defecto: solo los 3 más comunes (distintos para activos/inactivos)
  const DEFAULT_VISIBLE_FILTERS = isActive
    ? ['status', 'hierarchy', 'company_positions']
    : ['reason_for_termination', 'status', 'hierarchy'];
  const mergedFilterVisibility = useMemo(() => {
    // Si el usuario ya tiene preferencias guardadas, usarlas
    if (initialFilterVisibility && Object.keys(initialFilterVisibility).length > 0) {
      return initialFilterVisibility;
    }
    // Caso contrario, solo mostrar los filtros por defecto
    const allFilterIds = [
      'status',
      'gender',
      'nationality',
      'document_type',
      'marital_status',
      'level_of_education',
      'cost_type',
      'affiliate_status',
      'reason_for_termination',
      'is_active',
      'hierarchy',
      'company_positions',
      'types_of_contract',
      'work_diagram',
      'workshop_sectors',
      'category',
      'covenant',
      'guild',
      'cost_center',
      'countries',
      'province',
      'city',
      'contractor_employee',
      'empleado_aptitudes',
      'fullName',
      'email',
      'cuil',
      'document_number',
      'phone',
      'street',
      'street_number',
      'postal_code',
      'file',
      'normal_hours',
      'born_date',
      'date_of_admission',
      'created_at',
      'termination_date',
    ];
    return Object.fromEntries(allFilterIds.map((id) => [id, DEFAULT_VISIBLE_FILTERS.includes(id)]));
  }, [initialFilterVisibility]);

  // ─── Filtros facetados ─────────────────────────────────────────────────────
  const facetedFilters: DataTableFacetedFilterConfig[] = useMemo(
    () => [
      // ── Enums ──────────────────────────────────────────────────────────────

      // status (enum nullable) — con iconos que coinciden con las celdas
      {
        columnId: 'status',
        title: 'Estado',
        options: [
          ...Object.values(status_type).map((value) => ({
            value,
            label: employeeStatusLabels[value] ?? value,
            icon: employeeStatusIcons[value],
          })),
          ...(facets?.status?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.status,
      },

      // gender (enum nullable)
      {
        columnId: 'gender',
        title: 'Genero',
        options: [
          ...Object.values(gender_enum).map((value) => ({
            value,
            label: genderLabels[value] ?? value,
            icon: genderIcons[value],
          })),
          ...(facets?.gender?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.gender,
      },

      // nationality (enum nullable)
      {
        columnId: 'nationality',
        title: 'Nacionalidad',
        options: [
          ...Object.values(nationality_enum).map((value) => ({
            value,
            label: nationalityLabels[value] ?? value,
            icon: nationalityIcons[value],
          })),
          ...(facets?.nationality?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.nationality,
      },

      // document_type (enum nullable)
      {
        columnId: 'document_type',
        title: 'Tipo de Documento',
        options: [
          ...Object.values(document_type_enum).map((value) => ({
            value,
            label: documentTypeLabels[value] ?? value,
            icon: documentTypeIcons[value],
          })),
          ...(facets?.document_type?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.document_type,
      },

      // marital_status (enum nullable)
      {
        columnId: 'marital_status',
        title: 'Estado Civil',
        options: [
          ...Object.values(marital_status_enum).map((value) => ({
            value,
            label: maritalStatusLabels[value] ?? value,
            icon: maritalStatusIcons[value],
          })),
          ...(facets?.marital_status?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.marital_status,
      },

      // level_of_education (enum nullable)
      {
        columnId: 'level_of_education',
        title: 'Nivel de Educacion',
        options: [
          ...Object.values(level_of_education_enum).map((value) => ({
            value,
            label: levelOfEducationLabels[value] ?? value,
            icon: levelOfEducationIcons[value],
          })),
          ...(facets?.level_of_education?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.level_of_education,
      },

      // cost_type (enum nullable)
      {
        columnId: 'cost_type',
        title: 'Tipo de costo',
        options: [
          ...Object.values(cost_type_enum).map((value) => ({
            value,
            label: costTypeLabels[value] ?? value,
            icon: costTypeIcons[value],
          })),
          ...(facets?.cost_type?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.cost_type,
      },

      // affiliate_status (enum nullable)
      {
        columnId: 'affiliate_status',
        title: 'Estado de afiliacion',
        options: [
          ...Object.values(affiliate_status_enum).map((value) => ({
            value,
            label: affiliateStatusLabels[value] ?? value,
            icon: affiliateStatusIcons[value],
          })),
          ...(facets?.affiliate_status?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.affiliate_status,
      },

      // reason_for_termination (enum nullable) — solo visible en inactivos pero siempre creado
      {
        columnId: 'reason_for_termination',
        title: 'Motivo de baja',
        options: [
          ...Object.values(reason_for_termination_enum).map((value) => ({
            value,
            label: reasonForTerminationLabels[value] ?? value,
            icon: reasonForTerminationIcons[value],
          })),
          ...(facets?.reason_for_termination?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.reason_for_termination,
      },

      // is_active (booleano)
      {
        columnId: 'is_active',
        title: 'Activo',
        options: [
          { value: 'true', label: 'Activo' },
          { value: 'false', label: 'Inactivo' },
        ],
        externalCounts: facets?.is_active,
      },

      // ── FK UUID ────────────────────────────────────────────────────────────

      // hierarchy (FK UUID nullable — sector jerárquico)
      {
        columnId: 'hierarchy',
        title: 'Sector',
        options: [
          ...(facets?.hierarchyOptions?.map((h) => ({ value: h.id, label: h.name ?? '' })) ?? []),
          ...(facets?.hierarchy?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.hierarchy,
      },

      // company_positions (FK UUID nullable)
      {
        columnId: 'company_positions',
        title: 'Puesto',
        options: [
          ...(facets?.companyPositionOptions?.map((p) => ({ value: p.id, label: p.name ?? '' })) ?? []),
          ...(facets?.company_positions?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.company_positions,
      },

      // types_of_contract (FK UUID nullable)
      {
        columnId: 'types_of_contract',
        title: 'Tipo de Contrato',
        options: [
          ...(facets?.typeOfContractOptions?.map((t) => ({ value: t.id, label: t.name ?? '' })) ?? []),
          ...(facets?.types_of_contract?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.types_of_contract,
      },

      // work_diagram (FK UUID nullable)
      {
        columnId: 'work_diagram',
        title: 'Diagrama',
        options: [
          ...(facets?.workDiagramOptions?.map((d) => ({ value: d.id, label: d.name ?? '' })) ?? []),
          ...(facets?.work_diagram?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.work_diagram,
      },

      // workshop_sectors (FK UUID nullable)
      {
        columnId: 'workshop_sectors',
        title: 'Sector de taller',
        options: [
          ...(facets?.workshopSectorOptions?.map((s) => ({ value: s.id, label: s.name ?? '' })) ?? []),
          ...(facets?.workshop_sectors?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.workshop_sectors,
      },

      // category (FK UUID nullable)
      {
        columnId: 'category',
        title: 'Categoria',
        options: [
          ...(facets?.categoryOptions?.map((c) => ({ value: c.id, label: c.name ?? '' })) ?? []),
          ...(facets?.category?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.category,
      },

      // covenant (FK UUID nullable)
      {
        columnId: 'covenant',
        title: 'Convenio',
        options: [
          ...(facets?.covenantOptions?.map((c) => ({ value: c.id, label: c.name ?? '' })) ?? []),
          ...(facets?.covenant?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.covenant,
      },

      // guild (FK UUID nullable)
      {
        columnId: 'guild',
        title: 'Sindicato',
        options: [
          ...(facets?.guildOptions?.map((g) => ({ value: g.id, label: g.name ?? '' })) ?? []),
          ...(facets?.guild?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.guild,
      },

      // cost_center (FK UUID nullable)
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

      // countries (FK UUID nullable — lugar de nacimiento)
      {
        columnId: 'countries',
        title: 'Pais de nacimiento',
        options: [
          ...(facets?.countryOptions?.map((c) => ({ value: c.id, label: c.name ?? '' })) ?? []),
          ...(facets?.countries?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.countries,
      },

      // ── FK BigInt ──────────────────────────────────────────────────────────

      // province (FK BigInt nullable)
      {
        columnId: 'province',
        title: 'Provincia',
        options: [
          ...(facets?.provinceOptions?.map((p) => ({ value: String(p.id), label: p.name ?? '' })) ?? []),
          ...(facets?.province?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.province,
      },

      // city (FK BigInt nullable)
      {
        columnId: 'city',
        title: 'Ciudad',
        options: [
          ...(facets?.cityOptions?.map((c) => ({ value: String(c.id), label: c.name ?? '' })) ?? []),
          ...(facets?.city?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.city,
      },

      // ── M:M ───────────────────────────────────────────────────────────────

      // contractor_employee (M:M → customers — incluye "Sin afectar")
      {
        columnId: 'contractor_employee',
        title: 'Afectaciones',
        options: [
          ...(facets?.contractorOptions?.map((c) => ({ value: c.id, label: c.name ?? '' })) ?? []),
          ...(facets?.contractor_employee?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin afectar', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.contractor_employee,
      },

      // empleado_aptitudes (M:M → aptitudes_tecnicas — incluye "Sin afectar")
      {
        columnId: 'empleado_aptitudes',
        title: 'Aptitudes tecnicas',
        options: [
          ...(facets?.aptitudOptions?.map((a) => ({ value: a.id, label: a.name ?? '' })) ?? []),
          ...(facets?.empleado_aptitudes?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin afectar', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.empleado_aptitudes,
      },

      // ── Filtros de texto libre ─────────────────────────────────────────────
      { columnId: 'fullName', title: 'Nombre', type: 'text' as const, placeholder: 'Buscar por nombre...' },
      { columnId: 'email', title: 'Email', type: 'text' as const, placeholder: 'Buscar por email...' },
      { columnId: 'cuil', title: 'CUIL', type: 'text' as const, placeholder: 'Buscar por CUIL...' },
      {
        columnId: 'document_number',
        title: 'Documento',
        type: 'text' as const,
        placeholder: 'Buscar por documento...',
      },
      { columnId: 'phone', title: 'Telefono', type: 'text' as const, placeholder: 'Buscar por telefono...' },
      { columnId: 'street', title: 'Calle', type: 'text' as const, placeholder: 'Buscar por calle...' },
      { columnId: 'street_number', title: 'Altura', type: 'text' as const, placeholder: 'Buscar por altura...' },
      { columnId: 'postal_code', title: 'CP', type: 'text' as const, placeholder: 'Buscar por CP...' },
      { columnId: 'file', title: 'Legajo', type: 'text' as const, placeholder: 'Buscar por legajo...' },
      { columnId: 'normal_hours', title: 'Horas', type: 'text' as const, placeholder: 'Buscar por horas...' },

      // ── Filtros de rango de fechas ─────────────────────────────────────────
      { columnId: 'born_date', title: 'Nacimiento', type: 'dateRange' as const },
      { columnId: 'date_of_admission', title: 'Fecha de ingreso', type: 'dateRange' as const },
      { columnId: 'created_at', title: 'Fecha de creacion', type: 'dateRange' as const },
      { columnId: 'termination_date', title: 'Fecha de baja', type: 'dateRange' as const },
    ],
    [facets]
  );

  // ─── Botón de creación protegido por permisos (solo en tab activos) ─────────
  const toolbarActions = isActive ? (
    <PermissionGuard module="empleados" tab="employees" action="create">
      <Button asChild variant="gh_orange" size="sm">
        <Link href="/dashboard/employee/action?action=new">
          <Plus className="mr-2 size-4" />
          Agregar empleado
        </Link>
      </Button>
    </PermissionGuard>
  ) : undefined;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <DataTable
      columns={columns}
      data={data}
      totalRows={totalRows}
      searchParams={searchParams}
      tableId={tableId}
      paramNamespace={tableId}
      facetedFilters={facetedFilters}
      initialColumnVisibility={mergedColumnVisibility}
      initialFilterVisibility={mergedFilterVisibility}
      toolbarActions={toolbarActions}
      showFilterToggle
      isFetchingFacets={isFetchingFacets}
      // Client-side navigation: fetch instantáneo via React Query, sin router.push
      queryFn={tableQueryFn}
      queryKey={['employees-paginated', isActive]}
      onStateChange={handleStateChange}
      enableRowSelection
      showRowSelection
      emptyMessage="No se encontraron empleados"
      exportConfig={{
        fetchAllData: () => getAllEmployeesForExport(currentParams, isActive),
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
      }}
    />
  );
}
