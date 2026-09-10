import { AccesosExternosTabContent } from '@/features/Empresa/AccesosExternos/AccesosExternosTabContent';
import { ExternalApiClientsTableSkeleton } from '@/features/Empresa/AccesosExternos/list/fallback/ExternalApiClientsTableSkeleton';
import { TabsManagerServer } from '@/features/TabsManager';
import { RoleManagerContent } from '@/features/UserPermissionsManager/components';
import { RoleManagerSkeleton } from '@/features/UserPermissionsManager/fallback/RoleManagerSkeleton';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable';
import { KeyRound, Shield, Users } from 'lucide-react';
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
          content: (
            <Suspense fallback={<RoleManagerSkeleton />}>
              <RoleManagerContent />
            </Suspense>
          ),
        },
        {
          value: 'accesos-externos',
          label: (
            <span className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              Accesos Externos
            </span>
          ),
          moduleSlug: 'empresa',
          tabSlug: 'accesos-externos',
          content: (
            <Suspense fallback={<ExternalApiClientsTableSkeleton />}>
              <AccesosExternosTabContent
                searchParams={searchParams as DataTableSearchParams}
                permissionsMap={permissions}
              />
            </Suspense>
          ),
        },
      ]}
    />
  );
}
