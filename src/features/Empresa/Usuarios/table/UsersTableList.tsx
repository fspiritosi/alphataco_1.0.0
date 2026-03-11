import { Card, CardContent } from '@/components/ui/card';
import { getServerCompanyId } from '@/shared/actions/company.actions';
import { getTablePreferences } from '@/shared/actions/table-preferences';
import { stripPrefixFromSearchParams, type DataTableSearchParams } from '@/shared/components/common/DataTable';
import { getCompanyUsersPaginated } from '../actions.server';
import { _UsersDataTable } from './_UsersDataTable';

const TABLE_ID = 'company-users';

interface UsersTableListProps {
  searchParams: DataTableSearchParams;
  permissionsMap: Record<string, boolean>;
}

export async function UsersTableList({ searchParams, permissionsMap }: UsersTableListProps) {
  const tableSearchParams = stripPrefixFromSearchParams(searchParams, TABLE_ID);
  const companyId = await getServerCompanyId();

  const [{ data, total }, preferences] = await Promise.all([
    getCompanyUsersPaginated(companyId, tableSearchParams),
    getTablePreferences(TABLE_ID),
  ]);

  return (
    <Card>
      <CardContent className="pt-6">
        <_UsersDataTable
          data={data}
          totalRows={total}
          searchParams={tableSearchParams}
          tableId={TABLE_ID}
          companyId={companyId}
          initialColumnVisibility={preferences.columnVisibility ?? {}}
          initialFilterVisibility={preferences.filterVisibility ?? {}}
          permissionsMap={permissionsMap}
        />
      </CardContent>
    </Card>
  );
}
