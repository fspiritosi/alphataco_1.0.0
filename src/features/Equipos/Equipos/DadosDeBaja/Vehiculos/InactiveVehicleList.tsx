import { Card, CardContent } from '@/components/ui/card';
import { getTablePreferences } from '@/shared/actions/table-preferences';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { getInactiveVehiclesPaginated } from './actions/actions.server';
import { _InactiveVehicleDataTable } from './components/_InactiveVehicleDataTable';

// ============================================================================
// TYPES
// ============================================================================

interface InactiveVehicleListProps {
  searchParams: Record<string, string | string[] | undefined>;
  permissions: Record<string, boolean>;
}

// ============================================================================
// SERVER COMPONENT
// ============================================================================

export async function InactiveVehicleList({ searchParams, permissions }: InactiveVehicleListProps) {
  const tableId = 'inactive-vehicles';

  const [{ data, total }, preferences] = await Promise.all([
    getInactiveVehiclesPaginated(searchParams as DataTableSearchParams),
    getTablePreferences(tableId),
  ]);

  return (
    <Card>
      <CardContent className="pt-6">
        <_InactiveVehicleDataTable
          data={data}
          totalRows={total}
          searchParams={searchParams as DataTableSearchParams}
          tableId={tableId}
          permissionsMap={permissions}
          initialColumnVisibility={preferences.columnVisibility ?? {}}
          initialFilterVisibility={preferences.filterVisibility ?? {}}
        />
      </CardContent>
    </Card>
  );
}
