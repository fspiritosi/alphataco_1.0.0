'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { PermissionGuard } from '@/features/Permissions/components/PermissionGuard';
import {
  createRoleWithPermissions,
  deleteRoleServer,
  getAllRolesWithCounts,
  getRolePermissionsServer,
  updateRoleWithPermissions,
} from '@/features/UserPermissionsManager/actions.server';
import { Logger } from '@/lib/logger';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Pencil, Plus, Search, Shield, Trash2, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { ModulesWithTabsData, RoleWithCount } from '../actions.server';
import { updateRoleHiddenEquipmentTypes } from '../actions/equipmentTypeVisibility.server';
import {
  equipmentTypeVisibilityKeys,
  useRoleEquipmentTypesDraft,
  type RoleEquipmentTypeChanges,
} from '../hooks/useEquipmentTypeVisibility';
import { ManageRoleUsersDialog } from './ManageRoleUsersDialog';
import { RoleEquipmentTypesSection } from './RoleEquipmentTypesSection';
import { RolePermissionsEditor } from './RolePermissionsEditor';
import { RoleTemplateSelector } from './RoleTemplateSelector';

const logger = new Logger('RoleManager');

// ─── Tipos de equipamiento (ticket 690) ───────────────────────────────────────

type EquipmentTypesSaveOutcome =
  | { status: 'unchanged' }
  | { status: 'saved'; hidden: number; shown: number }
  | { status: 'failed' };

/**
 * Persiste el delta de tipos de equipamiento del rol después de guardar el rol.
 * No lanza: si falla, el rol ya quedó guardado y el diálogo informa el error del bloque.
 */
async function saveRoleEquipmentTypeChanges(
  roleId: number,
  changes: RoleEquipmentTypeChanges
): Promise<EquipmentTypesSaveOutcome> {
  if (changes.hide.length === 0 && changes.show.length === 0) return { status: 'unchanged' };

  try {
    const result = await updateRoleHiddenEquipmentTypes(roleId, changes);
    return { status: 'saved', ...result };
  } catch (error) {
    logger.error('Error al guardar tipos de equipamiento del rol', { data: { error, roleId } });
    return { status: 'failed' };
  }
}

function describeEquipmentTypesOutcome(outcome: EquipmentTypesSaveOutcome): string {
  if (outcome.status !== 'saved') return '';
  const parts = [
    outcome.hidden > 0 ? `se ocultaron ${outcome.hidden}` : null,
    outcome.shown > 0 ? `se volvieron a mostrar ${outcome.shown}` : null,
  ].filter(Boolean);
  return parts.length > 0 ? ` Tipos de equipamiento: ${parts.join(' y ')}.` : '';
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface RoleManagerProps {
  initialRoles: RoleWithCount[];
  initialRolePermissions: Record<number, Array<{ tabId: string; actionId: string }>>;
  initialModules: ModulesWithTabsData;
}

// ─── RoleCard ─────────────────────────────────────────────────────────────────

function RoleCard({
  role,
  permissionsCount,
  onEdit,
  onManageUsers,
  onDelete,
  isDeleting,
}: {
  role: RoleWithCount;
  permissionsCount: number;
  onEdit: (role: RoleWithCount) => void;
  onManageUsers: (role: RoleWithCount) => void;
  onDelete: (roleId: number, roleName: string) => void;
  isDeleting: boolean;
}) {
  const hasUsers = role.userCount > 0;
  const canDelete = !role.is_system && !hasUsers;

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
            {role.userCount}
          </Badge>
          <Badge variant="outline" className="text-xs flex items-center gap-1">
            <Shield className="h-3 w-3" />
            {role.slug === 'owner' ? 'ALL' : permissionsCount}
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
        {/* Roles de sistema: solo botón de asignar */}
        {role.is_system ? (
          <PermissionGuard module="configuracion" tab="gestion-roles" action="update">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => onManageUsers(role)}>
              <Users className="h-4 w-4 mr-2" />
              Asignar Usuarios
            </Button>
          </PermissionGuard>
        ) : (
          /* Roles personalizados: editar, asignar y eliminar */
          <>
            <PermissionGuard module="configuracion" tab="gestion-roles" action="update">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit(role)}>
                <Pencil className="h-3 w-3 mr-2" />
                Editar
              </Button>
            </PermissionGuard>
            <PermissionGuard module="configuracion" tab="gestion-roles" action="update">
              <Button variant="outline" size="sm" onClick={() => onManageUsers(role)} title="Asignar usuarios">
                <Users className="h-3 w-3" />
              </Button>
            </PermissionGuard>
            <PermissionGuard module="configuracion" tab="gestion-roles" action="delete">
              <Button
                variant={canDelete ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => onDelete(role.id, role.name)}
                disabled={!canDelete || isDeleting}
                title={hasUsers ? `No se puede eliminar: ${role.userCount} usuario(s) asignado(s)` : 'Eliminar rol'}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </PermissionGuard>
          </>
        )}
      </div>
    </Card>
  );
}

// ─── RoleManager ──────────────────────────────────────────────────────────────

export function RoleManager({ initialRoles, initialRolePermissions, initialModules }: RoleManagerProps) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleWithCount | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<{ id: number; name: string } | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [roleColor, setRoleColor] = useState('#3b82f6');
  const [rolePermissions, setRolePermissions] = useState<Array<{ tabId: string; actionId: string }>>([]);
  const [templateRoleIds, setTemplateRoleIds] = useState<number[]>([]);
  // Bloquea el boton de importar mientras se cargan los permisos de los roles plantilla
  const [isImporting, setIsImporting] = useState(false);
  const [manageUsersRole, setManageUsersRole] = useState<RoleWithCount | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [equipmentTypesSaveError, setEquipmentTypesSaveError] = useState<string | null>(null);

  // Tipos de equipamiento visibles del rol: baseline de la BD al abrir + borrador local
  const equipmentTypesDraft = useRoleEquipmentTypesDraft({
    roleId: editingRole?.id ?? null,
    enabled: isDialogOpen,
  });

  const invalidateEquipmentTypeVisibility = (roleId: number) => {
    queryClient.invalidateQueries({ queryKey: equipmentTypeVisibilityKeys.role(roleId) });
    // Lo que ve cada usuario se resuelve con sus roles
    queryClient.invalidateQueries({ queryKey: equipmentTypeVisibilityKeys.allUsers });
  };

  // Roles con SSR initial data
  const { data: roles = initialRoles } = useQuery({
    queryKey: ['roles'],
    queryFn: getAllRolesWithCounts,
    initialData: initialRoles,
    staleTime: 30 * 1000,
  });

  // Counts de permisos por rol (derivado de la query inicial o local)
  const [localRolePermissions, setLocalRolePermissions] =
    useState<Record<number, Array<{ tabId: string; actionId: string }>>>(initialRolePermissions);

  const getPermissionsCountForRole = (roleId: number): number => {
    return (localRolePermissions[roleId] ?? []).length;
  };

  // Mutación: crear rol (y después, con el id, sus tipos de equipamiento ocultos)
  const createRoleMutation = useMutation({
    mutationFn: async ({
      role,
      equipmentTypeChanges,
    }: {
      role: Parameters<typeof createRoleWithPermissions>[0];
      equipmentTypeChanges: RoleEquipmentTypeChanges;
    }) => {
      const newRole = await createRoleWithPermissions(role);
      const equipmentTypes = await saveRoleEquipmentTypeChanges(newRole.id, equipmentTypeChanges);
      return { newRole, equipmentTypes };
    },
    onSuccess: ({ newRole, equipmentTypes }) => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      // Actualizar cache local de permisos
      setLocalRolePermissions((prev) => ({ ...prev, [newRole.id]: rolePermissions }));
      invalidateEquipmentTypeVisibility(newRole.id);

      if (equipmentTypes.status === 'failed') {
        // El rol ya existe: el diálogo pasa a edición para reintentar sin crear un duplicado
        setEditingRole({ ...newRole, userCount: 0, _count: { user_roles: 0 } });
        setEquipmentTypesSaveError(
          'El rol se creó, pero no se pudo guardar qué tipos de equipamiento ve. Vuelve a guardar para reintentar.'
        );
        toast.error('Tipos de equipamiento sin guardar', {
          description: `El rol "${newRole.name}" se creó, pero no se pudo guardar qué tipos de equipamiento ve.`,
        });
        return;
      }

      toast.success('Rol creado', {
        description: `El rol "${newRole.name}" ha sido creado exitosamente.${describeEquipmentTypesOutcome(equipmentTypes)}`,
      });
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      logger.error('Error al crear rol', { data: { error } });
      toast.error('Error', {
        description: error.message || 'No se pudo crear el rol',
      });
    },
  });

  // Mutación: actualizar rol (y después el delta de sus tipos de equipamiento ocultos)
  const updateRoleMutation = useMutation({
    mutationFn: async ({
      role,
      equipmentTypeChanges,
    }: {
      role: Parameters<typeof updateRoleWithPermissions>[0];
      equipmentTypeChanges: RoleEquipmentTypeChanges;
    }) => {
      const updatedRole = await updateRoleWithPermissions(role);
      const equipmentTypes = await saveRoleEquipmentTypeChanges(updatedRole.id, equipmentTypeChanges);
      return { updatedRole, equipmentTypes };
    },
    onSuccess: ({ updatedRole, equipmentTypes }) => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      // Actualizar cache local de permisos
      setLocalRolePermissions((prev) => ({ ...prev, [updatedRole.id]: rolePermissions }));
      invalidateEquipmentTypeVisibility(updatedRole.id);

      if (equipmentTypes.status === 'failed') {
        // Los permisos se guardaron; el borrador de tipos queda para reintentar
        setEquipmentTypesSaveError(
          'Los permisos del rol se guardaron, pero no se pudo guardar qué tipos de equipamiento ve. Vuelve a guardar para reintentar.'
        );
        toast.error('Tipos de equipamiento sin guardar', {
          description: `Los permisos de "${updatedRole.name}" se guardaron, pero no los tipos de equipamiento.`,
        });
        return;
      }

      toast.success('Rol actualizado', {
        description: `El rol "${updatedRole.name}" ha sido actualizado exitosamente.${describeEquipmentTypesOutcome(equipmentTypes)}`,
      });
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      logger.error('Error al actualizar rol', { data: { error } });
      toast.error('Error', {
        description: error.message || 'No se pudo actualizar el rol',
      });
    },
  });

  // Mutación: eliminar rol
  const deleteRoleMutation = useMutation({
    mutationFn: deleteRoleServer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Rol eliminado', {
        description: 'El rol ha sido eliminado exitosamente',
      });
    },
    onError: (error: Error) => {
      logger.error('Error al eliminar rol', { data: { error } });
      toast.error('Error', {
        description: error.message || 'No se pudo eliminar el rol',
      });
    },
  });

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleCreateRole = () => {
    setEditingRole(null);
    setRoleName('');
    setRoleDescription('');
    setRoleColor('#3b82f6');
    setRolePermissions([]);
    setTemplateRoleIds([]);
    equipmentTypesDraft.reset();
    setEquipmentTypesSaveError(null);
    setIsDialogOpen(true);
  };

  const handleEditRole = async (role: RoleWithCount) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDescription(role.description || '');
    setRoleColor(role.color || '#3b82f6');
    setTemplateRoleIds([]);
    equipmentTypesDraft.reset();
    setEquipmentTypesSaveError(null);

    // Usar permisos del cache local o cargar desde server
    const cached = localRolePermissions[role.id];
    if (cached !== undefined) {
      setRolePermissions(cached);
    } else {
      try {
        const permissions = await getRolePermissionsServer(role.id);
        setRolePermissions(permissions);
        setLocalRolePermissions((prev) => ({ ...prev, [role.id]: permissions }));
      } catch (error) {
        logger.error('Error al cargar permisos del rol', { data: { error } });
        setRolePermissions([]);
      }
    }

    setIsDialogOpen(true);
  };

  const handleSaveRole = () => {
    if (!roleName.trim()) {
      toast.error('Error', { description: 'El nombre del rol es requerido' });
      return;
    }

    // Sin baseline no se puede calcular qué cambió en los tipos de equipamiento
    if (equipmentTypesDraft.hasChanges && !equipmentTypesDraft.isBaselineReady) return;

    setEquipmentTypesSaveError(null);
    const equipmentTypeChanges = equipmentTypesDraft.changes;

    if (editingRole) {
      updateRoleMutation.mutate({
        role: {
          id: editingRole.id,
          name: roleName,
          description: roleDescription,
          color: roleColor,
          permissions: rolePermissions,
        },
        equipmentTypeChanges,
      });
    } else {
      createRoleMutation.mutate({
        role: {
          name: roleName,
          description: roleDescription,
          color: roleColor,
          permissions: rolePermissions,
        },
        equipmentTypeChanges,
      });
    }
  };

  const isSavingRole = createRoleMutation.isPending || updateRoleMutation.isPending;
  const isWaitingEquipmentTypesBaseline = equipmentTypesDraft.hasChanges && !equipmentTypesDraft.isBaselineReady;

  const handleImportPermissions = async () => {
    if (templateRoleIds.length === 0) {
      toast.error('Error', { description: 'Selecciona al menos un rol para importar permisos' });
      return;
    }
    if (isImporting) return;

    setIsImporting(true);
    try {
      // Cargar permisos de los roles seleccionados (desde cache local o server)
      const allPermissions = await Promise.all(
        templateRoleIds.map(async (roleId) => {
          if (localRolePermissions[roleId] !== undefined) {
            return localRolePermissions[roleId];
          }
          const perms = await getRolePermissionsServer(roleId);
          setLocalRolePermissions((prev) => ({ ...prev, [roleId]: perms }));
          return perms;
        })
      );

      // Combinar eliminando duplicados
      const uniquePermissions = new Map<string, { tabId: string; actionId: string }>();
      allPermissions.flat().forEach((perm) => {
        uniquePermissions.set(`${perm.tabId}:${perm.actionId}`, perm);
      });

      // Combinar con permisos ya seleccionados
      const existingPermissions = new Map(rolePermissions.map((p) => [`${p.tabId}:${p.actionId}`, p]));
      uniquePermissions.forEach((perm, key) => existingPermissions.set(key, perm));

      setRolePermissions(Array.from(existingPermissions.values()));

      toast.success('Permisos importados', {
        description: `Se importaron ${uniquePermissions.size} permisos únicos de ${templateRoleIds.length} rol(es)`,
      });
    } catch (error) {
      logger.error('Error al importar permisos', { data: { error } });
      toast.error('Error', { description: 'No se pudieron importar los permisos' });
    } finally {
      setIsImporting(false);
    }
  };

  const handleManageUsers = (role: RoleWithCount) => {
    setManageUsersRole(role);
  };

  const handleDeleteRole = (roleId: number, roleName: string) => {
    setRoleToDelete({ id: roleId, name: roleName });
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteRole = () => {
    if (roleToDelete) {
      deleteRoleMutation.mutate(roleToDelete.id);
      setDeleteConfirmOpen(false);
      setRoleToDelete(null);
    }
  };

  // ─── Derived state ─────────────────────────────────────────────────────────

  const { systemRoles, customRoles } = useMemo(() => {
    const filtered = roles.filter(
      (role) =>
        role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        role.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return {
      systemRoles: filtered.filter((r) => r.is_system),
      customRoles: filtered.filter((r) => !r.is_system),
    };
  }, [roles, searchQuery]);

  const filteredCount = systemRoles.length + customRoles.length;

  // ─── Render ────────────────────────────────────────────────────────────────

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
              <PermissionGuard module="configuracion" tab="gestion-roles" action="create">
                <DialogTrigger asChild>
                  <Button onClick={handleCreateRole}>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Rol
                  </Button>
                </DialogTrigger>
              </PermissionGuard>
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
                      rolePermissionsCache={localRolePermissions}
                    />

                    {templateRoleIds.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleImportPermissions}
                        className="w-full"
                        disabled={isImporting}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        {isImporting
                          ? 'Importando...'
                          : `Importar Permisos (${templateRoleIds.length} rol${templateRoleIds.length > 1 ? 'es' : ''})`}
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <RolePermissionsEditor
                      permissions={rolePermissions}
                      onPermissionsChange={setRolePermissions}
                      initialModules={initialModules}
                      moduleAddons={{
                        mantenimiento: (
                          <RoleEquipmentTypesSection
                            draft={equipmentTypesDraft}
                            disabled={isSavingRole}
                            saveError={equipmentTypesSaveError}
                          />
                        ),
                      }}
                    />
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
                    disabled={isSavingRole || isWaitingEquipmentTypesBaseline}
                    aria-busy={isSavingRole || isWaitingEquipmentTypesBaseline}
                  >
                    {isSavingRole
                      ? 'Guardando...'
                      : isWaitingEquipmentTypesBaseline
                        ? 'Cargando tipos...'
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

        {/* Lista agrupada */}
        {filteredCount === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No se encontraron roles que coincidan con {searchQuery}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Roles Personalizados */}
            {customRoles.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Roles Personalizados ({customRoles.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {customRoles.map((role) => (
                    <RoleCard
                      key={role.id}
                      role={role}
                      permissionsCount={getPermissionsCountForRole(role.id)}
                      onEdit={handleEditRole}
                      onManageUsers={handleManageUsers}
                      onDelete={handleDeleteRole}
                      isDeleting={deleteRoleMutation.isPending}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Roles de Sistema */}
            {systemRoles.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Roles de Sistema ({systemRoles.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {systemRoles.map((role) => (
                    <RoleCard
                      key={role.id}
                      role={role}
                      permissionsCount={getPermissionsCountForRole(role.id)}
                      onEdit={handleEditRole}
                      onManageUsers={handleManageUsers}
                      onDelete={handleDeleteRole}
                      isDeleting={deleteRoleMutation.isPending}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar rol?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar el rol {roleToDelete?.name}? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRoleToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteRole}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ManageRoleUsersDialog
        role={manageUsersRole}
        open={!!manageUsersRole}
        onOpenChange={(open: boolean) => !open && setManageUsersRole(null)}
      />
    </div>
  );
}
