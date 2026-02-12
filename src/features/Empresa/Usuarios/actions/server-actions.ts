'use server';

import { fetchCurrentCompany } from '@/app/server/GET/actions';
import { queryWithPagination, type Filter } from '@/app/server/GET/probando';
import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import type { ColumnFiltersState, SortingState } from '@tanstack/react-table';

const logger = new Logger('UserActions');

/**
 * 🔑 Helper: Obtiene los profile_ids de usuarios que tienen los roles especificados
 */
async function getProfileIdsByRoles(roleNames: string[]): Promise<string[] | undefined> {
  if (roleNames.length === 0) return undefined;

  const supabase = await supabaseServer();

  // Obtener los IDs de roles por nombre
  const { data: roles, error: rolesError } = await supabase.from('roles').select('id').in('name', roleNames);

  if (rolesError || !roles || roles.length === 0) {
    return undefined;
  }

  const roleIds = roles.map((r) => r.id);

  // Obtener los user_id (que son iguales a profile.id) que tienen esos roles
  const { data: userRoles, error: userRolesError } = await supabase
    .from('user_roles')
    .select('user_id')
    .in('role_id', roleIds);

  if (userRolesError || !userRoles || userRoles.length === 0) {
    return [];
  }

  return userRoles.map((ur) => ur.user_id);
}

interface FetchDataOptions {
  pageIndex: number;
  pageSize: number;
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  filters?: Filter<'share_company_users'>[];
}

// ✅ PATRÓN CORRECTO: Exportación completa para documentos mensuales
export async function fetchAllCompanyUsersData(options: {
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  server?: boolean;
}) {
  // 🔑 Extraer el filtro de roles si existe
  const roleFilter = options.columnFilters?.find((f) => f.id === 'user_roles.roles.name');
  const otherFilters = options.columnFilters?.filter((f) => f.id !== 'user_roles.roles.name') || [];

  // 🔑 Si hay filtro de roles, obtener los profile_ids que tienen esos roles
  let profileIdsWithRoles: string[] | undefined = undefined;
  if (roleFilter?.value && Array.isArray(roleFilter.value) && roleFilter.value.length > 0) {
    const roleNames = roleFilter.value.filter((v) => v !== 'null' && v !== null && v !== '');
    if (roleNames.length > 0) {
      profileIdsWithRoles = await getProfileIdsByRoles(roleNames);
    }
  }

  const data = await queryWithPagination(
    'share_company_users',
    'id,created_at,company_id,profile(*,employees:employee_id(id,firstname,lastname,cuil))',
    {
      pageIndex: 0,
      pageSize: 10000,
      sorting: options.sorting,
      columnFilters: otherFilters,
      server: options.server,
      permanent_filter: (query) => {
        let filteredQuery = query.order('fullname', {
          nullsFirst: false,
          referencedTable: 'profile',
          ascending: true,
        });

        if (profileIdsWithRoles && profileIdsWithRoles.length > 0) {
          filteredQuery = filteredQuery.in('profile_id', profileIdsWithRoles);
        } else if (profileIdsWithRoles !== undefined && profileIdsWithRoles.length === 0) {
          filteredQuery = filteredQuery.eq('id', '00000000-0000-0000-0000-000000000000');
        }

        return filteredQuery;
      },
    }
  );

  return { rows: data.rows };
}

export async function fetchCompanyUsers(options: FetchDataOptions) {
  // 🔑 Extraer el filtro de roles si existe
  const roleFilter = options.columnFilters?.find((f) => f.id === 'user_roles.roles.name');
  const otherFilters = options.columnFilters?.filter((f) => f.id !== 'user_roles.roles.name') || [];

  // 🔑 Si hay filtro de roles, obtener los profile_ids que tienen esos roles
  let profileIdsWithRoles: string[] | undefined = undefined;
  if (roleFilter?.value && Array.isArray(roleFilter.value) && roleFilter.value.length > 0) {
    const roleNames = roleFilter.value.filter((v) => v !== 'null' && v !== null && v !== '');
    if (roleNames.length > 0) {
      profileIdsWithRoles = await getProfileIdsByRoles(roleNames);
    }
  }

  const data = await queryWithPagination(
    'share_company_users',
    'id,created_at,company_id,profile(*,employees:employee_id(id,firstname,lastname,cuil))',
    {
      pageIndex: options.pageIndex,
      pageSize: options.pageSize,
      sorting: options.sorting.length > 0 ? options.sorting : [{ id: 'profile.fullname', desc: true }],
      columnFilters: otherFilters,
      server: true,
      permanent_filter: (query) => {
        if (profileIdsWithRoles && profileIdsWithRoles.length > 0) {
          query = query.in('profile_id', profileIdsWithRoles);
        } else if (profileIdsWithRoles !== undefined && profileIdsWithRoles.length === 0) {
          query = query.eq('id', '00000000-0000-0000-0000-000000000000');
        }
        return query;
      },
    }
  );

  return data;
}
export type fetchCompanyUsersType = Awaited<ReturnType<typeof fetchCompanyUsers>>;
export async function fetchAllCompanyUsers(options: {
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  filters?: Filter<'share_company_users'>[];
}) {
  const data = await queryWithPagination(
    'share_company_users',
    '*, profile_id(*), customer_id(*), roles:role(*, role_permissions(count)), company:company_id(owner:owner_id(*))',
    {
      pageIndex: 0,
      pageSize: 10000,
      company_id_column: 'company_id',
      sorting: options.sorting,
      columnFilters: options.columnFilters,
      filters: options.filters,
    }
  );

  return data.rows;
}

export async function fetchRoles() {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.from('roles').select('*').eq('intern', false).neq('name', 'Invitado');

  if (error) {
    logger.error('Error fetching roles', { data: { error } });
    return [];
  }
  return data;
}

export async function fetchOwner() {
  const supabase = await supabaseServer();
  const currentCompany = await fetchCurrentCompany();

  if (!currentCompany || currentCompany.length === 0) return null;

  const { data, error } = await supabase
    .from('profile')
    .select('*')
    .eq('id', currentCompany[0]?.owner_id || '')
    .single();

  if (error) {
    logger.error('Error fetching owner', { data: { error } });
    return null;
  }

  // Format owner to match share_company_users structure
  return {
    id: 'owner',
    role: 'Propietario',
    company_id: currentCompany[0].id,
    profile_id: data,
    created_at: data.created_at || new Date().toISOString(),
    customer_id: null,
    modules: [],
    roles: null, // Owner doesn't have a role from the roles table in this context
    company: {
      owner: data,
    },
  };
}

export async function searchEmployeesForLink(query: string) {
  const supabase = await supabaseServer();
  const cookieStore = (await import('next/headers')).cookies;
  const company_id = (await cookieStore()).get('actualComp')?.value;

  if (!company_id || !query || query.length < 2) return [];

  // Get profile IDs that already have an employee linked
  const { data: linkedProfiles } = await supabase.from('profile').select('employee_id').not('employee_id', 'is', null);

  const linkedEmployeeIds = linkedProfiles?.map((p) => p.employee_id).filter(Boolean) || [];

  let employeeQuery = supabase
    .from('employees')
    .select('id, firstname, lastname, cuil')
    .eq('company_id', company_id)
    .eq('is_active', true)
    .or(`firstname.ilike.%${query}%,lastname.ilike.%${query}%,cuil.ilike.%${query}%`)
    .order('lastname', { ascending: true })
    .limit(20);

  // Exclude already linked employees
  if (linkedEmployeeIds.length > 0) {
    employeeQuery = employeeQuery.not('id', 'in', `(${linkedEmployeeIds.join(',')})`);
  }

  const { data, error } = await employeeQuery;

  if (error) {
    logger.error('Error searching employees for link', { data: { error } });
    return [];
  }

  return data || [];
}

export async function linkEmployeeToProfile(profileId: string, employeeId: string | null) {
  const supabase = await supabaseServer();

  const { error } = await supabase.from('profile').update({ employee_id: employeeId }).eq('id', profileId);

  if (error) {
    logger.error('Error linking employee to profile', { data: { error } });
    throw error;
  }
}

export async function getLinkedEmployeeForProfile(profileId: string) {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('profile')
    .select('employee_id, employees:employee_id(id, firstname, lastname, cuil)')
    .eq('id', profileId)
    .single();

  if (error) {
    logger.error('Error getting linked employee', { data: { error } });
    return null;
  }

  return data;
}
