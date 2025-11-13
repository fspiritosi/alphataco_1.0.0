'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { createRole, deleteRole, getRolePermissions, getRoles, updateRole } from '@/features/Permissions/actions';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Shield, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { RolePermissionsEditor } from './RolePermissionsEditor';

export function RoleManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [roleColor, setRoleColor] = useState('#3b82f6');
  const [rolePermissions, setRolePermissions] = useState<Array<{ tabId: string; actionId: string }>>([]);

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: getRoles,
  });

  const createRoleMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      color?: string;
      permissions: Array<{ tabId: string; actionId: string }>;
    }) => {
      const newRole = await createRole(data.name, data.description, data.color);
      // Guardar permisos del rol
      if (data.permissions.length > 0) {
        const supabase = supabaseBrowser();
        await supabase.from('role_permissions').delete().eq('role_id', newRole.id);

        const records = data.permissions.map((perm) => ({
          role_id: newRole.id,
          tab_id: perm.tabId,
          action_id: perm.actionId,
        }));

        await supabase.from('role_permissions').insert(records);
      }
      return newRole;
    },
    onSuccess: (newRole) => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast({
        title: 'Rol creado',
        description: `El rol "${newRole.name}" ha sido creado exitosamente`,
      });
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear el rol',
        variant: 'destructive',
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async (data: {
      id: number;
      name: string;
      description?: string;
      color?: string;
      permissions: Array<{ tabId: string; actionId: string }>;
    }) => {
      const updatedRole = await updateRole(data.id, data.name, data.description, data.color);
      // Actualizar permisos del rol
      const supabase = supabaseBrowser();
      await supabase.from('role_permissions').delete().eq('role_id', updatedRole.id);

      if (data.permissions.length > 0) {
        const records = data.permissions.map((perm) => ({
          role_id: updatedRole.id,
          tab_id: perm.tabId,
          action_id: perm.actionId,
        }));

        await supabase.from('role_permissions').insert(records);
      }
      return updatedRole;
    },
    onSuccess: (updatedRole) => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['role-permissions', updatedRole.id] });
      toast({
        title: 'Rol actualizado',
        description: `El rol "${updatedRole.name}" ha sido actualizado exitosamente`,
      });
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar el rol',
        variant: 'destructive',
      });
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: deleteRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast({
        title: 'Rol eliminado',
        description: 'El rol ha sido eliminado exitosamente',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo eliminar el rol',
        variant: 'destructive',
      });
    },
  });

  const handleCreateRole = () => {
    setEditingRole(null);
    setRoleName('');
    setRoleDescription('');
    setRoleColor('#3b82f6');
    setRolePermissions([]);
    setIsDialogOpen(true);
  };

  const handleEditRole = async (role: any) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDescription(role.description || '');
    setRoleColor(role.color || '#3b82f6');

    // Cargar permisos del rol
    try {
      const permissions = await getRolePermissions(role.id);
      setRolePermissions(
        permissions.map((p) => ({
          tabId: p.tab_id,
          actionId: p.action_id,
        }))
      );
    } catch (error) {
      console.error('Error loading role permissions:', error);
      setRolePermissions([]);
    }

    setIsDialogOpen(true);
  };

  const handleSaveRole = () => {
    if (!roleName.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre del rol es requerido',
        variant: 'destructive',
      });
      return;
    }

    if (editingRole) {
      updateRoleMutation.mutate({
        id: editingRole.id,
        name: roleName,
        description: roleDescription,
        color: roleColor,
        permissions: rolePermissions,
      });
    } else {
      createRoleMutation.mutate({
        name: roleName,
        description: roleDescription,
        color: roleColor,
        permissions: rolePermissions,
      });
    }
  };

  const handleDeleteRole = (roleId: number, roleName: string) => {
    if (confirm(`¿Estás seguro de eliminar el rol "${roleName}"?`)) {
      deleteRoleMutation.mutate(roleId);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="text-sm text-muted-foreground">Cargando roles...</div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Label className="text-base font-semibold">Roles Disponibles</Label>
            <p className="text-sm text-muted-foreground mt-1">Crea y gestiona roles con permisos predefinidos</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleCreateRole}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Rol
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingRole ? 'Editar Rol' : 'Crear Nuevo Rol'}</DialogTitle>
                <DialogDescription>Define el nombre, descripción, color y permisos para este rol</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="role-name">Nombre del Rol</Label>
                    <Input
                      id="role-name"
                      placeholder="Ej: Administrador, Editor, Visor"
                      value={roleName}
                      onChange={(e) => setRoleName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role-color">Color del Rol</Label>
                    <div className="flex gap-2">
                      <Input
                        id="role-color"
                        type="color"
                        value={roleColor}
                        onChange={(e) => setRoleColor(e.target.value)}
                        className="w-20 h-10 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={roleColor}
                        onChange={(e) => setRoleColor(e.target.value)}
                        placeholder="#3b82f6"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role-description">Descripción</Label>
                  <Textarea
                    id="role-description"
                    placeholder="Describe las responsabilidades de este rol"
                    value={roleDescription}
                    onChange={(e) => setRoleDescription(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <RolePermissionsEditor permissions={rolePermissions} onPermissionsChange={setRolePermissions} />
                  <p className="text-xs text-muted-foreground">
                    Total de permisos seleccionados: {rolePermissions.length}
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveRole}
                  disabled={createRoleMutation.isPending || updateRoleMutation.isPending}
                >
                  {createRoleMutation.isPending || updateRoleMutation.isPending
                    ? 'Guardando...'
                    : editingRole
                      ? 'Guardar Cambios'
                      : 'Crear Rol'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role: any) => {
            const { data: permissions = [] } = useQuery({
              queryKey: ['role-permissions', role.id],
              queryFn: () => getRolePermissions(role.id),
              enabled: !!role.id,
            });

            return (
              <Card key={role.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5" style={{ color: role.color || 'currentColor' }} />
                    <h3 className="font-semibold">{role.name}</h3>
                  </div>
                  <div className="flex gap-1">
                    {role.is_system && (
                      <Badge variant="secondary" className="text-xs">
                        Sistema
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {permissions.length}
                    </Badge>
                  </div>
                </div>

                {role.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{role.description}</p>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEditRole(role)}
                    disabled={role.is_system}
                  >
                    <Pencil className="h-3 w-3 mr-2" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteRole(role.id, role.name)}
                    disabled={role.is_system || deleteRoleMutation.isPending}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
