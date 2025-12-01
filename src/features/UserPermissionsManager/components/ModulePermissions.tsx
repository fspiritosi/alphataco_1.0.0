'use client';

import { HandshakeIcon } from '@/components/Icons';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';
import {
  getModulesWithTabs,
  getUserRoles,
  removeRoleFromUser,
  removeUserPermission,
  setUserPermission,
} from '@/features/Permissions/actions';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Calendar,
  ClipboardList,
  Eraser,
  Eye,
  FileText,
  HelpCircle,
  LayoutDashboard,
  Pencil,
  Plus,
  Trash2,
  Truck,
  Users,
  Wrench,
} from 'lucide-react';
import { useMemo, useState } from 'react';

interface ModulePermissionsProps {
  userId: string;
  permissions: any[];
}

const ACTION_ICONS = {
  view: Eye,
  create: Plus,
  update: Pencil,
  delete: Trash2,
};

const ACTION_LABELS = {
  view: 'Ver',
  create: 'Crear',
  update: 'Editar',
  delete: 'Eliminar',
};

const ACTION_COLORS = {
  view: 'text-blue-600',
  create: 'text-green-600',
  update: 'text-yellow-600',
  delete: 'text-red-600',
};

const MODULE_ICONS: Record<string, any> = {
  dashboard: LayoutDashboard,
  empresa: Building2,
  empleados: Users,
  equipos: Truck,
  comercial: HandshakeIcon,
  documentacion: FileText,
  operaciones: Calendar,
  mantenimiento: Wrench,
  formularios: ClipboardList,
  ayuda: HelpCircle,
};

export function ModulePermissions({ userId, permissions }: ModulePermissionsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCleanDialogOpen, setIsCleanDialogOpen] = useState(false);

  const { data: modules = [], isLoading } = useQuery({
    queryKey: ['modules-with-tabs'],
    queryFn: getModulesWithTabs,
  });

  const { data: userRoles = [] } = useQuery({
    queryKey: ['user-roles', userId],
    queryFn: () => getUserRoles(userId),
    enabled: !!userId,
  });

  const permissionMap = useMemo(() => {
    const map = new Map<
      string,
      { source: string; isGranted: boolean; roleId?: number; roleName?: string; roleColor?: string }
    >();
    if (Array.isArray(permissions)) {
      permissions.forEach((perm: any) => {
        const key = `${perm.tab_id}:${perm.action_id}`;
        map.set(key, {
          source: perm.source,
          isGranted: perm.is_granted !== false,
          roleId: perm.role_id,
          roleName: perm.role_name,
          roleColor: perm.role_color,
        });
      });
    }
    return map;
  }, [permissions]);
  const setPermissionMutation = useMutation({
    mutationFn: ({ tabId, actionId, isGranted }: { tabId: string; actionId: string; isGranted: boolean }) =>
      setUserPermission(userId, tabId, actionId, isGranted),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions', userId] });
      queryClient.invalidateQueries({ queryKey: ['permissions'] }); // Invalidar también la query global
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el permiso',
        variant: 'destructive',
      });
    },
  });

  const removePermissionMutation = useMutation({
    mutationFn: ({ tabId, actionId }: { tabId: string; actionId: string }) =>
      removeUserPermission(userId, tabId, actionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions', userId] });
      queryClient.invalidateQueries({ queryKey: ['permissions'] }); // Invalidar también la query global
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo remover el permiso',
        variant: 'destructive',
      });
    },
  });

  const cleanCustomPermissionsMutation = useMutation({
    mutationFn: async () => {
      const supabase = (await import('@/lib/supabase/browser')).supabaseBrowser();
      const { error } = await supabase.from('user_permissions').delete().eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions', userId] });
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      queryClient.invalidateQueries({ queryKey: ['user-roles', userId] });
      toast({
        title: 'Permisos limpiados',
        description: 'Se eliminaron todos los permisos personalizados',
      });
      setIsCleanDialogOpen(false);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudieron limpiar los permisos',
        variant: 'destructive',
      });
    },
  });

  const cleanAllPermissionsMutation = useMutation({
    mutationFn: async () => {
      const supabase = (await import('@/lib/supabase/browser')).supabaseBrowser();

      // Eliminar permisos personalizados
      await supabase.from('user_permissions').delete().eq('user_id', userId);

      // Eliminar todos los roles del usuario
      await Promise.all(userRoles.map((ur: any) => removeRoleFromUser(userId, ur.role_id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions', userId] });
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      queryClient.invalidateQueries({ queryKey: ['user-roles', userId] });
      queryClient.invalidateQueries({ queryKey: ['role-user-counts'] });
      toast({
        title: 'Todos los permisos eliminados',
        description: 'Se eliminaron todos los roles y permisos personalizados',
      });
      setIsCleanDialogOpen(false);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudieron eliminar todos los permisos',
        variant: 'destructive',
      });
    },
  });

  const isPermissionActive = (tabId: string, actionId: string) => {
    const permKey = `${tabId}:${actionId}`;
    const permission = permissionMap.get(permKey);
    return permission?.isGranted || false;
  };

  const countTabActions = (tab: any): { total: number; selected: number } => {
    let total = tab.actions?.length || 0;
    let selected = tab.actions?.filter((action: any) => isPermissionActive(tab.id, action.id)).length || 0;

    if (tab.subtabs && tab.subtabs.length > 0) {
      tab.subtabs.forEach((subtab: any) => {
        const subtabCounts = countTabActions(subtab);
        total += subtabCounts.total;
        selected += subtabCounts.selected;
      });
    }

    return { total, selected };
  };

  const isTabFullySelected = (tab: any): boolean => {
    const counts = countTabActions(tab);
    return counts.total > 0 && counts.selected === counts.total;
  };

  const isModuleFullySelected = (module: any): boolean => {
    if (!module.tabs || module.tabs.length === 0) return false;
    return module.tabs.every((tab: any) => isTabFullySelected(tab));
  };

  const toggleModule = async (module: any) => {
    const isFullySelected = isModuleFullySelected(module);
    const toAdd: Array<{ tabId: string; actionId: string }> = [];
    const toRemove: Array<{ tabId: string; actionId: string }> = [];

    const collectChanges = (tab: any) => {
      tab.actions?.forEach((action: any) => {
        const isActive = isPermissionActive(tab.id, action.id);
        if (isFullySelected && isActive) {
          toRemove.push({ tabId: tab.id, actionId: action.id });
        } else if (!isFullySelected && !isActive) {
          toAdd.push({ tabId: tab.id, actionId: action.id });
        }
      });

      if (tab.subtabs && tab.subtabs.length > 0) {
        tab.subtabs.forEach((subtab: any) => collectChanges(subtab));
      }
    };

    module.tabs?.forEach((tab: any) => collectChanges(tab));

    // Ejecutar todas las mutaciones
    try {
      if (toAdd.length > 0) {
        await Promise.all(
          toAdd.map((perm) =>
            setPermissionMutation.mutateAsync({
              tabId: perm.tabId,
              actionId: perm.actionId,
              isGranted: true,
            })
          )
        );
      }
      if (toRemove.length > 0) {
        await Promise.all(
          toRemove.map((perm) => removePermissionMutation.mutateAsync({ tabId: perm.tabId, actionId: perm.actionId }))
        );
      }
      // Refrescar una sola vez al final
      queryClient.invalidateQueries({ queryKey: ['user-permissions', userId] });
    } catch (error) {
      console.error('Error toggling module:', error);
    }
  };

  const toggleTab = (tab: any) => {
    const isFullySelected = isTabFullySelected(tab);

    const toggleTabRecursive = (t: any) => {
      t.actions?.forEach((action: any) => {
        const isActive = isPermissionActive(t.id, action.id);
        if (isFullySelected && isActive) {
          removePermissionMutation.mutate({ tabId: t.id, actionId: action.id });
        } else if (!isFullySelected && !isActive) {
          setPermissionMutation.mutate({ tabId: t.id, actionId: action.id, isGranted: true });
        }
      });

      if (t.subtabs && t.subtabs.length > 0) {
        t.subtabs.forEach((subtab: any) => toggleTabRecursive(subtab));
      }
    };

    toggleTabRecursive(tab);
  };

  const handlePermissionToggle = async (tabId: string, actionId: string, tab?: any) => {
    const isActive = isPermissionActive(tabId, actionId);
    const permKey = `${tabId}:${actionId}`;
    const permission = permissionMap.get(permKey);

    // Encontrar el action slug
    const action = tab?.actions?.find((a: any) => a.id === actionId);
    const actionSlug = action?.slug;

    // Si estamos intentando REMOVER el permiso de 'view', verificar si hay otros permisos activos
    if (isActive && actionSlug === 'view') {
      const hasOtherPermissions = tab?.actions?.some((a: any) => {
        if (a.slug === 'view') return false; // Ignorar el permiso de view
        const otherKey = `${tabId}:${a.id}`;
        const otherPerm = permissionMap.get(otherKey);
        return otherPerm?.isGranted;
      });

      if (hasOtherPermissions) {
        // No permitir remover 'view' si hay otros permisos activos
        return;
      }
    }

    // Si el tab tiene subtabs, aplicar el cambio recursivamente
    if (tab && tab.subtabs && tab.subtabs.length > 0) {
      const toAdd: Array<{ tabId: string; actionId: string }> = [];
      const toRemove: Array<{ tabId: string; actionId: string }> = [];

      // Función recursiva para recolectar todos los tabs hijos
      const collectAllTabs = (t: any) => {
        if (isActive) {
          toRemove.push({ tabId: t.id, actionId });
        } else {
          toAdd.push({ tabId: t.id, actionId });
        }

        if (t.subtabs && t.subtabs.length > 0) {
          t.subtabs.forEach((subtab: any) => collectAllTabs(subtab));
        }
      };

      // Incluir el tab actual y todos sus hijos
      collectAllTabs(tab);

      // AUTO-ASSIGN VIEW: Si estamos agregando create/update/delete, también agregar 'view'
      if (!isActive && actionSlug && ['create', 'update', 'delete'].includes(actionSlug)) {
        const viewAction = tab?.actions?.find((a: any) => a.slug === 'view');
        if (viewAction) {
          const viewKey = `${tabId}:${viewAction.id}`;
          const viewPerm = permissionMap.get(viewKey);
          if (!viewPerm?.isGranted) {
            toAdd.push({ tabId, actionId: viewAction.id });
          }

          // También agregar 'view' a los subtabs
          const addViewToSubtabs = (subtabs: any[]) => {
            subtabs.forEach((subtab) => {
              const subtabViewAction = subtab.actions?.find((a: any) => a.slug === 'view');
              if (subtabViewAction) {
                const subtabViewKey = `${subtab.id}:${subtabViewAction.id}`;
                const subtabViewPerm = permissionMap.get(subtabViewKey);
                if (!subtabViewPerm?.isGranted) {
                  toAdd.push({ tabId: subtab.id, actionId: subtabViewAction.id });
                }
              }
              if (subtab.subtabs) {
                addViewToSubtabs(subtab.subtabs);
              }
            });
          };
          if (tab.subtabs && tab.subtabs.length > 0) {
            addViewToSubtabs(tab.subtabs);
          }
        }
      }

      // Ejecutar batch mutations
      try {
        if (toAdd.length > 0) {
          await Promise.all(
            toAdd.map((perm) =>
              setPermissionMutation.mutateAsync({
                tabId: perm.tabId,
                actionId: perm.actionId,
                isGranted: true,
              })
            )
          );
        }
        if (toRemove.length > 0) {
          await Promise.all(
            toRemove.map((perm) => removePermissionMutation.mutateAsync({ tabId: perm.tabId, actionId: perm.actionId }))
          );
        }
        // Refrescar una sola vez al final
        queryClient.invalidateQueries({ queryKey: ['user-permissions', userId] });
      } catch (error) {
        console.error('Error toggling permission with children:', error);
      }
    } else {
      // Si no tiene hijos, verificar auto-assign view
      if (!isActive && actionSlug && ['create', 'update', 'delete'].includes(actionSlug)) {
        const viewAction = tab?.actions?.find((a: any) => a.slug === 'view');
        if (viewAction) {
          const viewKey = `${tabId}:${viewAction.id}`;
          const viewPerm = permissionMap.get(viewKey);
          if (!viewPerm?.isGranted) {
            // Agregar view primero
            await setPermissionMutation.mutateAsync({ tabId, actionId: viewAction.id, isGranted: true });
          }
        }
      }

      // Cambiar el permiso actual
      if (isActive) {
        if (permission?.source === 'role') {
          setPermissionMutation.mutate({ tabId, actionId, isGranted: false });
        } else {
          removePermissionMutation.mutate({ tabId, actionId });
        }
      } else {
        setPermissionMutation.mutate({ tabId, actionId, isGranted: true });
      }
    }
  };

  const renderActions = (tab: any) => {
    if (!tab.actions || tab.actions.length === 0) return null;

    return (
      <div className="flex items-center gap-3 flex-wrap">
        {tab.actions.map((action: any) => {
          const ActionIcon = ACTION_ICONS[action.slug as keyof typeof ACTION_ICONS];
          const isActive = isPermissionActive(tab.id, action.id);
          const permKey = `${tab.id}:${action.id}`;
          const permission = permissionMap.get(permKey);
          const source = permission?.source;
          const roleColor = permission?.roleColor;
          const roleName = permission?.roleName;
          const isFromRole = source === 'role';

          // Verificar si 'view' está bloqueado por otros permisos activos
          const isViewLocked =
            action.slug === 'view' &&
            isActive &&
            tab.actions?.some((a: any) => {
              if (a.slug === 'view') return false;
              const otherKey = `${tab.id}:${a.id}`;
              const otherPerm = permissionMap.get(otherKey);
              return otherPerm?.isGranted;
            });

          const isDisabled = isFromRole || isViewLocked;

          const checkboxElement = (
            <div
              key={action.id}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border transition-all ${
                isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
              } ${
                isActive
                  ? 'border-primary/50 bg-primary/10 shadow-sm'
                  : 'border-border/50 hover:border-primary/30 hover:bg-muted/50'
              }`}
              onClick={() => !isDisabled && handlePermissionToggle(tab.id, action.id, tab)}
            >
              <Checkbox
                checked={isActive}
                disabled={isDisabled}
                onCheckedChange={() => !isDisabled && handlePermissionToggle(tab.id, action.id, tab)}
                onClick={(e) => e.stopPropagation()}
                className="h-4 w-4"
              />
              {ActionIcon && (
                <ActionIcon
                  className={`h-3.5 w-3.5 ${
                    ACTION_COLORS[action.slug as keyof typeof ACTION_COLORS] || 'text-muted-foreground'
                  }`}
                />
              )}
              <span className="text-xs font-medium">
                {ACTION_LABELS[action.slug as keyof typeof ACTION_LABELS] || action.name}
              </span>
              {source === 'role' && roleName && (
                <Badge
                  variant="outline"
                  className="text-[10px] h-4 px-1.5 font-medium"
                  style={{
                    backgroundColor: roleColor ? `${roleColor}20` : '#3b82f620',
                    borderColor: roleColor || '#3b82f6',
                    color: roleColor || '#3b82f6',
                  }}
                >
                  {roleName.charAt(0).toUpperCase()}
                </Badge>
              )}
            </div>
          );

          // Envolver en tooltip si está deshabilitado
          if (isDisabled) {
            return (
              <Tooltip key={action.id}>
                <TooltipTrigger asChild>{checkboxElement}</TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    {isFromRole
                      ? `Este permiso viene del rol "${roleName}" y no puede ser removido aquí`
                      : 'No se puede desactivar "Ver" mientras otros permisos estén activos'}
                  </p>
                </TooltipContent>
              </Tooltip>
            );
          }

          return checkboxElement;
        })}
      </div>
    );
  };

  const renderSubtab = (tab: any, level: number) => {
    const hasSubtabs = tab.subtabs && tab.subtabs.length > 0;
    const counts = countTabActions(tab);
    const tabSelected = isTabFullySelected(tab);
    const tabPartiallySelected = counts.selected > 0 && !tabSelected;

    return (
      <div key={tab.id} className="space-y-3 pl-4 border-l border-border/50">
        <div className="flex items-start gap-3 py-2">
          <Checkbox
            checked={tabSelected}
            ref={(el: any) => {
              if (el) {
                el.indeterminate = tabPartiallySelected;
              }
            }}
            onCheckedChange={() => toggleTab(tab)}
            className="mt-0.5"
          />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm text-muted-foreground">{tab.name}</span>
              {counts.total > 0 && (
                <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                  {counts.selected}/{counts.total}
                </Badge>
              )}
            </div>
            {renderActions(tab)}
          </div>
        </div>

        {hasSubtabs && (
          <div className="space-y-2">{tab.subtabs.map((subtab: any) => renderSubtab(subtab, level + 1))}</div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="text-sm text-muted-foreground">Cargando permisos...</div>
      </Card>
    );
  }

  const customPermissions = permissions.filter((p) => p.source === 'custom');
  const hasCustomPermissions = customPermissions.length > 0;
  const hasRoles = userRoles.length > 0;
  const hasAnyPermissions = hasCustomPermissions || hasRoles;

  return (
    <TooltipProvider>
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <Label className="text-base font-semibold">Permisos por Módulo</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Configura el acceso a módulos, tabs y acciones específicas
              </p>
            </div>

            {hasAnyPermissions && (
              <AlertDialog open={isCleanDialogOpen} onOpenChange={setIsCleanDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Eraser className="h-4 w-4 mr-2" />
                    Limpiar Permisos
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-lg">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Limpiar Permisos</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                      <p>Selecciona qué permisos deseas eliminar:</p>

                      {hasRoles && (
                        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md p-3">
                          <p className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-2">
                            ⚠️ Este usuario tiene {userRoles.length} rol(es) asignado(s):
                          </p>
                          <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1">
                            {userRoles.map((ur: any) => {
                              const role = ur.roles;
                              const roleName = Array.isArray(role) ? role[0]?.name : role?.name;
                              return <li key={ur.id}>• {roleName}</li>;
                            })}
                          </ul>
                        </div>
                      )}

                      {hasCustomPermissions && (
                        <p className="text-sm">
                          Permisos personalizados: <strong>{customPermissions.length}</strong>
                        </p>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
                    {hasCustomPermissions && (
                      <Button
                        variant="outline"
                        onClick={() => cleanCustomPermissionsMutation.mutate()}
                        disabled={cleanCustomPermissionsMutation.isPending || cleanAllPermissionsMutation.isPending}
                        className="w-full"
                      >
                        {cleanCustomPermissionsMutation.isPending ? 'Limpiando...' : 'Solo Permisos Personalizados'}
                      </Button>
                    )}

                    <Button
                      variant="destructive"
                      onClick={() => cleanAllPermissionsMutation.mutate()}
                      disabled={cleanCustomPermissionsMutation.isPending || cleanAllPermissionsMutation.isPending}
                      className="w-full"
                    >
                      {cleanAllPermissionsMutation.isPending ? 'Eliminando...' : 'Eliminar Todo (Roles + Permisos)'}
                    </Button>

                    <AlertDialogCancel className="w-full mt-0">Cancelar</AlertDialogCancel>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          <Accordion type="multiple" className="space-y-3">
            {modules.map((module: any) => {
              const moduleCounts = module.tabs?.reduce(
                (acc: { total: number; selected: number }, tab: any) => {
                  const tabCounts = countTabActions(tab);
                  return {
                    total: acc.total + tabCounts.total,
                    selected: acc.selected + tabCounts.selected,
                  };
                },
                { total: 0, selected: 0 }
              ) || { total: 0, selected: 0 };

              const moduleSelected = isModuleFullySelected(module);
              const modulePartiallySelected = moduleCounts.selected > 0 && !moduleSelected;
              const ModuleIcon = MODULE_ICONS[module.slug] || Building2;

              return (
                <AccordionItem
                  key={module.id}
                  value={module.id}
                  className="border border-border/50 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30">
                    <div className="flex items-center gap-4 flex-1">
                      <Checkbox
                        checked={moduleSelected}
                        ref={(el: any) => {
                          if (el) {
                            el.indeterminate = modulePartiallySelected;
                          }
                        }}
                        onCheckedChange={() => toggleModule(module)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <ModuleIcon className="h-5 w-5 text-primary" />
                      <span className="font-semibold text-base">{module.name}</span>
                      <Badge variant="secondary" className="ml-auto mr-2 text-xs">
                        {moduleCounts.selected} / {moduleCounts.total}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-5 pb-5 pt-2">
                    {module.tabs && module.tabs.length > 0 ? (
                      <Accordion type="multiple" className="space-y-3">
                        {module.tabs.map((tab: any) => {
                          const hasSubtabs = tab.subtabs && tab.subtabs.length > 0;
                          const counts = countTabActions(tab);
                          const tabSelected = isTabFullySelected(tab);
                          const tabPartiallySelected = counts.selected > 0 && !tabSelected;

                          return (
                            <AccordionItem
                              key={tab.id}
                              value={tab.id}
                              className="border-l-2 border-primary/20 pl-4 bg-muted/20 rounded-r-md"
                            >
                              <div className="flex items-center gap-3 py-2">
                                <Checkbox
                                  checked={tabSelected}
                                  ref={(el: any) => {
                                    if (el) {
                                      el.indeterminate = tabPartiallySelected;
                                    }
                                  }}
                                  onCheckedChange={() => toggleTab(tab)}
                                />
                                <AccordionTrigger className="flex-1 hover:no-underline py-0">
                                  <div className="flex items-center gap-2 flex-1">
                                    <span className="font-semibold text-sm">{tab.name}</span>
                                    {counts.total > 0 && (
                                      <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                                        {counts.selected}/{counts.total}
                                      </Badge>
                                    )}
                                  </div>
                                </AccordionTrigger>
                              </div>
                              <AccordionContent>
                                <div className="space-y-4 pt-3 pb-2">
                                  {renderActions(tab)}

                                  {hasSubtabs && (
                                    <>
                                      <Separator className="my-3" />
                                      <div className="space-y-2">
                                        {tab.subtabs.map((subtab: any) => renderSubtab(subtab, 1))}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          );
                        })}
                      </Accordion>
                    ) : (
                      <div className="text-sm text-muted-foreground pt-2">No hay tabs disponibles para este módulo</div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      </Card>
    </TooltipProvider>
  );
}
