import { Card, CardContent } from '@/components/ui/card';
import { getTablePreferences } from '@/shared/actions/table-preferences';
import { stripPrefixFromSearchParams } from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { getEmployeesFacets, getEmployeesPaginated } from './actions.server';
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

  // Extraer solo los params de esta tabla (quitar prefijo del namespace)
  const tableParams = stripPrefixFromSearchParams(searchParams as DataTableSearchParams, tableId);

  const [{ data, total }, preferences, initialFacets] = await Promise.all([
    getEmployeesPaginated(tableParams, isActive),
    getTablePreferences(tableId),
    getEmployeesFacets(isActive, tableParams),
  ]);

  return (
    <Card>
      <CardContent className="pt-6">
        <_EmployeeDataTable
          data={data}
          totalRows={total}
          searchParams={tableParams}
          isActive={isActive}
          tableId={tableId}
          permissionsMap={permissions}
          initialFacets={initialFacets}
          initialColumnVisibility={preferences.columnVisibility ?? {}}
          initialFilterVisibility={preferences.filterVisibility ?? {}}
        />
      </CardContent>
    </Card>
  );
}
