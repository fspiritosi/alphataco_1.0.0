import { getTablePreferences } from '@/shared/actions/table-preferences';
import { stripPrefixFromSearchParams } from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { Card, CardContent } from '@/components/ui/card';
import { getWorkshopTrackingPaginated } from './actions.server';
import { _WorkshopTrackingDataTable } from './_WorkshopTrackingDataTable';

const TABLE_ID = 'workshop-tracking';

interface WorkshopTrackingListProps {
  searchParams: Record<string, string | string[] | undefined>;
}

export async function WorkshopTrackingList({ searchParams }: WorkshopTrackingListProps) {
  const tableParams = stripPrefixFromSearchParams(searchParams as DataTableSearchParams, TABLE_ID);

  const [{ data, total }, preferences] = await Promise.all([
    getWorkshopTrackingPaginated(tableParams),
    getTablePreferences(TABLE_ID),
  ]);

  return (
    <Card>
      <CardContent className="pt-6">
        <_WorkshopTrackingDataTable
          data={data}
          totalRows={total}
          searchParams={tableParams}
          initialColumnVisibility={preferences.columnVisibility ?? {}}
          initialFilterVisibility={preferences.filterVisibility ?? {}}
        />
      </CardContent>
    </Card>
  );
}
