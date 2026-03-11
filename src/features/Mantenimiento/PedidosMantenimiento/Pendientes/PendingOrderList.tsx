import { Card, CardContent } from '@/components/ui/card';
import { type DataTableSearchParams, stripPrefixFromSearchParams } from '@/shared/components/common/DataTable';
import { getTablePreferences } from '@/shared/actions/table-preferences';
import { getPendingOrdersPaginated } from './actions.server';
import { _PendingOrderDataTable } from './components/_PendingOrderDataTable';

export const TABLE_ID = 'pedidos-pendientes';

interface Props {
  searchParams: DataTableSearchParams;
}

export async function PendingOrderList({ searchParams }: Props) {
  // Aislar los URL params de esta tabla con su namespace
  const tableSearchParams = stripPrefixFromSearchParams(searchParams, TABLE_ID);

  const [{ data, total }, tablePreferences] = await Promise.all([
    getPendingOrdersPaginated(tableSearchParams),
    getTablePreferences(TABLE_ID),
  ]);

  return (
    <Card>
      <CardContent className="pt-6">
        <_PendingOrderDataTable
          data={data}
          totalRows={total}
          searchParams={tableSearchParams}
          tableId={TABLE_ID}
          initialColumnVisibility={tablePreferences.columnVisibility ?? {}}
          initialFilterVisibility={tablePreferences.filterVisibility ?? {}}
        />
      </CardContent>
    </Card>
  );
}
