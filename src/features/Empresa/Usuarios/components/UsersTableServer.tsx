'use client';

import { BaseDataTable } from '@/shared/components/data-table/base/data-table-server';
import type { VisibilityState } from '@tanstack/react-table';
import { fetchAllCompanyUsersData, fetchCompanyUsers, fetchCompanyUsersType } from '../actions/server-actions';
import { columnsUsers } from './columns';

interface UsersTableServerProps {
  initialData?: fetchCompanyUsersType;
  savedVisibility: VisibilityState;
  savedFilters: string[];
}

export default function UsersTableServer({ initialData, savedVisibility, savedFilters }: UsersTableServerProps) {
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
        filterableColumns: [
          // {
          //     columnId: 'profile_id.fullname',
          //     title: 'Nombre',
          //     // We can't easily get all options for server-side without a separate query.
          //     // For now, we can use a text search or omit options to fallback to text input?
          //     // BaseDataTable supports text search if no options provided?
          //     // The previous implementation generated options from ALL data (client-side).
          //     // For server-side, we usually use a text search or fetch options.
          //     // Let's try without options first (text search).
          // },
          // {
          //     columnId: 'profile.email',
          //     title: 'Correo',
          // },
        ],
        showExport: true,
        showFilterOptions: true,
      }}
    />
  );
}
