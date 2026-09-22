import { Card, CardContent } from '@/components/ui/card';
import type { ExternalWorkshop, WorkshopSector } from '@/features/Mantenimiento/OrderManagement/actions/queries.server';
import { getTablePreferences } from '@/shared/actions/table-preferences';
import { stripPrefixFromSearchParams } from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { getMaintenanceOrdersPaginated } from './actions.server';
import { _MaintenanceOrderDataTable } from './components/_MaintenanceOrderDataTable';

// ============================================================================
// CONSTANTS
// ============================================================================

export const TABLE_ID = 'maintenance-orders';

// ============================================================================
// TYPES
// ============================================================================

interface MaintenanceOrderListProps {
  searchParams: Record<string, string | string[] | undefined>;
  sectors: WorkshopSector[];
  repairTypes: Array<{ id: string; name: string }>;
  externalWorkshops: ExternalWorkshop[];
}

// ============================================================================
// SERVER COMPONENT
// ============================================================================

export async function MaintenanceOrderList({
  searchParams,
  sectors,
  repairTypes,
  externalWorkshops,
}: MaintenanceOrderListProps) {
  const tableParams = stripPrefixFromSearchParams(searchParams as DataTableSearchParams, TABLE_ID);

  const [{ data, total }, preferences] = await Promise.all([
    getMaintenanceOrdersPaginated(tableParams),
    getTablePreferences(TABLE_ID),
  ]);

  return (
    <Card>
      <CardContent className="pt-6">
        <_MaintenanceOrderDataTable
          data={data}
          totalRows={total}
          searchParams={tableParams}
          tableId={TABLE_ID}
          initialColumnVisibility={preferences.columnVisibility ?? {}}
          initialFilterVisibility={preferences.filterVisibility ?? {}}
          sectors={sectors}
          repairTypes={repairTypes}
          externalWorkshops={externalWorkshops}
        />
      </CardContent>
    </Card>
  );
}
