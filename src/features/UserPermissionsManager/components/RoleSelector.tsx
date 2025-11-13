'use client';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import {
  assignRoleToUser,
  getRolePermissions,
  getRoles,
  getUserRoles,
  removeRoleFromUser,
} from '@/features/Permissions/actions';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Shield } from 'lucide-react';
import { useMemo } from 'react';

interface RoleSelectorProps {
  userId: string;
}

export function RoleSelector({ userId }: RoleSelectorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: getRoles,
  });

  const { data: userRoles = [], isLoading: userRolesLoading } = useQuery({
    queryKey: ['user-roles', userId],
    queryFn: () => getUserRoles(userId),
    enabled: !!userId,
  });

  // Obtener permisos de cada rol
  const rolePermissionsQueries = useQuery({
    queryKey: ['all-role-permissions', roles.map((r: any) => r.id)],
    queryFn: async () => {
      const permissionsMap = new Map();
      await Promise.all(
        roles.map(async (role: any) => {
          const perms = await getRolePermissions(role.id);
          permissionsMap.set(role.id, perms);
        })
      );
      return permissionsMap;
    },
    enabled: roles.length > 0,
  });

  const selectedRoleIds = useMemo(() => {
    return userRoles.map((ur: any) => ur.role_id);
  }, [userRoles]);

  const assignMutation = useMutation({
    mutationFn: (roleId: number) => assignRoleToUser(userId, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles', userId] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions', userId] });
      toast({
        title: 'Rol asignado',
        description: 'El rol ha sido asignado correctamente',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo asignar el rol',
        variant: 'destructive',
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (roleId: number) => removeRoleFromUser(userId, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles', userId] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions', userId] });
      toast({
        title: 'Rol removido',
        description: 'El rol ha sido removido correctamente',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo remover el rol',
        variant: 'destructive',
      });
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

  const rolePermissionsMap = rolePermissionsQueries.data || new Map();

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <Label className="text-base font-semibold">Roles / Presets</Label>
        </div>
        <p className="text-sm text-muted-foreground">Selecciona uno o más roles para aplicar permisos predefinidos</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {roles.map((role: any) => {
            const isSelected = selectedRoleIds.includes(role.id);
            const isPending = assignMutation.isPending || removeMutation.isPending;
            const rolePermissions = rolePermissionsMap.get(role.id) || [];
            const permissionCount = rolePermissions.length;

            return (
              <div
                key={role.id}
                className={`flex items-start gap-3 p-4 rounded-lg border transition-colors cursor-pointer ${
                  isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
                onClick={() => !isPending && handleRoleToggle(role.id)}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => handleRoleToggle(role.id)}
                  disabled={isPending}
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
                  {role.description && <p className="text-xs text-muted-foreground line-clamp-2">{role.description}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
