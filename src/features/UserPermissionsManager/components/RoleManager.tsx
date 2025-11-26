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
import {
  createRole,
  deleteRole,
  getRolePermissions,
  getRoleUserCounts,
  getRoles,
  updateRole,
} from '@/features/Permissions/actions';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Pencil, Plus, Search, Shield, Trash2, Users } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ManageRoleUsersDialog } from './ManageRoleUsersDialog';
import { RolePermissionsEditor } from './RolePermissionsEditor';
import { RoleTemplateSelector } from './RoleTemplateSelector';

// Componente separado para cada card de rol (evita el error de hooks en map)
function RoleCard({
  role,
  userCount,
  onEdit,
  onManageUsers,
  onDelete,
  isDeleting,
}: {
  role: any;
  userCount: number;
  onEdit: (role: any) => void;
  onManageUsers: (role: any) => void;
  onDelete: (roleId: number, roleName: string) => void;
  isDeleting: boolean;
}) {
  const { data: permissions = [] } = useQuery({
    queryKey: ['role-permissions', role.id],
    queryFn: () => getRolePermissions(role.id),
    enabled: !!role.id && role.slug !== 'owner',
  });

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" style={{ color: role.color || 'currentColor' }} />
          <h3 className="font-semibold">{role.name}</h3>
        </div>
        <div className="flex gap-1">
          <Badge variant="outline" className="text-xs flex items-center gap-1">
            <Users className="h-3 w-3" />
            {userCount}
          </Badge>
          <Badge variant="outline" className="text-xs flex items-center gap-1">
            <Shield className="h-3 w-3" />
            {role.slug === 'owner' ? 'ALL' : permissions.length}
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
      </div>

      {role.description && <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{role.description}</p>}

      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit(role)} disabled={role.is_system}>
          <Pencil className="h-3 w-3 mr-2" />
          Editar
        </Button>
        <Button variant="outline" size="sm" onClick={() => onManageUsers(role)} title="Gestionar usuarios">
          <Users className="h-3 w-3" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDelete(role.id, role.name)}
          disabled={role.is_system || isDeleting}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </Card>
  );
}

export function RoleManager() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [roleColor, setRoleColor] = useState('#3b82f6');
  const [rolePermissions, setRolePermissions] = useState<Array<{ tabId: string; actionId: string }>>([]);
  const [templateRoleIds, setTemplateRoleIds] = useState<number[]>([]);
  const [manageUsersRole, setManageUsersRole] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: getRoles,
  });

  const { data: roleUserCounts = {} } = useQuery<Record<number, number>>({
    queryKey: ['role-user-counts'],
    queryFn: getRoleUserCounts,
    staleTime: 2 * 60 * 1000, // 2 minutos
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
      toast.success('Rol creado', {
        description: `El rol "${newRole.name}" ha sido creado exitosamente`,
      });
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error('Error', {
        description: error.message || 'No se pudo crear el rol',
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
      toast.success('Rol actualizado', {
        description: `El rol "${updatedRole.name}" ha sido actualizado exitosamente`,
      });
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error('Error', {
        description: error.message || 'No se pudo actualizar el rol',
      });
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: deleteRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Rol eliminado', {
        description: 'El rol ha sido eliminado exitosamente',
      });
    },
    onError: (error: any) => {
      toast.error('Error', {
        description: error.message || 'No se pudo eliminar el rol',
      });
    },
  });

  const handleCreateRole = () => {
    setEditingRole(null);
    setRoleName('');
    setRoleDescription('');
    setRoleColor('#3b82f6');
    setRolePermissions([]);
    setTemplateRoleIds([]);
    setIsDialogOpen(true);
  };

  const handleEditRole = async (role: any) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDescription(role.description || '');
    setRoleColor(role.color || '#3b82f6');
    setTemplateRoleIds([]);

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
      toast.error('Error', {
        description: 'El nombre del rol es requerido',
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

  const handleImportPermissions = async () => {
    if (templateRoleIds.length === 0) {
      toast.error('Error', {
        description: 'Selecciona al menos un rol para importar permisos',
      });
      return;
    }

    try {
      // Obtener permisos de todos los roles seleccionados
      const allPermissions = await Promise.all(templateRoleIds.map((roleId) => getRolePermissions(roleId)));

      // Combinar permisos (eliminar duplicados)
      const uniquePermissions = new Map<string, { tabId: string; actionId: string }>();

      allPermissions.flat().forEach((perm) => {
        const key = `${perm.tab_id}:${perm.action_id}`;
        uniquePermissions.set(key, {
          tabId: perm.tab_id,
          actionId: perm.action_id,
        });
      });

      // Combinar con permisos ya seleccionados
      const existingPermissions = new Map(rolePermissions.map((p) => [`${p.tabId}:${p.actionId}`, p]));

      uniquePermissions.forEach((perm, key) => {
        existingPermissions.set(key, perm);
      });

      setRolePermissions(Array.from(existingPermissions.values()));

      toast.success('Permisos importados', {
        description: `Se importaron ${uniquePermissions.size} permisos únicos de ${templateRoleIds.length} rol(es)`,
      });
    } catch (error) {
      console.error('Error importing permissions:', error);
      toast.error('Error', {
        description: 'No se pudieron importar los permisos',
      });
    }
  };

  const handleManageUsers = (role: any) => {
    setManageUsersRole(role);
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
        <div className="space-y-4">
          <div className="flex items-center justify-between">
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
                    <Label>Importar Permisos desde Roles Existentes (Opcional)</Label>
                    <p className="text-xs text-muted-foreground">
                      Selecciona uno o más roles para usar sus permisos como plantilla
                    </p>

                    <RoleTemplateSelector
                      roles={roles.filter((r) => !editingRole || r.id !== editingRole.id)}
                      selectedRoleIds={templateRoleIds}
                      onSelectionChange={setTemplateRoleIds}
                    />

                    {templateRoleIds.length > 0 && (
                      <Button variant="outline" size="sm" onClick={handleImportPermissions} className="w-full">
                        <Download className="h-4 w-4 mr-2" />
                        Importar Permisos ({templateRoleIds.length} rol{templateRoleIds.length > 1 ? 'es' : ''})
                      </Button>
                    )}
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

          {/* Buscador de roles */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar roles por nombre o descripción..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 mb-4 md:w-1/4"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles
            .filter(
              (role: any) =>
                role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                role.description?.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .map((role: any) => (
              <RoleCard
                key={role.id}
                role={role}
                userCount={roleUserCounts[role.id] || 0}
                onEdit={handleEditRole}
                onManageUsers={handleManageUsers}
                onDelete={handleDeleteRole}
                isDeleting={deleteRoleMutation.isPending}
              />
            ))}

          {roles.filter(
            (role: any) =>
              role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              role.description?.toLowerCase().includes(searchQuery.toLowerCase())
          ).length === 0 && (
            <div className="col-span-full text-center py-8 text-sm text-muted-foreground">
              No se encontraron roles que coincidan con {searchQuery}
            </div>
          )}
        </div>
      </Card>

      <ManageRoleUsersDialog
        role={manageUsersRole}
        open={!!manageUsersRole}
        onOpenChange={(open: boolean) => !open && setManageUsersRole(null)}
      />
    </div>
  );
}
