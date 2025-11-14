//'use client';
import { columns } from '@/app/dashboard/company/actualCompany/components/columns';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';

import { getAllUsers, getOwnerUser } from '@/app/server/GET/actions';
import { createFilterOptions } from '@/features/Employees/Empleados/components/utils/utils';
import { cookies } from 'next/headers';

async function UsersTable() {
  const ownerUser = await getOwnerUser();
  const company_users = await getAllUsers();
  const owner = ownerUser?.map((user: any) => {
    return {
      email: user.email,
      fullname: user.fullname as string,
      role: 'Propietario',
      alta: user.created_at ? new Date(user.created_at) : new Date(),
      id: user.id || '',
      img: user.avatar || '',
    };
  });

  const sharedUsers =
    company_users?.map((user: any) => {
      return {
        email: user.profile_id?.email,
        fullname: user.profile_id.fullname,
        role: user?.role,
        alta: user.created_at,
        id: user.id,
        img: user.profile_id.avatar || '',
        customerName: user.customer_id?.name,
      };
    }) || [];

  const data = owner?.concat(
    sharedUsers
      ?.filter((user: any) => user.role !== 'Invitado') // Filtrar usuarios donde el rol no sea "Invitado"
      ?.map((user: any) => ({
        ...user,
        id: user.id,
        fullname: user.fullname || '',
        customerName: user.customerName || '',
      })) || []
  );

  const guestsData =
    sharedUsers
      ?.filter((user: any) => user.role === 'Invitado')
      ?.map((user: any) => ({
        ...user,
        fullname: user.fullname || '',
        customerName: user.customerName || '',
      })) || []; // Filtrar usuarios donde el rol no sea "Invitado"

  const names = createFilterOptions(data, (user) => user.fullname);

  const correo = createFilterOptions(data, (user) => user.email);

  // const guestsNames = createFilterOptions(guestsData, (user) => user.fullname);

  // const guestsCorreo = createFilterOptions(guestsData, (user) => user.email);

  const cookiesStore = cookies();
  const savedVisibility = cookiesStore.get('users-employ-table')?.value;
  const savedFilter = cookiesStore.get('users-employ-table-filters')?.value;
  // const savedVisibilityGuests = cookiesStore.get('users-guests-table')?.value;
  // const savedFilterGuests = cookiesStore.get('users-guests-table-filters')?.value;

  return (
    <div className="py-2">
      <BaseDataTable
        data={data || []}
        columns={columns}
        tableId="users-employ-table"
        savedVisibility={savedVisibility ? JSON.parse(savedVisibility) : {}}
        toolbarOptions={{
          initialVisibleFilters: savedFilter ? JSON.parse(savedFilter) : [],
          filterableColumns: [
            {
              columnId: 'Nombre',
              title: 'Nombre',
              options: names,
            },
            {
              columnId: 'Correo',
              title: 'Correo',
              options: correo,
            },
          ],
        }}
      />
    </div>
  );
}

export default UsersTable;
