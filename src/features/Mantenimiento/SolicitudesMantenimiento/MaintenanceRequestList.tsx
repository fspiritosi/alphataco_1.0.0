import { Card, CardContent } from '@/components/ui/card';
import { getTablePreferences } from '@/shared/actions/table-preferences';
import { stripPrefixFromSearchParams, type DataTableSearchParams } from '@/shared/components/common/DataTable';
import { getAllMaintenanceRequestsForExport, getMaintenanceRequestFacets, getMaintenanceRequestsPaginated } from './actions/actionsTableServer';
import { MaintenanceRequestDataTable } from './_MaintenanceRequestDataTable';

export const TABLE_ID = 'maintenance-requests';

interface MaintenanceRequestListProps {
  searchParams: DataTableSearchParams;
  canApproveReject?: boolean;
}

export async function MaintenanceRequestList({
  searchParams,
  canApproveReject = false,
}: MaintenanceRequestListProps) {
  // Aislar parámetros de URL para esta tabla específica
  const tableSearchParams = stripPrefixFromSearchParams(searchParams, TABLE_ID);

  const [{ data, total }, preferences, facets] = await Promise.all([
    getMaintenanceRequestsPaginated(tableSearchParams),
    getTablePreferences(TABLE_ID),
    getMaintenanceRequestFacets(tableSearchParams),
  ]);

  return (
    <Card>
      <CardContent className="pt-6">
        <MaintenanceRequestDataTable
          data={data}
          totalRows={total}
          searchParams={tableSearchParams}
          tableId={TABLE_ID}
          initialFacets={facets}
          initialColumnVisibility={preferences.columnVisibility ?? {}}
          initialFilterVisibility={preferences.filterVisibility ?? {}}
          canApproveReject={canApproveReject}
          fetchAllForExport={getAllMaintenanceRequestsForExport}
        />
      </CardContent>
    </Card>
  );
}
