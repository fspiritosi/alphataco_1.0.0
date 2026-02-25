import { Card, CardContent } from '@/components/ui/card';
import { getTablePreferences } from '@/shared/actions/table-preferences';
import { stripPrefixFromSearchParams } from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { getVehiclesPaginated } from './actions/actions.server';
import { _VehicleDataTable } from './components/_VehicleDataTable';

// ============================================================================
// TYPES
// ============================================================================

interface VehicleListProps {
  searchParams: Record<string, string | string[] | undefined>;
  permissions: Record<string, boolean>;
}

// ============================================================================
// SERVER COMPONENT
// ============================================================================

export async function VehicleList({ searchParams, permissions }: VehicleListProps) {
  const tableId = 'vehicles';

  // Extraer solo los params de esta tabla (quitar prefijo)
  const tableParams = stripPrefixFromSearchParams(searchParams as DataTableSearchParams, tableId);

  const [{ data, total }, preferences] = await Promise.all([
    getVehiclesPaginated(tableParams),
    getTablePreferences(tableId),
  ]);

  return (
    <Card>
      <CardContent className="pt-6">
        <_VehicleDataTable
          data={data}
          totalRows={total}
          searchParams={tableParams}
          tableId={tableId}
          permissionsMap={permissions}
          initialColumnVisibility={preferences.columnVisibility ?? {}}
          initialFilterVisibility={preferences.filterVisibility ?? {}}
        />
      </CardContent>
    </Card>
  );
}
