'use client';

import { querySelectDistinct } from '@/app/server/GET/probando';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table-server';
import type { VisibilityState } from '@tanstack/react-table';
import Cookies from 'js-cookie';
import { fetchAllCompanyUsersData, fetchCompanyUsers, fetchCompanyUsersType } from '../actions/server-actions';
import { columnsUsers } from './columns';

interface UsersTableServerProps {
  initialData?: fetchCompanyUsersType;
  savedVisibility: VisibilityState;
  savedFilters: string[];
}

export default function UsersTableServer({ initialData, savedVisibility, savedFilters }: UsersTableServerProps) {
  const company_id = Cookies.get('actualComp');

  const handleFetchAllData = async (options: { sorting: any; columnFilters: any }) => {
    const result = await fetchAllCompanyUsersData({
      sorting: options.sorting,
      columnFilters: options.columnFilters,
      server: true,
    });
    return result.rows;
  };

  return (
    <BaseDataTable
      columns={columnsUsers}
      savedVisibility={savedVisibility}
      initialData={initialData}
      tableId="users-employ-table"
      serverSide={true}
      fetchData={fetchCompanyUsers}
      fetchAllData={handleFetchAllData}
      queryKey="users-employ-table"
      toolbarOptions={{
        initialVisibleFilters: savedFilters,
        searchableColumns: [
          {
            columnId: 'profile.fullname',
            placeholder: 'Buscar por nombre...',
          },
          // {
          //   columnId: 'user_roles.roles.name',
          //   placeholder: 'Buscar por rol...',
          // },
        ],
        filterableColumns: [
          {
            columnId: 'profile.email',
            title: 'Correo',
            config: {
              tableName: 'share_company_users',
              select: 'profile.email' as '*',
              relation: '{"profile": "profile_id"}',
              p_filters: { company_id: company_id! },
              mapper: (
                data: Awaited<ReturnType<typeof querySelectDistinct<'share_company_users', 'profile.email'>>>
              ) => {
                return data
                  .filter((value) => value.col_value !== null)
                  .map((value) => ({
                    label: String(value.display_value),
                    value: String(value.col_value),
                    count: value.col_count,
                  }));
              },
            },
          },
          {
            columnId: 'user_roles.roles.name',
            title: 'Rol',
            config: {
              tableName: 'share_company_users',
              select: 'id' as '*',
              multiJoinPaths: {
                joins: [
                  {
                    from_table: 'share_company_users',
                    to_table: 'profile',
                    from_column: 'profile_id',
                    to_column: 'id',
                  },
                  {
                    from_table: 'profile',
                    to_table: 'user_roles',
                    from_column: 'id',
                    to_column: 'user_id',
                  },
                  {
                    from_table: 'user_roles',
                    to_table: 'roles',
                    from_column: 'role_id',
                    to_column: 'id',
                  },
                ],
                final_column: 'roles.name',
              },
              p_filters: { company_id: company_id! },
              mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'share_company_users', 'id'>>>) => {
                return data
                  .filter((value) => value.col_value !== null && value.col_value !== 'null')
                  .map((value) => ({
                    label: String(value.display_value),
                    value: String(value.col_value),
                    count: value.col_count,
                  }));
              },
            },
          },
        ],
        showExport: true,
        showFilterOptions: true,
      }}
    />
  );
}
