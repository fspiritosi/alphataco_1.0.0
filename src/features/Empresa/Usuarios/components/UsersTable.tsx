import { Card } from '@/components/ui/card';
import { cookies } from 'next/headers';
import { fetchCompanyUsers } from '../actions/server-actions';
import UsersTableServer from './UsersTableServer';

async function UsersTable() {
  const cookiesStore = cookies();
  const savedVisibility = cookiesStore.get('users-employ-table')?.value;
  const savedFilter = cookiesStore.get('users-employ-table-filters')?.value;

  const initialData = await fetchCompanyUsers({
    pageIndex: 0,
    pageSize: 10,
    sorting: [],
    columnFilters: [],
  });

  console.log(initialData.rows, 'initialData');
  return (
    <Card className="p-4">
      <UsersTableServer
        initialData={initialData}
        savedVisibility={savedVisibility ? JSON.parse(savedVisibility) : {}}
        savedFilters={savedFilter ? JSON.parse(savedFilter) : []}
      />
    </Card>
  );
}

export default UsersTable;
