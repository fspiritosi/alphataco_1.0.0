import { TabsManagerServer } from '@/features/TabsManager';
import { RoleManager } from '@/features/UserPermissionsManager/components';
import { Shield, Users } from 'lucide-react';
import UsersTable from './components/UsersTable';

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
          content: <UsersTable />,
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
