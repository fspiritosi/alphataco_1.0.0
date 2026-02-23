import { getTablePreferences } from '@/shared/actions/table-preferences';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { getEmployeesPaginated } from './actions.server';
import _EmployeeDataTable from './components/_EmployeeDataTable';

// ============================================================================
// TYPES
// ============================================================================

interface EmployeeListProps {
  searchParams: Record<string, string | string[] | undefined>;
  isActive: boolean;
  permissions: Record<string, boolean>;
}

// ============================================================================
// SERVER COMPONENT
// ============================================================================

export default async function EmployeeList({ searchParams, isActive, permissions }: EmployeeListProps) {
  const tableId = isActive ? 'employees-active' : 'employees-inactive';

  const [{ data, total }, preferences] = await Promise.all([
    getEmployeesPaginated(searchParams as DataTableSearchParams, isActive),
    getTablePreferences(tableId),
  ]);

  return (
    <_EmployeeDataTable
      data={data}
      totalRows={total}
      searchParams={searchParams as DataTableSearchParams}
      isActive={isActive}
      tableId={tableId}
      permissionsMap={permissions}
      initialColumnVisibility={preferences.columnVisibility}
      initialFilterVisibility={preferences.filterVisibility}
    />
  );
}
