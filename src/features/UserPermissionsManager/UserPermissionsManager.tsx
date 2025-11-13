'use client';

import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUserPermissions } from '@/features/Permissions/hooks/useUserPermissions';
import { Shield, User } from 'lucide-react';
import { useState } from 'react';
import { ModulePermissions, RoleSelector } from './components';

interface UserPermissionsManagerProps {
  userId: string;
  userName?: string;
  userEmail?: string;
}

export function UserPermissionsManager({ userId, userName, userEmail }: UserPermissionsManagerProps) {
  const { permissions, roles, isLoading } = useUserPermissions(userId);
  const [activeTab, setActiveTab] = useState('user-permissions');

  if (isLoading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-4 w-96 mb-6" />
        <Skeleton className="h-32 w-full mb-4" />
        <Skeleton className="h-64 w-full" />
      </Card>
    );
  }

  return (
    <Card className=" mx-auto p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="">
          <TabsTrigger value="user-permissions">
            <User className="h-4 w-4 mr-2" />
            Permisos de Usuario
          </TabsTrigger>
          {/* <TabsTrigger value="role-management">
            <Shield className="h-4 w-4 mr-2" />
            Gestión de Roles
          </TabsTrigger> */}
        </TabsList>

        <TabsContent value="user-permissions" className="space-y-6">
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

          <RoleSelector userId={userId} />

          <ModulePermissions userId={userId} permissions={permissions} />
        </TabsContent>

        {/* <TabsContent value="role-management">
          <RoleManager />
        </TabsContent> */}
      </Tabs>
    </Card>
  );
}
