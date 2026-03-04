'use client';

import { PermissionGuard } from '@/features/Permissions/components/PermissionGuard';
import type { DataTableFacetedFilterConfig, DataTableSearchParams } from '@/shared/components/common/DataTable';
import { DataTable } from '@/shared/components/common/DataTable';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import { useQuery } from '@tanstack/react-query';
import { CircleOff, Shield } from 'lucide-react';
import moment from 'moment';
import { useMemo } from 'react';
import type { CompanyUserListItem } from '../actions.server';
import { getAllCompanyUsersForExport, getAvailableRoles, getCompanyUserFacets } from '../actions.server';
import { CreateUserModal } from '../components/create-user-modal';
import { getCompanyUsersColumns } from './columns';

const TABLE_ID = 'company-users';

// ── Filtros visibles por defecto (máximo 3) ───────────────────────────────────
const DEFAULT_VISIBLE_FILTERS = ['role', 'created_at'];

interface UsersDataTableProps {
  data: CompanyUserListItem[];
  totalRows: number;
  searchParams: DataTableSearchParams;
  tableId: string;
  companyId: string;
  initialColumnVisibility: Record<string, boolean>;
  initialFilterVisibility: Record<string, boolean>;
  permissionsMap: Record<string, boolean>;
}

export function _UsersDataTable({
  data,
  totalRows,
  searchParams,
  tableId,
  companyId,
  initialColumnVisibility,
  initialFilterVisibility,
  permissionsMap,
}: UsersDataTableProps) {
  // ── Permisos (construidos desde el map del servidor) ──────────────────────
  const canDelete = permissionsMap['empresa:usuarios-empleados:delete'] === true;
  const canCreate = permissionsMap['empresa:usuarios-empleados:create'] === true;

  // ── Columnas (con permisos) ───────────────────────────────────────────────
  const columns = useMemo(() => getCompanyUsersColumns({ canDelete }), [canDelete]);

  // ── Params para facets (excluir paginación y sorting) ─────────────────────
  const facetParams = useMemo(() => {
    const { page, pageSize, sort, sortBy, sortOrder, ...rest } = searchParams as Record<string, unknown>;
    return rest as DataTableSearchParams;
  }, [searchParams]);

  // ── Facets del servidor (con cross-filter) ────────────────────────────────
  const { data: facets, isFetching: isFetchingFacets } = useQuery({
    queryKey: ['company-user-facets', companyId, facetParams],
    queryFn: () => getCompanyUserFacets(companyId, facetParams),
    staleTime: 5 * 60 * 1000,
  });

  // ── Roles disponibles para opciones de filtro ─────────────────────────────
  const { data: availableRoles } = useQuery({
    queryKey: ['available-roles'],
    queryFn: () => getAvailableRoles(),
    staleTime: 5 * 60 * 1000,
  });

  // ── Opciones de filtro de roles ───────────────────────────────────────────
  const roleOptions = useMemo(() => {
    if (!availableRoles) return [];

    const options = availableRoles.map((role) => ({
      value: String(role.id),
      label: role.name ?? 'Sin nombre',
      icon: Shield,
    }));

    // "Sin rol" si hay usuarios sin roles
    if (facets?.roles?.has(NULL_FILTER_VALUE)) {
      options.push({
        value: NULL_FILTER_VALUE,
        label: 'Sin rol',
        icon: CircleOff,
      });
    }

    return options;
  }, [availableRoles, facets]);

  // ── Configuración de filtros facetados ────────────────────────────────────
  const facetedFilters: DataTableFacetedFilterConfig[] = useMemo(
    () => [
      {
        columnId: 'role',
        title: 'Rol',
        options: roleOptions,
        externalCounts: facets?.roles,
      },
      {
        columnId: 'created_at',
        title: 'Fecha de alta',
        type: 'dateRange' as const,
      },
      {
        columnId: 'fullname',
        title: 'Nombre',
        type: 'text' as const,
      },
      {
        columnId: 'email',
        title: 'Correo',
        type: 'text' as const,
      },
    ],
    [roleOptions, facets]
  );

  // ── Botón de crear usuario (dentro del toolbar de la tabla) ───────────────
  const toolbarActions = canCreate ? (
    <PermissionGuard module="empresa" tab="usuarios-empleados" action="create">
      <CreateUserModal />
    </PermissionGuard>
  ) : undefined;

  // ── Visibilidad de filtros (preferencias BD tienen prioridad) ─────────────
  const mergedFilterVisibility = useMemo(() => {
    if (initialFilterVisibility && Object.keys(initialFilterVisibility).length > 0) {
      return initialFilterVisibility;
    }
    return Object.fromEntries(facetedFilters.map((f) => [f.columnId, DEFAULT_VISIBLE_FILTERS.includes(f.columnId)]));
  }, [initialFilterVisibility, facetedFilters]);

  // ── Export config ─────────────────────────────────────────────────────────
  const exportConfig = useMemo(
    () => ({
      options: {
        filename: 'usuarios-empresa',
        sheetName: 'Usuarios',
        title: 'Usuarios de la Empresa',
      },
      fetchAllData: () => getAllCompanyUsersForExport(companyId, searchParams),
      formatters: {
        fullname: (_val: unknown, row: CompanyUserListItem) => row.profile?.fullname ?? '',
        email: (_val: unknown, row: CompanyUserListItem) => row.profile?.email ?? '',
        role: (_val: unknown, row: CompanyUserListItem) => {
          const roles = row.profile?.user_roles ?? [];
          if (row.isOwner && roles.length === 0) return 'Propietario';
          if (roles.length === 0) return 'Sin rol';
          return roles
            .map((ur) => ur.roles?.name ?? '')
            .filter(Boolean)
            .join(', ');
        },
        linked_employee: (_val: unknown, row: CompanyUserListItem) => {
          const emp = row.profile?.employees;
          if (!emp) return 'Sin vincular';
          return `${emp.lastname ?? ''} ${emp.firstname ?? ''}`.trim();
        },
        created_at: (_val: unknown, row: CompanyUserListItem) =>
          row.created_at && row.created_at.getTime() !== 0 ? moment(row.created_at).format('DD/MM/YYYY') : '',
      } as Record<string, (value: unknown, row: CompanyUserListItem) => string>,
    }),
    [searchParams]
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      totalRows={totalRows}
      searchParams={searchParams}
      tableId={tableId}
      paramNamespace={TABLE_ID}
      facetedFilters={facetedFilters}
      isFetchingFacets={isFetchingFacets}
      exportConfig={exportConfig}
      initialColumnVisibility={initialColumnVisibility}
      initialFilterVisibility={mergedFilterVisibility}
      searchPlaceholder="Buscar por nombre o correo..."
      emptyMessage="No hay usuarios registrados"
      showFilterToggle={true}
      toolbarActions={toolbarActions}
    />
  );
}
