'use client';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  getAllRolesWithCounts,
  getAllRolePermissions,
  assignRoleToUserServer,
  removeRoleFromUserServer,
  getUserRolesServer,
  type RoleWithCount,
  type AllRolePermissionsMap,
  type UserRolesData,
} from '@/features/UserPermissionsManager/actions.server';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Shield } from 'lucide-react';
import { useMemo } from 'react';
import { toast } from 'sonner';

interface RoleSelectorProps {
  userId: string;
  disabled?: boolean;
  initialRoles: RoleWithCount[];
  initialUserRoles: UserRolesData;
  initialRolePermissions: AllRolePermissionsMap;
}

export function RoleSelector({
  userId,
  disabled = false,
  initialRoles,
  initialUserRoles,
  initialRolePermissions,
}: RoleSelectorProps) {
  const queryClient = useQueryClient();

  const { data: roles = initialRoles, isLoading: rolesLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: getAllRolesWithCounts,
    initialData: initialRoles,
  });

  const { data: userRoles = initialUserRoles, isLoading: userRolesLoading } = useQuery({
    queryKey: ['user-roles', userId],
    queryFn: () => getUserRolesServer(userId),
    initialData: initialUserRoles,
    enabled: !!userId,
  });

  const { data: rolePermissionsMap = initialRolePermissions } = useQuery({
    queryKey: ['all-role-permissions'],
    queryFn: getAllRolePermissions,
    initialData: initialRolePermissions,
    staleTime: 5 * 60 * 1000,
  });

  const selectedRoleIds = useMemo(() => {
    return userRoles.map((ur) => ur.role_id);
  }, [userRoles]);

  const assignMutation = useMutation({
    mutationFn: (roleId: number) => assignRoleToUserServer(userId, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles', userId] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions', userId] });
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      queryClient.invalidateQueries({ queryKey: ['role-user-counts'] });
      toast.success('El rol ha sido asignado correctamente');
    },
    onError: () => {
      toast.error('No se pudo asignar el rol');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (roleId: number) => removeRoleFromUserServer(userId, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles', userId] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions', userId] });
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      queryClient.invalidateQueries({ queryKey: ['role-user-counts'] });
      toast.success('El rol ha sido removido correctamente');
    },
    onError: () => {
      toast.error('No se pudo remover el rol');
    },
  });

  const handleRoleToggle = (roleId: number) => {
    if (selectedRoleIds.includes(roleId)) {
      removeMutation.mutate(roleId);
    } else {
      assignMutation.mutate(roleId);
    }
  };

  if (rolesLoading || userRolesLoading) {
    return (
      <Card className="p-6">
        <div className="text-sm text-muted-foreground">Cargando roles...</div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <Label className="text-base font-semibold">Roles / Presets</Label>
        </div>
        <p className="text-sm text-muted-foreground">Selecciona uno o más roles para aplicar permisos predefinidos</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {roles.map((role) => {
            const isSelected = selectedRoleIds.includes(role.id);
            const isPending = assignMutation.isPending || removeMutation.isPending;
            const rolePermissions = rolePermissionsMap.get(role.id) ?? [];
            const permissionCount = rolePermissions.length;

            return (
              <div
                key={role.id}
                className={`flex items-start gap-3 p-4 rounded-lg border transition-colors ${
                  disabled || isPending ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-primary/50'
                } ${isSelected ? 'border-primary bg-primary/5' : 'border-border'}`}
                onClick={() => !disabled && !isPending && handleRoleToggle(role.id)}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => !disabled && handleRoleToggle(role.id)}
                  disabled={disabled || isPending}
                  className="mt-0.5"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm">{role.name}</p>
                    <Badge variant="secondary" className="text-xs">
                      {permissionCount}
                    </Badge>
                    {role.color && (
                      <Badge
                        variant="outline"
                        style={{
                          backgroundColor: `${role.color}20`,
                          borderColor: role.color,
                          color: role.color,
                        }}
                        className="text-xs"
                      >
                        {role.is_system ? 'Sistema' : 'Personalizado'}
                      </Badge>
                    )}
                  </div>
                  {role.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{role.description}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
