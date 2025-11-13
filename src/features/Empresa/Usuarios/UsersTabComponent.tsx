//'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RoleManager } from '@/features/UserPermissionsManager/components';
import { Shield, Users } from 'lucide-react';
import UsersTable from './components/UsersTable';

export default function UsersTabComponent() {
  return (
    <div>
      <Tabs defaultValue="users" className="w-full">
        <TabsList className=" bg-gh_contrast/50">
          <TabsTrigger value="users" className="text-gh_orange font-semibold">
            <Users className="h-4 w-4 mr-2" />
            Empleados
          </TabsTrigger>
          <TabsTrigger value="role-management">
            <Shield className="h-4 w-4 mr-2" />
            Gestión de Roles
          </TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <UsersTable />
        </TabsContent>
        <TabsContent value="role-management">
          <RoleManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
