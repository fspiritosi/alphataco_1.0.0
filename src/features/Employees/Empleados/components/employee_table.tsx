import PageTableSkeleton from '@/components/Skeletons/PageTableSkeleton';
import { fetchAllEmployees } from '@/shared/actions/employees.actions';
import { VisibilityState } from '@tanstack/react-table';
import { cookies } from 'next/headers';
import { Suspense } from 'react';
import { EmployeesTableReusable } from './tables/data/employees-table';

async function EmployeeTable() {
  const employees = fetchAllEmployees();
  const cookiesStore = cookies();
  const savedVisibility = cookiesStore.get(`employees-table`)?.value;
  const savedFilters = cookiesStore.get(`employees-table-filters`)?.value;

  // console.log(savedVisibility, 'savedVisibility');

  return (
    <Suspense fallback={<PageTableSkeleton />}>
      <EmployeesTableReusable
        employeesPromise={employees}
        tableId="employees-table"
        savedVisibility={JSON.parse(savedVisibility || '{}') as VisibilityState}
        savedFilters={JSON.parse(savedFilters || '[]')}
      />
    </Suspense>
  );
}

export default EmployeeTable;
