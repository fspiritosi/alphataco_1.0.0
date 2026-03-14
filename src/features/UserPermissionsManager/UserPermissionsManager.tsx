'use client';

import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  getUserPermissionsServer,
  type AllRolePermissionsMap,
  type ModulesWithTabsData,
  type RoleWithCount,
  type UserPermissionsData,
  type UserRolesData,
} from '@/features/UserPermissionsManager/actions.server';
import { useQuery } from '@tanstack/react-query';
import { Shield, User } from 'lucide-react';
import { useState } from 'react';
import { ModulePermissions, RoleSelector } from './components';

interface UserPermissionsManagerProps {
  userId: string;
  userName?: string;
  userEmail?: string;
  canEdit?: boolean;
  initialUserPermissions: UserPermissionsData;
  initialUserRoles: UserRolesData;
  initialRoles: RoleWithCount[];
  initialRolePermissions: AllRolePermissionsMap;
  initialModules: ModulesWithTabsData;
}

export function UserPermissionsManager({
  userId,
  userName,
  userEmail,
  canEdit = true,
  initialUserPermissions,
  initialUserRoles,
  initialRoles,
  initialRolePermissions,
  initialModules,
}: UserPermissionsManagerProps) {
  const [activeTab, setActiveTab] = useState('user-permissions');

  // useQuery con initialData — no hay loading en el primer render
  const { data: permissions = initialUserPermissions } = useQuery({
    queryKey: ['user-permissions', userId],
    queryFn: () => getUserPermissionsServer(userId),
    initialData: initialUserPermissions,
    staleTime: 0,
  });

  return (
    <div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="user-permissions">
            <User className="h-4 w-4 mr-2" />
            Permisos de Usuario
          </TabsTrigger>
        </TabsList>

        <TabsContent value="user-permissions">
          <Card className="p-3 space-y-6">
            <Card className="p-6">
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <Shield className="h-6 w-6 text-primary" />
                  <h1 className="text-xl font-bold">Gestión de Permisos</h1>
                </div>
                <p className="text-muted-foreground">Configura los permisos de acceso para módulos, tabs y acciones</p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-semibold">Usuario Seleccionado</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{userName || 'Usuario'}</p>
                        <p className="text-sm text-muted-foreground">{userEmail || userId}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <RoleSelector
              userId={userId}
              disabled={!canEdit}
              initialRoles={initialRoles}
              initialUserRoles={initialUserRoles}
              initialRolePermissions={initialRolePermissions}
            />

            <ModulePermissions
              userId={userId}
              permissions={permissions}
              disabled={!canEdit}
              initialModules={initialModules}
              initialUserRoles={initialUserRoles}
            />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
