'use server';

import { fetchCurrentCompany } from '@/app/server/GET/actions';
import { queryWithPagination, type Filter } from '@/app/server/GET/probando';
import { supabaseServer } from '@/lib/supabase/server';
import type { ColumnFiltersState, SortingState } from '@tanstack/react-table';
// import { supabaseBrowser } from '@/lib/supabase/browser';

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
  const data = await queryWithPagination('share_company_users', 'id,created_at,company_id,profile(*)', {
    pageIndex: 0,
    pageSize: 10000, // 🔑 Tamaño grande para exportación
    sorting: options.sorting,
    columnFilters: options.columnFilters,
    server: options.server,
    permanent_filter: (query) =>
      query.order('fullname', { nullsFirst: false, referencedTable: 'profile', ascending: true }),
  });

  return { rows: data.rows }; // Mantener estructura para compatibilidad
}

export async function fetchCompanyUsers(options: FetchDataOptions) {
  const data = await queryWithPagination('share_company_users', 'id,created_at,company_id,profile(*)', {
    pageIndex: options.pageIndex,
    pageSize: options.pageSize,
    sorting: options.sorting.length > 0 ? options.sorting : [{ id: 'profile.fullname', desc: true }],
    columnFilters: options.columnFilters,
    server: true,
  });

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
  const supabase = supabaseServer();
  const { data, error } = await supabase.from('roles').select('*').eq('intern', false).neq('name', 'Invitado');

  if (error) {
    console.error('Error fetching roles:', error);
    return [];
  }
  return data;
}

export async function fetchOwner() {
  const supabase = supabaseServer();
  const currentCompany = await fetchCurrentCompany();

  if (!currentCompany || currentCompany.length === 0) return null;

  const { data, error } = await supabase
    .from('profile')
    .select('*')
    .eq('id', currentCompany[0]?.owner_id || '')
    .single();

  if (error) {
    console.error('Error fetching owner:', error);
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
