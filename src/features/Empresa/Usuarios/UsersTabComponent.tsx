import { TabsManagerServer } from '@/features/TabsManager';
import { RoleManager } from '@/features/UserPermissionsManager/components';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable';
import { Shield, Users } from 'lucide-react';
import { Suspense } from 'react';
import { UsersTableSkeleton } from './fallback/UsersTableSkeleton';
import { UsersTableList } from './table/UsersTableList';

export default function UsersTabComponent({
  searchParams,
  permissions,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
  permissions: Record<string, boolean>;
}) {
  return (
    <TabsManagerServer
      paramName="usertab"
      searchParams={searchParams}
      defaultTab="usuarios-empleados"
      permissions={permissions}
      tabs={[
        {
          value: 'usuarios-empleados',
          label: (
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Usuarios
            </span>
          ),
          moduleSlug: 'empresa',
          tabSlug: 'usuarios-empleados',
          content: (
            <Suspense fallback={<UsersTableSkeleton />}>
              <UsersTableList searchParams={searchParams as DataTableSearchParams} permissionsMap={permissions} />
            </Suspense>
          ),
        },
        {
          value: 'gestion-roles',
          label: (
            <span className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Gestión de Roles
            </span>
          ),
          moduleSlug: 'empresa',
          tabSlug: 'gestion-roles',
          content: <RoleManager />,
        },
      ]}
    />
  );
}
